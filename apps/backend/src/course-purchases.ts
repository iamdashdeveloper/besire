import { randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import type { BillingIdentity } from "./auth.js";
import { config } from "./config.js";
import { pool } from "./db.js";
import {
	initializeCoursePaystackTransaction,
	paystackWebhookEventKey,
	verifyPaystackTransaction,
	type PaystackTransaction,
} from "./paystack.js";

type PurchaseStatus = "pending" | "success" | "failed" | "cancelled" | "partially_refunded" | "refunded" | "reversed";

type CoursePurchase = {
	id: string;
	course_id: string;
	user_id: string;
	learner_email: string;
	paystack_reference: string;
	amount_subunits: string;
	currency: string;
	status: PurchaseStatus;
	refunded_subunits: string;
};

function requestError(message: string, statusCode: number): never {
	throw Object.assign(new Error(message), { statusCode });
}

function recordString(value: unknown) {
	return typeof value === "string" && value ? value : null;
}

function eventReference(eventType: string, data: Record<string, unknown>) {
	const transaction = data.transaction;
	const nestedReference = transaction && typeof transaction === "object"
		? recordString((transaction as Record<string, unknown>).reference)
		: null;
	const direct = eventType === "refund.processed"
		? recordString(data.transaction_reference) ?? nestedReference ?? recordString(data.reference)
		: recordString(data.reference) ?? recordString(data.transaction_reference) ?? nestedReference;
	if (direct) return direct;
	return null;
}

function checkoutReturnUrl(courseId: string, reference: string) {
	const url = new URL(`/courses/${courseId}`, config.webAppUrl);
	url.searchParams.set("purchase_reference", reference);
	return url.toString();
}

export function validateVerifiedCoursePayment(
	transaction: PaystackTransaction,
	purchase: Pick<CoursePurchase, "id" | "course_id" | "paystack_reference" | "amount_subunits" | "currency" | "learner_email">,
) {
	const metadata = transaction.metadata;
	if (
		transaction.reference !== purchase.paystack_reference ||
		transaction.amount !== Number(purchase.amount_subunits) ||
		transaction.currency !== purchase.currency ||
		purchase.currency !== "KES" ||
		transaction.customer?.email?.toLowerCase() !== purchase.learner_email.toLowerCase() ||
		!metadata ||
		metadata.course_id !== purchase.course_id ||
		metadata.purchase_id !== purchase.id
	) {
		requestError("Paystack could not verify the expected course purchase.", 409);
	}
	return transaction;
}

export function canAccessCourse(price: number, activeEnrollment: boolean) {
	return price === 0 || activeEnrollment;
}

export function coursePurchaseStatusForTransaction(status: string): PurchaseStatus {
	if (status === "success") return "success";
	if (status === "reversed") return "reversed";
	if (status === "failed") return "failed";
	if (status === "abandoned") return "cancelled";
	return "pending";
}

export function courseRefundStatus(amountSubunits: number, refundedSubunits: number): PurchaseStatus {
	if (refundedSubunits >= amountSubunits) return "refunded";
	return "partially_refunded";
}

export function calculateCourseSalesTotals(rows: {
	purchase_count: string | number;
	gross_subunits: string | number;
	refund_subunits: string | number;
	unique_learners: string | number;
}) {
	const grossSubunits = Number(rows.gross_subunits);
	const refundSubunits = Number(rows.refund_subunits);
	return {
		purchaseCount: Number(rows.purchase_count),
		grossSubunits,
		refundSubunits,
		netSubunits: Math.max(0, grossSubunits - refundSubunits),
		uniqueLearners: Number(rows.unique_learners),
		currency: "KES" as const,
	};
}

async function markUnsuccessful(reference: string, status: PurchaseStatus) {
	await pool.query(
		`UPDATE course_purchases SET status = $2, updated_at = now()
		 WHERE paystack_reference = $1 AND status = 'pending'`,
		[reference, status],
	);
}

async function applyVerifiedSuccess(client: PoolClient, purchase: CoursePurchase, paidAt: Date) {
	if (purchase.status === "success" || purchase.status === "partially_refunded") return;
	if (purchase.status !== "pending") return;

	await client.query(
		`UPDATE course_purchases SET status = 'success', paid_at = $2, updated_at = now()
		 WHERE id = $1 AND status = 'pending'`,
		[purchase.id, paidAt],
	);
	await client.query(
		`INSERT INTO course_enrollments (course_id, user_id, status, source)
		 VALUES ($1, $2, 'active', 'paystack_purchase')
		 ON CONFLICT (course_id, user_id) DO UPDATE
		   SET status = 'active',
		       source = CASE WHEN course_enrollments.source = 'manual'
		                     THEN 'manual' ELSE 'paystack_purchase' END`,
		[purchase.course_id, purchase.user_id],
	);
}

async function applyVerifiedTransaction(
	reference: string,
	transaction: PaystackTransaction,
	userId?: string,
) {
	const client = await pool.connect();
	try {
		await client.query("BEGIN");
		const result = await client.query<CoursePurchase>(
			`SELECT id, course_id, user_id, learner_email, paystack_reference,
			        amount_subunits, currency, status, refunded_subunits
			 FROM course_purchases
			 WHERE paystack_reference = $1 ${userId ? "AND user_id = $2" : ""}
			 FOR UPDATE`,
			userId ? [reference, userId] : [reference],
		);
		if (!result.rowCount) requestError("Course purchase was not found for this account.", 404);
		const purchase = result.rows[0];
		try {
			validateVerifiedCoursePayment(transaction, purchase);
		} catch {
			if (purchase.status === "pending") {
				await client.query(
					"UPDATE course_purchases SET status = 'failed', updated_at = now() WHERE id = $1",
					[purchase.id],
				);
			}
			await client.query("COMMIT");
			return { paymentStatus: "failed" as const, courseId: purchase.course_id };
		}

		const status = coursePurchaseStatusForTransaction(transaction.status);
		if (status === "success") {
			const paidAt = transaction.paid_at && !Number.isNaN(Date.parse(transaction.paid_at))
				? new Date(transaction.paid_at)
				: new Date();
			await applyVerifiedSuccess(client, purchase, paidAt);
		} else if (status === "reversed") {
			await client.query(
				`UPDATE course_purchases SET status = 'reversed', refunded_subunits = amount_subunits,
				 updated_at = now() WHERE id = $1 AND status = 'pending'`,
				[purchase.id],
			);
		} else if (status === "failed" || status === "cancelled") {
			await client.query(
				`UPDATE course_purchases SET status = $2, updated_at = now()
				 WHERE id = $1 AND status = 'pending'`,
				[purchase.id, status],
			);
		}
		await client.query("COMMIT");
		return { paymentStatus: status, courseId: purchase.course_id };
	} catch (error) {
		await client.query("ROLLBACK");
		throw error;
	} finally {
		client.release();
	}
}

export async function createCoursePurchaseCheckout(
	identity: BillingIdentity,
	courseId: string,
	idempotencyKey: string,
) {
	const client = await pool.connect();
	let purchase: CoursePurchase | null = null;
	try {
		await client.query("BEGIN");
		await client.query(
			"SELECT pg_advisory_xact_lock(hashtextextended($1, 0))",
			[`${identity.userId}:${courseId}`],
		);
		const courseResult = await client.query<{
			id: string;
			title: string;
			price: number;
			status: string;
		}>(
			"SELECT id, title, price, status FROM courses WHERE id = $1 FOR SHARE",
			[courseId],
		);
		if (!courseResult.rowCount || courseResult.rows[0].status !== "published") {
			requestError("This published course is not available for purchase.", 404);
		}
		const course = courseResult.rows[0];
		if (course.price <= 0) requestError("This course is free and does not require a purchase.", 400);

		const enrollment = await client.query(
			"SELECT id FROM course_enrollments WHERE course_id = $1 AND user_id = $2 AND status = 'active'",
			[courseId, identity.userId],
		);
		if (enrollment.rowCount) {
			await client.query("COMMIT");
			return { alreadyOwned: true as const, courseId };
		}

		const byKey = await client.query<CoursePurchase>(
			`SELECT id, course_id, user_id, learner_email, paystack_reference,
			        amount_subunits, currency, status, refunded_subunits
			 FROM course_purchases WHERE user_id = $1 AND idempotency_key = $2 FOR UPDATE`,
			[identity.userId, idempotencyKey],
		);
		if (byKey.rowCount) {
			const previous = byKey.rows[0];
			if (previous.course_id !== courseId) requestError("This checkout key was already used for another course.", 409);
			if (previous.status === "pending") {
				const checkout = await client.query<{ checkout_url: string | null }>(
					"SELECT checkout_url FROM course_purchases WHERE id = $1",
					[previous.id],
				);
				if (!checkout.rows[0]?.checkout_url) requestError("This checkout is already being prepared. Try again shortly.", 409);
				await client.query("COMMIT");
				return { alreadyOwned: false as const, checkoutUrl: checkout.rows[0].checkout_url, reference: previous.paystack_reference };
			}
			requestError("This checkout key has already been processed. Start a new checkout.", 409);
		}

		const pending = await client.query<CoursePurchase>(
			`SELECT id, course_id, user_id, learner_email, paystack_reference,
			        amount_subunits, currency, status, refunded_subunits
			 FROM course_purchases
			 WHERE course_id = $1 AND user_id = $2 AND status = 'pending'
			 FOR UPDATE`,
			[courseId, identity.userId],
		);
		if (pending.rowCount) {
			const checkout = await client.query<{ checkout_url: string | null }>(
				"SELECT checkout_url FROM course_purchases WHERE id = $1",
				[pending.rows[0].id],
			);
			if (!checkout.rows[0]?.checkout_url) requestError("A checkout for this course is already being prepared. Try again shortly.", 409);
			await client.query("COMMIT");
			return { alreadyOwned: false as const, checkoutUrl: checkout.rows[0].checkout_url, reference: pending.rows[0].paystack_reference };
		}

		const reference = randomUUID();
		const amountSubunits = course.price * 100;
		const inserted = await client.query<CoursePurchase>(
			`INSERT INTO course_purchases
			   (course_id, user_id, learner_email, paystack_reference, idempotency_key, amount_subunits, currency)
			 VALUES ($1, $2, $3, $4, $5, $6, 'KES')
			 RETURNING id, course_id, user_id, learner_email, paystack_reference,
			           amount_subunits, currency, status, refunded_subunits`,
			[courseId, identity.userId, identity.email, reference, idempotencyKey, amountSubunits],
		);
		purchase = inserted.rows[0];
		await client.query("COMMIT");
	} catch (error) {
		await client.query("ROLLBACK");
		throw error;
	} finally {
		client.release();
	}

	if (!purchase) requestError("Could not prepare a course checkout.", 500);
	try {
		const checkout = await initializeCoursePaystackTransaction({
			email: identity.email,
			amount: Number(purchase.amount_subunits),
			currency: "KES",
			reference: purchase.paystack_reference,
			callback_url: checkoutReturnUrl(courseId, purchase.paystack_reference),
			metadata: {
				purchase_id: purchase.id,
				course_id: courseId,
				payment_type: "course_purchase",
			},
		});
		if (
			checkout.reference !== purchase.paystack_reference ||
			!checkout.authorization_url.startsWith("https://")
		) {
			throw new Error("Paystack returned an invalid course checkout.");
		}
		await pool.query(
			"UPDATE course_purchases SET checkout_url = $2, updated_at = now() WHERE id = $1 AND status = 'pending'",
			[purchase.id, checkout.authorization_url],
		);
		return { alreadyOwned: false as const, checkoutUrl: checkout.authorization_url, reference: purchase.paystack_reference };
	} catch (error) {
		await markUnsuccessful(purchase.paystack_reference, "failed");
		throw error;
	}
}

export async function verifyCoursePurchase(identity: BillingIdentity, reference: string) {
	const result = await pool.query<CoursePurchase>(
		`SELECT id, course_id, user_id, learner_email, paystack_reference,
		        amount_subunits, currency, status, refunded_subunits
		 FROM course_purchases WHERE paystack_reference = $1 AND user_id = $2`,
		[reference, identity.userId],
	);
	if (!result.rowCount) requestError("Course purchase was not found for this account.", 404);
	const purchase = result.rows[0];
	if (purchase.status !== "pending") {
		return { paymentStatus: purchase.status, courseId: purchase.course_id };
	}
	const transaction = await verifyPaystackTransaction(reference);
	return applyVerifiedTransaction(reference, transaction, identity.userId);
}

async function updateRefund(
	client: PoolClient,
	purchase: CoursePurchase,
	refundAmount: number,
	reversed: boolean,
) {
	if (!["pending", "success", "partially_refunded"].includes(purchase.status)) return;
	const amount = Number(purchase.amount_subunits);
	const cumulativeRefund = reversed
		? amount
		: Math.min(amount, Number(purchase.refunded_subunits) + Math.max(0, refundAmount));
	const status = reversed ? "reversed" : courseRefundStatus(amount, cumulativeRefund);
	await client.query(
		`UPDATE course_purchases SET status = $2, refunded_subunits = $3, updated_at = now()
		 WHERE id = $1`,
		[purchase.id, status, cumulativeRefund],
	);
	if (cumulativeRefund < amount) return;
	const otherPaidPurchase = await client.query(
		`SELECT id FROM course_purchases
		 WHERE course_id = $1 AND user_id = $2 AND id <> $3
		   AND status IN ('success', 'partially_refunded')
		 LIMIT 1`,
		[purchase.course_id, purchase.user_id, purchase.id],
	);
	if (!otherPaidPurchase.rowCount) {
		await client.query(
			`UPDATE course_enrollments SET status = 'revoked'
			 WHERE course_id = $1 AND user_id = $2 AND source = 'paystack_purchase'`,
			[purchase.course_id, purchase.user_id],
		);
	}
}

export async function processCoursePurchaseWebhook(
	eventType: string,
	data: Record<string, unknown>,
) {
	const reference = eventReference(eventType, data);
	if (!reference) return { handled: false as const };
	const initial = await pool.query<CoursePurchase>(
		`SELECT id, course_id, user_id, learner_email, paystack_reference,
		        amount_subunits, currency, status, refunded_subunits
		 FROM course_purchases WHERE paystack_reference = $1`,
		[reference],
	);
	if (!initial.rowCount) return { handled: false as const };

	let verified: PaystackTransaction | null = null;
	if (["charge.success", "charge.reversed", "refund.processed"].includes(eventType)) {
		verified = await verifyPaystackTransaction(reference);
		try {
			validateVerifiedCoursePayment(verified, initial.rows[0]);
		} catch {
			if (eventType === "charge.success") {
				await markUnsuccessful(reference, "failed");
				return { handled: true as const, paymentStatus: "failed" as const };
			}
			return { handled: true as const, ignored: true as const };
		}
		if (
			eventType === "charge.success" &&
			!["success", "failed", "abandoned", "reversed"].includes(verified.status)
		) {
			return { handled: true as const, paymentStatus: "pending" as const };
		}
		if (
			(eventType === "charge.reversed" || eventType === "refund.processed") &&
			!["success", "reversed"].includes(verified.status)
		) return { handled: true as const, ignored: true as const };
	}

	const key = paystackWebhookEventKey(eventType, data);
	const client = await pool.connect();
	try {
		await client.query("BEGIN");
		const purchaseResult = await client.query<CoursePurchase>(
			`SELECT id, course_id, user_id, learner_email, paystack_reference,
			        amount_subunits, currency, status, refunded_subunits
			 FROM course_purchases WHERE paystack_reference = $1 FOR UPDATE`,
			[reference],
		);
		if (!purchaseResult.rowCount) {
			await client.query("COMMIT");
			return { handled: true as const };
		}
		const purchase = purchaseResult.rows[0];
		const event = await client.query(
			`INSERT INTO course_purchase_webhook_events (event_key, event_type, paystack_reference)
			 VALUES ($1, $2, $3) ON CONFLICT (event_key) DO NOTHING RETURNING event_key`,
			[key, eventType, reference],
		);
		if (!event.rowCount) {
			await client.query("COMMIT");
			return { handled: true as const, duplicate: true as const };
		}

		if (eventType === "charge.success" && verified) {
			const status = coursePurchaseStatusForTransaction(verified.status);
			if (status === "success") {
				const paidAt = verified.paid_at && !Number.isNaN(Date.parse(verified.paid_at))
					? new Date(verified.paid_at)
					: new Date();
				await applyVerifiedSuccess(client, purchase, paidAt);
			} else if (status === "reversed") {
				await client.query(
					`UPDATE course_purchases SET status = 'reversed', refunded_subunits = amount_subunits,
					 updated_at = now() WHERE id = $1 AND status = 'pending'`,
					[purchase.id],
				);
			} else if (status === "failed" || status === "cancelled") {
				await client.query(
					"UPDATE course_purchases SET status = $2, updated_at = now() WHERE id = $1 AND status = 'pending'",
					[purchase.id, status],
				);
			}
		} else if (eventType === "charge.failed") {
			await client.query(
				"UPDATE course_purchases SET status = 'failed', updated_at = now() WHERE id = $1 AND status = 'pending'",
				[purchase.id],
			);
		} else if (eventType === "charge.reversed") {
			if (purchase.status === "pending" && verified) {
				const paidAt = verified.paid_at && !Number.isNaN(Date.parse(verified.paid_at))
					? new Date(verified.paid_at)
					: new Date();
				await applyVerifiedSuccess(client, purchase, paidAt);
				await updateRefund(client, { ...purchase, status: "success", refunded_subunits: "0" }, Number(purchase.amount_subunits), true);
			} else {
				await updateRefund(client, purchase, Number(purchase.amount_subunits), true);
			}
		} else if (eventType === "refund.processed") {
			const payloadCurrency = recordString(data.currency);
			if (payloadCurrency && payloadCurrency !== "KES") {
				await client.query("COMMIT");
				return { handled: true as const, ignored: true as const };
			}
			const rawAmount = data.amount;
			const refundAmount = typeof rawAmount === "number" || (typeof rawAmount === "string" && rawAmount.trim())
				? Number(rawAmount)
				: Number.NaN;
			if (!Number.isSafeInteger(refundAmount) || refundAmount <= 0) {
				await client.query("COMMIT");
				return { handled: true as const, ignored: true as const };
			}
			if (purchase.status === "pending" && verified) {
				const paidAt = verified.paid_at && !Number.isNaN(Date.parse(verified.paid_at))
					? new Date(verified.paid_at)
					: new Date();
				await applyVerifiedSuccess(client, purchase, paidAt);
				await updateRefund(client, { ...purchase, status: "success", refunded_subunits: "0" }, refundAmount, false);
			} else {
				await updateRefund(client, purchase, refundAmount, false);
			}
		}
		await client.query("COMMIT");
		return { handled: true as const, duplicate: false as const };
	} catch (error) {
		await client.query("ROLLBACK");
		throw error;
	} finally {
		client.release();
	}
}

export async function getCourseSalesOverview() {
	const summary = await pool.query<{
		purchase_count: string;
		gross_subunits: string;
		refund_subunits: string;
		unique_learners: string;
	}>(
		`SELECT COUNT(*) FILTER (WHERE status IN ('success', 'partially_refunded', 'refunded', 'reversed'))::text AS purchase_count,
		        COALESCE(SUM(amount_subunits) FILTER (WHERE status IN ('success', 'partially_refunded', 'refunded', 'reversed')), 0)::text AS gross_subunits,
		        COALESCE(SUM(refunded_subunits), 0)::text AS refund_subunits,
		        COUNT(DISTINCT user_id) FILTER (WHERE status IN ('success', 'partially_refunded', 'refunded', 'reversed'))::text AS unique_learners
		 FROM course_purchases`,
	);
	const byCourse = await pool.query(
		`SELECT c.id AS course_id, c.title, c.price AS published_price,
		        COUNT(p.id) FILTER (WHERE p.status IN ('success', 'partially_refunded', 'refunded', 'reversed'))::int AS purchase_count,
		        COALESCE(SUM(p.amount_subunits) FILTER (WHERE p.status IN ('success', 'partially_refunded', 'refunded', 'reversed')), 0) AS gross_subunits,
		        COALESCE(SUM(p.refunded_subunits), 0)::text AS refund_subunits
		 FROM courses c
		 LEFT JOIN course_purchases p ON p.course_id = c.id
		 GROUP BY c.id
		 ORDER BY gross_subunits DESC, c.title`,
	);
	return {
		...calculateCourseSalesTotals(summary.rows[0]),
		byCourse: byCourse.rows.map((row) => ({
			courseId: row.course_id,
			title: row.title,
			publishedPrice: Number(row.published_price),
			purchaseCount: Number(row.purchase_count),
			grossSubunits: Number(row.gross_subunits),
			refundSubunits: Number(row.refund_subunits),
			netSubunits: Math.max(0, Number(row.gross_subunits) - Number(row.refund_subunits)),
			currency: "KES",
		})),
	};
}

export async function listCoursePurchases(input: {
	search?: string;
	status?: PurchaseStatus;
	courseId?: string;
	from?: string;
	to?: string;
	sort: "newest" | "oldest" | "highest" | "lowest";
	limit: number;
	offset: number;
}) {
	const sort = {
		newest: "p.created_at DESC",
		oldest: "p.created_at ASC",
		highest: "p.amount_subunits DESC, p.created_at DESC",
		lowest: "p.amount_subunits ASC, p.created_at DESC",
	}[input.sort];
	const values = [
		input.search ? `%${input.search}%` : null,
		input.status ?? null,
		input.courseId ?? null,
		input.from ?? null,
		input.to ?? null,
		input.limit,
		input.offset,
	];
	const where = `WHERE ($1::text IS NULL OR p.learner_email ILIKE $1 OR c.title ILIKE $1 OR p.paystack_reference ILIKE $1)
	 AND ($2::text IS NULL OR p.status = $2)
	 AND ($3::uuid IS NULL OR p.course_id = $3)
	 AND ($4::timestamptz IS NULL OR p.created_at >= $4)
	 AND ($5::timestamptz IS NULL OR p.created_at < $5)`;
	const [rows, count] = await Promise.all([
		pool.query(
			`SELECT p.id, p.user_id, p.learner_email, c.title AS course_title, p.amount_subunits,
			        p.refunded_subunits, p.currency, p.status, p.paystack_reference, p.paid_at, p.created_at
			 FROM course_purchases p JOIN courses c ON c.id = p.course_id
			 ${where} ORDER BY ${sort} LIMIT $6 OFFSET $7`,
			values,
		),
		pool.query(
			`SELECT COUNT(*)::int AS total
			 FROM course_purchases p JOIN courses c ON c.id = p.course_id ${where}`,
			values.slice(0, 5),
		),
	]);
	return {
		purchases: rows.rows.map((row) => ({
			id: row.id,
			userId: row.user_id,
			learnerEmail: row.learner_email,
			courseTitle: row.course_title,
			amountSubunits: Number(row.amount_subunits),
			refundedSubunits: Number(row.refunded_subunits),
			currency: row.currency,
			status: row.status,
			paystackReference: row.paystack_reference,
			paidAt: row.paid_at,
			createdAt: row.created_at,
		})),
		total: count.rows[0].total as number,
	};
}

export async function getCoursePurchaseDetail(purchaseId: string) {
	const result = await pool.query(
		`SELECT p.id, p.course_id, c.title AS course_title, p.user_id, p.learner_email,
		        p.paystack_reference, p.amount_subunits, p.refunded_subunits, p.currency,
		        p.status, p.paid_at, p.created_at, p.updated_at
		 FROM course_purchases p JOIN courses c ON c.id = p.course_id
		 WHERE p.id = $1`,
		[purchaseId],
	);
	if (!result.rowCount) requestError("Course purchase not found.", 404);
	const row = result.rows[0];
	return {
		id: row.id,
		courseId: row.course_id,
		courseTitle: row.course_title,
		userId: row.user_id,
		learnerEmail: row.learner_email,
		paystackReference: row.paystack_reference,
		amountSubunits: Number(row.amount_subunits),
		refundedSubunits: Number(row.refunded_subunits),
		currency: row.currency,
		status: row.status,
		paidAt: row.paid_at,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	};
}
