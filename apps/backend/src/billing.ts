import { randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import { pool } from "./db.js";
import type { BillingIdentity } from "./auth.js";
import { config } from "./config.js";
import {
	assertMonthlyPlanConfigured,
	configuredCheckoutReturnUrl,
	decryptPaystackToken,
	disablePaystackSubscription,
	encryptPaystackToken,
	initializePaystackTransaction,
	hasProAccess,
	manualAccessPeriod,
	paystackWebhookEventKey,
	PaystackError,
	PRO_PRICE_SUBUNITS,
	subscriptionAccessPeriod,
	transactionInitializationPayload,
	verifyPaystackTransaction,
	type PaymentMode,
	type PaystackTransaction,
} from "./paystack.js";

const currency = "KES";

function databaseError(message: string, statusCode: number): never {
	throw Object.assign(new Error(message), { statusCode });
}

function webhookPaymentReference(eventType: string, data: Record<string, unknown>) {
	const direct = recordString(data.reference);
	if (direct) return direct;
	const transaction = data.transaction as Record<string, unknown> | undefined;
	return recordString(transaction?.reference);
}

async function registerRecurringCharge(client: PoolClient, reference: string, data: Record<string, unknown>) {
	const existing = await client.query("SELECT id FROM billing_payments WHERE paystack_reference = $1", [reference]);
	if (existing.rowCount) return;
	const nestedSubscription = data.subscription as Record<string, unknown> | undefined;
	const code = recordString(data.subscription_code) ?? recordString(nestedSubscription?.subscription_code);
	if (!code) databaseError("Recurring Paystack charge does not identify its subscription.", 400);
	const subscription = await client.query<{
		user_id: string;
		paystack_plan_code: string;
	}>(
		`SELECT user_id, paystack_plan_code FROM billing_subscriptions
		 WHERE paystack_subscription_code = $1`,
		[code],
	);
	if (!subscription.rowCount) databaseError("Recurring Paystack charge has no matching subscription.", 404);
	await client.query(
		`INSERT INTO billing_payments
		   (user_id, payment_mode, paystack_reference, idempotency_key, amount_subunits,
		    currency, status, paystack_plan_code, paystack_subscription_code)
		 VALUES ($1, 'subscription', $2, $2, $3, $4, 'pending', $5, $6)
		 ON CONFLICT (paystack_reference) DO NOTHING`,
		[
			subscription.rows[0].user_id,
			reference,
			PRO_PRICE_SUBUNITS,
			currency,
			subscription.rows[0].paystack_plan_code,
			code,
		],
	);
}

async function reversePayment(client: PoolClient, data: Record<string, unknown>) {
	const reference = webhookPaymentReference("refund.processed", data);
	if (!reference) return;
	const result = await client.query<{
		id: string;
		user_id: string;
		payment_mode: PaymentMode;
		paystack_subscription_code: string | null;
	}>(
		`UPDATE billing_payments SET status = 'reversed', updated_at = now()
		 WHERE paystack_reference = $1 AND status = 'success'
		 RETURNING id, user_id, payment_mode, paystack_subscription_code`,
		[reference],
	);
	if (!result.rowCount) return;
	const payment = result.rows[0];
	const latest = await client.query<{
		period_start: Date;
		period_end: Date;
		payment_mode: PaymentMode;
		paystack_subscription_code: string | null;
	}>(
		`SELECT period_start, period_end, payment_mode, paystack_subscription_code
		 FROM billing_payments WHERE user_id = $1 AND status = 'success'
		 ORDER BY period_end DESC LIMIT 1`,
		[payment.user_id],
	);
	const current = latest.rows[0];
	if (!current || current.period_end <= new Date()) {
		await client.query(
			`UPDATE billing_entitlements SET plan = 'free', payment_mode = NULL,
			 current_period_start = NULL, current_period_end = NULL, subscription_status = NULL,
			 updated_at = now() WHERE user_id = $1`,
			[payment.user_id],
		);
		return;
	}
	await client.query(
		`UPDATE billing_entitlements
		 SET plan = 'pro', payment_mode = $2, current_period_start = $3, current_period_end = $4,
		     subscription_status = CASE WHEN $2 = 'subscription' THEN 'past_due' ELSE NULL END,
		     updated_at = now()
		 WHERE user_id = $1`,
		[payment.user_id, current.payment_mode, current.period_start, current.period_end],
	);
	if (payment.payment_mode === "subscription" && payment.paystack_subscription_code) {
		await client.query(
			`UPDATE billing_subscriptions SET status = 'past_due', updated_at = now()
			 WHERE paystack_subscription_code = $1`,
			[payment.paystack_subscription_code],
		);
	}
}

function transactionPlanCode(transaction: PaystackTransaction) {
	if (typeof transaction.plan === "string") return transaction.plan;
	return transaction.plan?.plan_code ?? null;
}

function validCheckoutUrl(value: string) {
	try {
		return new URL(value).protocol === "https:";
	} catch {
		return false;
	}
}

export async function createCheckout(
	identity: BillingIdentity,
	mode: PaymentMode,
	idempotencyKey: string,
) {
	if (mode === "subscription") await assertMonthlyPlanConfigured();

	await pool.query(
		`INSERT INTO billing_users (user_id, email)
		 VALUES ($1, $2)
		 ON CONFLICT (user_id) DO UPDATE SET email = EXCLUDED.email, updated_at = now()`,
		[identity.userId, identity.email],
	);

	if (mode === "subscription") {
		const active = await pool.query(
			`SELECT id FROM billing_subscriptions
			 WHERE user_id = $1 AND status IN ('pending', 'active', 'past_due', 'non_renewing')
			 LIMIT 1`,
			[identity.userId],
		);
		if (active.rowCount) databaseError("You already have a recurring subscription. Manage it from billing.", 409);
	}

	const existing = await pool.query<{
		paystack_reference: string;
		checkout_url: string | null;
		status: string;
		payment_mode: PaymentMode;
	}>(
		`SELECT paystack_reference, checkout_url, status, payment_mode
		 FROM billing_payments WHERE user_id = $1 AND idempotency_key = $2`,
		[identity.userId, idempotencyKey],
	);
	if (existing.rowCount) {
		const payment = existing.rows[0];
		if (payment.payment_mode !== mode) databaseError("This checkout request key was already used for another payment mode.", 409);
		if (payment.checkout_url && payment.status === "pending") {
			return { checkoutUrl: payment.checkout_url, reference: payment.paystack_reference, mode };
		}
		databaseError("This checkout request has already been processed. Start a new checkout.", 409);
	}

	const reference = randomUUID();
	const planCode = mode === "subscription" ? config.paystackMonthlyPlanCode ?? null : null;
	await pool.query(
		`INSERT INTO billing_payments
		   (user_id, payment_mode, paystack_reference, idempotency_key, amount_subunits, currency, paystack_plan_code)
		 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
		[identity.userId, mode, reference, idempotencyKey, PRO_PRICE_SUBUNITS, currency, planCode],
	);

	try {
		const payload = transactionInitializationPayload(
			mode,
			identity.email,
			reference,
			configuredCheckoutReturnUrl(),
			{ payment_id: reference, user_id: identity.userId },
			planCode ?? undefined,
		);
		const initialized = await initializePaystackTransaction(payload);
		if (
			initialized.reference !== reference ||
			!validCheckoutUrl(initialized.authorization_url)
		) {
			throw new PaystackError("Paystack returned an invalid checkout session.");
		}
		await pool.query(
			"UPDATE billing_payments SET checkout_url = $2, updated_at = now() WHERE paystack_reference = $1",
			[reference, initialized.authorization_url],
		);
		return { checkoutUrl: initialized.authorization_url, reference, mode };
	} catch (error) {
		await pool.query(
			"UPDATE billing_payments SET status = 'failed', updated_at = now() WHERE paystack_reference = $1 AND status = 'pending'",
			[reference],
		);
		throw error;
	}
}

async function lockedPayment(client: PoolClient, reference: string, userId?: string) {
	const result = await client.query<{
		id: string;
		user_id: string;
		payment_mode: PaymentMode;
		paystack_reference: string;
		amount_subunits: string;
		currency: string;
		status: string;
		paystack_plan_code: string | null;
		paystack_subscription_code: string | null;
		email: string;
	}>(
		`SELECT p.id, p.user_id, p.payment_mode, p.paystack_reference, p.amount_subunits,
		        p.currency, p.status, p.paystack_plan_code, p.paystack_subscription_code,
		        u.email
		 FROM billing_payments p
		 JOIN billing_users u ON u.user_id = p.user_id
		 WHERE p.paystack_reference = $1 ${userId ? "AND p.user_id = $2" : ""}
		 FOR UPDATE OF p`,
		userId ? [reference, userId] : [reference],
	);
	if (!result.rowCount) return null;
	return result.rows[0];
}

export function assertVerifiedPayment(
	transaction: PaystackTransaction,
	reference: string,
	payment: {
		payment_mode: PaymentMode;
		paystack_plan_code: string | null;
		email: string;
	},
) {
	if (
		transaction.reference !== reference ||
		transaction.amount !== PRO_PRICE_SUBUNITS ||
		transaction.currency !== currency ||
		transaction.customer?.email?.toLowerCase() !== payment.email.toLowerCase()
	) {
		databaseError("Paystack could not verify a KSh 2,000 payment for this account.", 402);
	}
	if (transaction.status === "success") {
		const verifiedPlan = transactionPlanCode(transaction);
		if (payment.payment_mode === "manual" && verifiedPlan) {
			databaseError("This transaction is not a one-time manual payment.", 409);
		}
		if (
			payment.payment_mode === "subscription" &&
			(!payment.paystack_plan_code || verifiedPlan !== payment.paystack_plan_code)
		) {
			databaseError("This transaction does not match the configured recurring plan.", 409);
		}
	}
	return transaction;
}

async function verifyForPayment(
	reference: string,
	payment: NonNullable<Awaited<ReturnType<typeof lockedPayment>>>,
) {
	return assertVerifiedPayment(await verifyPaystackTransaction(reference), reference, payment);
}

async function writeSuccessfulPayment(
	client: PoolClient,
	reference: string,
	userId?: string,
	allowPending = false,
) {
	const payment = await lockedPayment(client, reference, userId);
	if (!payment) databaseError("Payment reference was not found for this account.", 404);
	if (payment.status === "success") return;
	if (payment.status !== "pending") databaseError("This payment is no longer pending.", 409);

	const verified = await verifyForPayment(reference, payment);
	if (verified.status === "failed" || verified.status === "abandoned" || verified.status === "reversed") {
		await client.query(
			"UPDATE billing_payments SET status = $2, updated_at = now() WHERE id = $1",
			[payment.id, verified.status === "reversed" ? "reversed" : "failed"],
		);
		return;
	}
	if (verified.status !== "success") {
		if (allowPending && ["pending", "ongoing"].includes(verified.status)) return;
		databaseError("Payment is still pending at Paystack.", 409);
	}
	const paidAt = verified.paid_at && !Number.isNaN(Date.parse(verified.paid_at))
		? new Date(verified.paid_at)
		: new Date();
	const subscriptionCode = typeof verified.subscription_code === "string"
		? verified.subscription_code
		: payment.paystack_subscription_code;

	await client.query(
		`INSERT INTO billing_entitlements (user_id, plan)
		 VALUES ($1, 'free')
		 ON CONFLICT (user_id) DO NOTHING`,
		[payment.user_id],
	);
	const entitlementResult = await client.query<{ current_period_end: Date | null }>(
		"SELECT current_period_end FROM billing_entitlements WHERE user_id = $1 FOR UPDATE",
		[payment.user_id],
	);
	const currentExpiry = entitlementResult.rows[0]?.current_period_end ?? null;
	const nextPaymentResult = payment.payment_mode === "subscription" && subscriptionCode
		? await client.query<{ next_payment_at: Date | null }>(
				"SELECT next_payment_at FROM billing_subscriptions WHERE paystack_subscription_code = $1",
				[subscriptionCode],
			)
		: null;
	const period = payment.payment_mode === "manual"
		? manualAccessPeriod(new Date(), currentExpiry)
		: subscriptionAccessPeriod(paidAt, nextPaymentResult?.rows[0]?.next_payment_at);

	await client.query(
		`UPDATE billing_payments
		 SET status = 'success', paid_at = $2, period_start = $3, period_end = $4,
		     paystack_subscription_code = COALESCE($5, paystack_subscription_code), updated_at = now()
		 WHERE id = $1`,
		[payment.id, paidAt, period.startsAt, period.expiresAt, subscriptionCode],
	);

	if (payment.payment_mode === "subscription") {
		const existingSubscription = await client.query<{ id: string }>(
			`SELECT id FROM billing_subscriptions WHERE user_id = $1
			 AND status IN ('pending', 'active', 'past_due', 'non_renewing')
			 ORDER BY created_at DESC LIMIT 1 FOR UPDATE`,
			[payment.user_id],
		);
		if (existingSubscription.rowCount) {
			await client.query(
				`UPDATE billing_subscriptions
				 SET paystack_subscription_code = COALESCE($2, paystack_subscription_code),
				     paystack_plan_code = $3, status = 'active',
				     current_period_start = $4, current_period_end = $5, updated_at = now()
				 WHERE id = $1`,
				[existingSubscription.rows[0].id, subscriptionCode, payment.paystack_plan_code, period.startsAt, period.expiresAt],
			);
		} else {
			await client.query(
				`INSERT INTO billing_subscriptions
				   (user_id, paystack_subscription_code, paystack_plan_code, status, current_period_start, current_period_end)
				 VALUES ($1, $2, $3, 'active', $4, $5)
				 ON CONFLICT (paystack_subscription_code) DO UPDATE
				   SET status = 'active', current_period_start = EXCLUDED.current_period_start,
				       current_period_end = EXCLUDED.current_period_end, updated_at = now()`,
				[payment.user_id, subscriptionCode, payment.paystack_plan_code, period.startsAt, period.expiresAt],
			);
		}
	}

	await client.query(
		`UPDATE billing_entitlements
		 SET plan = 'pro', payment_mode = $2, current_period_start = $3, current_period_end = $4,
		     subscription_status = $5, updated_at = now()
		 WHERE user_id = $1`,
		[
			payment.user_id,
			payment.payment_mode,
			period.startsAt,
			period.expiresAt,
			payment.payment_mode === "subscription" ? "active" : null,
		],
	);
}

export async function verifyCheckout(identity: BillingIdentity, reference: string) {
	const client = await pool.connect();
	try {
		await client.query("BEGIN");
		const payment = await lockedPayment(client, reference, identity.userId);
		if (!payment) databaseError("Payment reference was not found for this account.", 404);
		if (payment.status === "pending") {
			await writeSuccessfulPayment(client, reference, identity.userId, true);
		}
		const status = await client.query(
			`SELECT plan, payment_mode, current_period_start, current_period_end, subscription_status
			 FROM billing_entitlements WHERE user_id = $1`,
			[identity.userId],
		);
		const paymentStatus = await client.query<{ status: string }>(
			"SELECT status FROM billing_payments WHERE paystack_reference = $1 AND user_id = $2",
			[reference, identity.userId],
		);
		const entitlement = status.rows[0];
		const accessExpiresAt = entitlement?.current_period_end ?? null;
		const active = hasProAccess(entitlement?.plan, accessExpiresAt);
		const expired = entitlement?.plan === "pro" && Boolean(
			accessExpiresAt && accessExpiresAt <= new Date(),
		);
		await client.query("COMMIT");
		return {
			paymentStatus: paymentStatus.rows[0]?.status ?? "pending",
			plan: active ? "pro" : "free",
			paymentMode: entitlement?.payment_mode ?? null,
			accessStartsAt: entitlement?.current_period_start ?? null,
			accessExpiresAt,
			isExpired: expired,
			subscriptionStatus: entitlement?.subscription_status ?? null,
		};
	} catch (error) {
		await client.query("ROLLBACK");
		throw error;
	} finally {
		client.release();
	}
}

export async function getBillingStatus(userId: string) {
	const result = await pool.query<{
		plan: string;
		payment_mode: PaymentMode | null;
		current_period_start: Date | null;
		current_period_end: Date | null;
		subscription_status: string | null;
		next_payment_at: Date | null;
		cancel_at_period_end: boolean;
	}>(
		`SELECT e.plan, e.payment_mode, e.current_period_start, e.current_period_end,
		        COALESCE(s.status, e.subscription_status) AS subscription_status,
		        s.next_payment_at, COALESCE(s.cancel_at_period_end, false) AS cancel_at_period_end
		 FROM billing_entitlements e
		 LEFT JOIN LATERAL (
		   SELECT status, next_payment_at, cancel_at_period_end
		   FROM billing_subscriptions WHERE user_id = e.user_id
		   ORDER BY updated_at DESC LIMIT 1
		 ) s ON true
		 WHERE e.user_id = $1`,
		[userId],
	);
	const row = result.rows[0];
	const active = hasProAccess(row?.plan, row?.current_period_end);
	const expired = row?.plan === "pro" && Boolean(
		row.current_period_end && row.current_period_end <= new Date(),
	);
	return {
		plan: active ? "pro" : "free",
		paymentMode: row?.payment_mode ?? null,
		accessStartsAt: row?.current_period_start ?? null,
		accessExpiresAt: row?.current_period_end ?? null,
		isExpired: expired,
		subscriptionStatus: row?.subscription_status ?? null,
		nextPaymentAt: row?.next_payment_at ?? null,
		cancelAtPeriodEnd: row?.cancel_at_period_end ?? false,
	};
}

export async function cancelSubscription(userId: string) {
	const result = await pool.query<{
		paystack_subscription_code: string | null;
		paystack_email_token_ciphertext: string | null;
		status: string;
	}>(
		`SELECT paystack_subscription_code, paystack_email_token_ciphertext, status
		 FROM billing_subscriptions
		 WHERE user_id = $1 AND status IN ('active', 'past_due', 'non_renewing')
		 ORDER BY updated_at DESC LIMIT 1`,
		[userId],
	);
	const subscription = result.rows[0];
	if (!subscription?.paystack_subscription_code || !subscription.paystack_email_token_ciphertext) {
		databaseError("Subscription cancellation is not available until Paystack confirms the subscription details.", 409);
	}
	if (subscription.status === "non_renewing") return { status: "non_renewing" };

	await disablePaystackSubscription(
		subscription.paystack_subscription_code,
		decryptPaystackToken(subscription.paystack_email_token_ciphertext),
	);
	await pool.query(
		`UPDATE billing_subscriptions SET status = 'non_renewing',
		 cancel_at_period_end = true, updated_at = now()
		 WHERE user_id = $1 AND paystack_subscription_code = $2`,
		[userId, subscription.paystack_subscription_code],
	);
	await pool.query(
		"UPDATE billing_entitlements SET subscription_status = 'non_renewing', updated_at = now() WHERE user_id = $1",
		[userId],
	);
	return { status: "non_renewing" };
}

function recordString(value: unknown) {
	return typeof value === "string" && value ? value : null;
}

async function updateSubscriptionEvent(
	client: PoolClient,
	eventType: string,
	data: Record<string, unknown>,
) {
	const nestedSubscription = data.subscription as Record<string, unknown> | undefined;
	const code = recordString(data.subscription_code) ?? recordString(nestedSubscription?.subscription_code);
	if (!code) return;
	if (eventType === "subscription.create") {
		const customer = data.customer as { email?: unknown; customer_code?: unknown } | undefined;
		const email = recordString(customer?.email);
		const plan = data.plan as { plan_code?: unknown } | string | undefined;
		const planCode = typeof plan === "string"
			? plan
			: recordString(plan?.plan_code) ?? recordString(data.plan_code);
		if (!email || !planCode) return;
		const userResult = await client.query<{ user_id: string }>(
			`SELECT u.user_id FROM billing_users u
			 JOIN billing_payments p ON p.user_id = u.user_id
			 WHERE lower(u.email) = lower($1) AND p.payment_mode = 'subscription'
			   AND p.paystack_plan_code = $2
			 ORDER BY p.created_at DESC LIMIT 1`,
			[email, planCode],
		);
		if (!userResult.rowCount) return;
		const userId = userResult.rows[0].user_id;
		const pending = await client.query<{ id: string }>(
			`SELECT id FROM billing_subscriptions WHERE user_id = $1
			 AND status IN ('pending', 'active', 'past_due', 'non_renewing')
			 ORDER BY updated_at DESC LIMIT 1 FOR UPDATE`,
			[userId],
		);
		const payload = data as Record<string, unknown>;
		const nextPayment = recordString(payload.next_payment_date);
		const customerCode = recordString(customer?.customer_code);
		const emailToken = recordString(payload.email_token);
		const encryptedEmailToken = emailToken ? encryptPaystackToken(emailToken) : null;
		if (pending.rowCount) {
			await client.query(
				`UPDATE billing_subscriptions
				 SET paystack_subscription_code = $2, paystack_customer_code = $3,
				     paystack_email_token_ciphertext = $4, paystack_plan_code = $5,
				     status = CASE WHEN status = 'active' THEN 'active' ELSE 'pending' END,
				     next_payment_at = $6, updated_at = now()
				 WHERE id = $1`,
				[pending.rows[0].id, code, customerCode, encryptedEmailToken, planCode, nextPayment],
			);
		} else {
			await client.query(
				`INSERT INTO billing_subscriptions
				   (user_id, paystack_subscription_code, paystack_customer_code, paystack_email_token_ciphertext,
				    paystack_plan_code, status, next_payment_at)
				 VALUES ($1, $2, $3, $4, $5, 'pending', $6)
				 ON CONFLICT (paystack_subscription_code) DO NOTHING`,
				[userId, code, customerCode, encryptedEmailToken, planCode, nextPayment],
			);
		}
		if (nextPayment && !Number.isNaN(Date.parse(nextPayment))) {
			await client.query(
				`UPDATE billing_subscriptions SET current_period_end = $2, updated_at = now()
				 WHERE paystack_subscription_code = $1`,
				[code, nextPayment],
			);
			await client.query(
				`UPDATE billing_entitlements SET current_period_end = $2, updated_at = now()
				 WHERE user_id = $1 AND payment_mode = 'subscription'`,
				[userId, nextPayment],
			);
		}
		return;
	}

	if (eventType === "subscription.not_renew") {
		await client.query(
			`UPDATE billing_subscriptions SET status = 'non_renewing', cancel_at_period_end = true,
			 updated_at = now() WHERE paystack_subscription_code = $1`,
			[code],
		);
		await client.query(
			`UPDATE billing_entitlements SET subscription_status = 'non_renewing', updated_at = now()
			 WHERE user_id = (SELECT user_id FROM billing_subscriptions WHERE paystack_subscription_code = $1)`,
			[code],
		);
	} else if (eventType === "subscription.disable") {
		await client.query(
			`UPDATE billing_subscriptions SET status = 'cancelled', cancel_at_period_end = true,
			 updated_at = now() WHERE paystack_subscription_code = $1`,
			[code],
		);
		await client.query(
			`UPDATE billing_entitlements SET subscription_status = 'cancelled', updated_at = now()
			 WHERE user_id = (SELECT user_id FROM billing_subscriptions WHERE paystack_subscription_code = $1)`,
			[code],
		);
	} else if (eventType === "invoice.payment_failed") {
		await client.query(
			`UPDATE billing_subscriptions SET status = 'past_due', updated_at = now()
			 WHERE paystack_subscription_code = $1`,
			[code],
		);
		await client.query(
			`UPDATE billing_entitlements SET subscription_status = 'past_due', updated_at = now()
			 WHERE user_id = (SELECT user_id FROM billing_subscriptions WHERE paystack_subscription_code = $1)`,
			[code],
		);
	}
}

export async function processPaystackWebhook(
	eventType: string,
	data: Record<string, unknown>,
) {
	const key = paystackWebhookEventKey(eventType, data);
	const client = await pool.connect();
	try {
		await client.query("BEGIN");
		const inserted = await client.query(
			`INSERT INTO billing_webhook_events (event_key, event_type, paystack_reference)
			 VALUES ($1, $2, $3) ON CONFLICT (event_key) DO NOTHING RETURNING event_key`,
			[key, eventType, recordString(data.reference)],
		);
		if (!inserted.rowCount) {
			await client.query("COMMIT");
			return { duplicate: true };
		}

		if (eventType === "charge.success") {
			const reference = webhookPaymentReference(eventType, data);
			if (!reference) databaseError("Paystack charge event has no transaction reference.", 400);
			await registerRecurringCharge(client, reference, data);
			await writeSuccessfulPayment(client, reference);
		} else if (eventType === "charge.failed") {
			const reference = webhookPaymentReference(eventType, data);
			if (reference) {
				await client.query(
					`UPDATE billing_payments SET status = 'failed', updated_at = now()
					 WHERE paystack_reference = $1 AND status = 'pending'`,
					[reference],
				);
			}
		} else if (eventType === "charge.reversed") {
			await reversePayment(client, data);
		} else if (eventType === "refund.processed") {
			await reversePayment(client, data);
		} else {
			await updateSubscriptionEvent(client, eventType, data);
		}
		await client.query("COMMIT");
		return { duplicate: false };
	} catch (error) {
		await client.query("ROLLBACK");
		throw error;
	} finally {
		client.release();
	}
}
