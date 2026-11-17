import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { test } from "node:test";
import { resolveClerkIdentity } from "../src/auth.js";
import { assertVerifiedPayment } from "../src/billing.js";
import {
	assertMonthlyPlanConfigured,
	hasProAccess,
	initializePaystackTransaction,
	manualAccessPeriod,
	PaystackError,
	paystackWebhookEventKey,
	PRO_PRICE_SUBUNITS,
	subscriptionAccessPeriod,
	transactionInitializationPayload,
	verifyPaystackSignature,
} from "../src/paystack.js";

const callbackUrl = "https://besire.example/billing/return";
const metadata = { payment_id: "payment-reference" };

test("manual checkout initializes a fixed KES transaction without a plan", async () => {
	const payload = transactionInitializationPayload(
		"manual",
		"verified@example.test",
		"manual-ref",
		callbackUrl,
		metadata,
		"must-not-be-used",
	);
	assert.deepEqual(payload, {
		email: "verified@example.test",
		amount: PRO_PRICE_SUBUNITS,
		currency: "KES",
		reference: "manual-ref",
		callback_url: callbackUrl,
		metadata: { ...metadata, payment_mode: "manual" },
	});
	assert.equal("plan" in payload, false);

	let requestBody: Record<string, unknown> | null = null;
	const checkout = await initializePaystackTransaction(payload, "test-secret", async (_input, init) => {
		requestBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
		return new Response(JSON.stringify({
			status: true,
			message: "Initialized",
			data: { authorization_url: "https://checkout.paystack.com/checkout", access_code: "access", reference: "manual-ref" },
		}), { status: 200 });
	});
	assert.equal(checkout.reference, "manual-ref");
	assert.equal(requestBody?.amount, PRO_PRICE_SUBUNITS);
	assert.equal("plan" in (requestBody ?? {}), false);
});

test("subscription checkout always uses its configured plan and never the manual amount", async () => {
	const payload = transactionInitializationPayload(
		"subscription",
		"verified@example.test",
		"subscription-ref",
		callbackUrl,
		metadata,
		"PLN_configured",
	);
	assert.equal(payload.plan, "PLN_configured");
	assert.equal("amount" in payload, false);
	assert.equal("currency" in payload, false);
	assert.throws(
		() => transactionInitializationPayload("subscription", "verified@example.test", "missing", callbackUrl, metadata),
		PaystackError,
	);
	let sent: Record<string, unknown> | null = null;
	await initializePaystackTransaction(payload, "test-secret", async (_input, init) => {
		sent = JSON.parse(String(init?.body)) as Record<string, unknown>;
		return new Response(JSON.stringify({
			status: true,
			message: "Initialized",
			data: { authorization_url: "https://checkout.paystack.com/checkout", access_code: "access", reference: "subscription-ref" },
		}), { status: 200 });
	});
	assert.equal(sent?.plan, "PLN_configured");
	assert.equal("amount" in (sent ?? {}), false);
});

test("configured subscription plan must be KES 2,000 monthly", async () => {
	const calls: string[] = [];
	const fetcher = async (input: RequestInfo | URL) => {
		calls.push(String(input));
		return new Response(JSON.stringify({
			status: true,
			message: "Plan",
			data: { amount: PRO_PRICE_SUBUNITS, currency: "KES", interval: "monthly" },
		}), { status: 200 });
	};
	await assertMonthlyPlanConfigured("test-secret", "PLN_abc", fetcher, true);
	assert.deepEqual(calls, ["https://api.paystack.co/plan/PLN_abc"]);
	await assert.rejects(
		assertMonthlyPlanConfigured("test-secret", null, fetcher, true),
		(error: unknown) => error instanceof PaystackError && error.statusCode === 503,
	);
	await assert.rejects(
		assertMonthlyPlanConfigured("test-secret", "PLN_abc", fetcher, false),
		(error: unknown) => error instanceof PaystackError && error.statusCode === 503,
	);
});

test("Paystack verification requests are server-side and reference-encoded", async () => {
	const seen: { url: string; authorization: string | null } = { url: "", authorization: null };
	const { verifyPaystackTransaction } = await import("../src/paystack.js");
	await verifyPaystackTransaction("reference/with spaces", "private-test-secret", async (input, init) => {
		seen.url = String(input);
		seen.authorization = new Headers(init?.headers).get("Authorization");
		return new Response(JSON.stringify({
			status: true,
			message: "Verified",
			data: {
				reference: "reference/with spaces",
				status: "success",
				amount: PRO_PRICE_SUBUNITS,
				currency: "KES",
			},
		}), { status: 200 });
	});
	assert.equal(seen.url, "https://api.paystack.co/transaction/verify/reference%2Fwith%20spaces");
	assert.equal(seen.authorization, "Bearer private-test-secret");
});

test("verified transactions cannot mix recurring and manual payment modes", () => {
	const manualPayment = {
		payment_mode: "manual" as const,
		paystack_plan_code: null,
		email: "verified@example.test",
	};
	const transaction = {
		reference: "manual-ref",
		status: "success",
		amount: PRO_PRICE_SUBUNITS,
		currency: "KES",
		customer: { email: "verified@example.test" },
		plan: null,
	};
	assert.equal(assertVerifiedPayment(transaction, "manual-ref", manualPayment).status, "success");
	assert.equal(assertVerifiedPayment(
		{ ...transaction, status: "pending" },
		"manual-ref",
		manualPayment,
	).status, "pending");
	assert.throws(() => assertVerifiedPayment({ ...transaction, amount: 2_000 }, "manual-ref", manualPayment));
	assert.throws(() => assertVerifiedPayment({ ...transaction, currency: "USD" }, "manual-ref", manualPayment));
	assert.throws(() => assertVerifiedPayment({ ...transaction, customer: { email: "attacker@example.test" } }, "manual-ref", manualPayment));
	assert.throws(() => assertVerifiedPayment({ ...transaction, plan: { plan_code: "PLN_monthly" } }, "manual-ref", manualPayment));
	assert.equal(assertVerifiedPayment(
		{ ...transaction, plan: { plan_code: "PLN_monthly" } },
		"manual-ref",
		{ ...manualPayment, payment_mode: "subscription", paystack_plan_code: "PLN_monthly" },
	).status, "success");
	assert.throws(() => assertVerifiedPayment(transaction, "manual-ref", {
		...manualPayment,
		payment_mode: "subscription",
		paystack_plan_code: "PLN_monthly",
	}));
});

test("webhook HMAC signature is checked against the exact raw body", () => {
	const body = Buffer.from('{"event":"charge.success","data":{"reference":"ref-123"}}');
	const secret = "webhook-test-secret";
	const signature = createHmac("sha512", secret).update(body).digest("hex");
	assert.equal(verifyPaystackSignature(body, signature, secret), true);
	assert.equal(verifyPaystackSignature(body, "0".repeat(128), secret), false);
	assert.equal(verifyPaystackSignature(Buffer.from(`${body.toString()} `), signature, secret), false);
	assert.equal(verifyPaystackSignature(body, undefined, secret), false);
});

test("duplicate Paystack deliveries produce the same idempotency event key", () => {
	const data = { reference: "ref-1", status: "success", amount: 200000 };
	assert.equal(paystackWebhookEventKey("charge.success", data), paystackWebhookEventKey("charge.success", { ...data }));
	assert.notEqual(paystackWebhookEventKey("charge.success", data), paystackWebhookEventKey("charge.failed", data));
	assert.notEqual(paystackWebhookEventKey("charge.success", data), paystackWebhookEventKey("charge.success", { ...data, reference: "ref-2" }));
});

test("manual payments extend a current paid period without resetting it", () => {
	const now = new Date("2026-10-10T10:00:00.000Z");
	const existingExpiry = new Date("2026-10-20T10:00:00.000Z");
	const extended = manualAccessPeriod(now, existingExpiry);
	assert.equal(extended.startsAt.toISOString(), existingExpiry.toISOString());
	assert.equal(extended.expiresAt.toISOString(), "2026-11-19T10:00:00.000Z");
	const expired = manualAccessPeriod(now, new Date("2026-10-01T10:00:00.000Z"));
	assert.equal(expired.startsAt.toISOString(), now.toISOString());
	assert.equal(expired.expiresAt.toISOString(), "2026-11-09T10:00:00.000Z");
});

test("subscription access follows the recorded next payment date when available", () => {
	const paidAt = new Date("2026-01-31T12:00:00.000Z");
	const nextPaymentAt = new Date("2026-02-28T12:00:00.000Z");
	assert.deepEqual(subscriptionAccessPeriod(paidAt, nextPaymentAt), {
		startsAt: paidAt,
		expiresAt: nextPaymentAt,
	});
});

test("Pro entitlement expires at its persisted expiry time", () => {
	const now = new Date("2026-10-10T10:00:00.000Z");
	assert.equal(hasProAccess("pro", new Date("2026-10-10T10:00:01.000Z"), now), true);
	assert.equal(hasProAccess("pro", now, now), false);
	assert.equal(hasProAccess("pro", new Date("2026-10-09T10:00:00.000Z"), now), false);
	assert.equal(hasProAccess("free", new Date("2026-10-11T10:00:00.000Z"), now), false);
});

test("Clerk identity requires a verified bearer token and uses the verified subject", async () => {
	const verify = async (token: string) => {
		assert.equal(token, "signed-token");
		return { sub: "user_verified_subject" };
	};
	const loadUser = async (userId: string) => {
		assert.equal(userId, "user_verified_subject");
		return { email: "primary@example.test" };
	};
	assert.deepEqual(await resolveClerkIdentity("Bearer signed-token", verify, loadUser), {
		userId: "user_verified_subject",
		email: "primary@example.test",
	});
	assert.equal(await resolveClerkIdentity("Bearer bad-token", async () => { throw new Error("invalid"); }, loadUser), null);
	assert.equal(await resolveClerkIdentity(undefined, verify, loadUser), null);
	assert.equal(await resolveClerkIdentity("Basic signed-token", verify, loadUser), null);
});
