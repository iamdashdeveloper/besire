import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { config } from "./config.js";

export const PRO_PRICE_KES = 2_000;
export const PRO_PRICE_SUBUNITS = PRO_PRICE_KES * 100;
export const MANUAL_ACCESS_DAYS = 30;
const paystackApi = "https://api.paystack.co";

export type PaymentMode = "manual" | "subscription";

export function isSubscriptionConfigured() {
	return Boolean(
		config.paystackSecretKey &&
		config.paystackMonthlyPlanCode &&
		config.billingTokenEncryptionKey,
	);
}

export interface PaystackTransaction {
	reference: string;
	status: string;
	amount: number;
	currency: string;
	paid_at?: string | null;
	customer?: { email?: string | null };
	plan?: { plan_code?: string; id?: number; [key: string]: unknown } | string | null;
	subscription_code?: string | null;
	metadata?: Record<string, unknown> | null;
	[ key: string ]: unknown;
}

interface PaystackResponse<T> {
	status: boolean;
	message: string;
	data: T;
}

type PaystackFetch = typeof fetch;

export class PaystackError extends Error {
	constructor(message: string, readonly statusCode = 502) {
		super(message);
		this.name = "PaystackError";
	}
}

async function paystackRequest<T>(
	path: string,
	init: RequestInit = {},
	secretKey = config.paystackSecretKey,
	fetcher: PaystackFetch = fetch,
): Promise<T> {
	if (!secretKey) {
		throw new PaystackError("Paystack is not configured on the server.", 503);
	}

	let response: Response;
	try {
		response = await fetcher(`${paystackApi}${path}`, {
			...init,
			headers: {
				Authorization: `Bearer ${secretKey}`,
				"Content-Type": "application/json",
				...init.headers,
			},
		});
	} catch {
		throw new PaystackError("Could not reach Paystack. Please try again.");
	}

	let payload: PaystackResponse<T>;
	try {
		payload = await response.json() as PaystackResponse<T>;
	} catch {
		throw new PaystackError("Paystack returned an invalid response.");
	}
	if (!response.ok || !payload.status) {
		throw new PaystackError("Paystack could not complete the payment request.");
	}
	return payload.data;
}

export function transactionInitializationPayload(
	mode: PaymentMode,
	email: string,
	reference: string,
	callbackUrl: string,
	metadata: Record<string, string>,
	planCode?: string,
) {
	if (mode === "manual") {
		return {
			email,
			amount: PRO_PRICE_SUBUNITS,
			currency: "KES",
			reference,
			callback_url: callbackUrl,
			metadata: { ...metadata, payment_mode: "manual" },
		};
	}
	if (!planCode) throw new PaystackError("Automatic monthly renewal is not configured.", 503);
	return {
		email,
		plan: planCode,
		reference,
		callback_url: callbackUrl,
		metadata: { ...metadata, payment_mode: "subscription" },
	};
}

export async function assertMonthlyPlanConfigured(
	secretKey = config.paystackSecretKey,
	planCode: string | null | undefined = config.paystackMonthlyPlanCode,
	fetcher: PaystackFetch = fetch,
	encryptionReady = Boolean(config.billingTokenEncryptionKey),
) {
	if (!secretKey) {
		throw new PaystackError("Automatic monthly renewal is unavailable. Configure PAYSTACK_SECRET_KEY first.", 503);
	}
	if (!planCode) {
		throw new PaystackError(
			"Automatic monthly renewal is unavailable. Configure a Paystack monthly KES 2,000 plan code to enable it.",
			503,
		);
	}
	if (!encryptionReady) {
		throw new PaystackError(
			"Automatic monthly renewal is unavailable. Configure BILLING_TOKEN_ENCRYPTION_KEY to securely support subscription cancellation.",
			503,
		);
	}
	const plan = await paystackRequest<{
		amount: number;
		currency: string;
		interval: string;
	}>(
		`/plan/${encodeURIComponent(planCode)}`,
		{ method: "GET" },
		secretKey,
		fetcher,
	);
	if (
		plan.amount !== PRO_PRICE_SUBUNITS ||
		plan.currency !== "KES" ||
		plan.interval !== "monthly"
	) {
		throw new PaystackError(
			"Automatic monthly renewal is unavailable: the configured Paystack plan must be KES 2,000 billed monthly.",
			503,
		);
	}
}

export async function initializePaystackTransaction(
	payload: ReturnType<typeof transactionInitializationPayload>,
	secretKey = config.paystackSecretKey,
	fetcher: PaystackFetch = fetch,
) {
	return paystackRequest<{
		authorization_url: string;
		access_code: string;
		reference: string;
	}>("/transaction/initialize", {
		method: "POST",
		body: JSON.stringify(payload),
	}, secretKey, fetcher);
}

export async function initializeCoursePaystackTransaction(payload: {
	email: string;
	amount: number;
	currency: "KES";
	reference: string;
	callback_url: string;
	metadata: Record<string, string>;
}) {
	return paystackRequest<{
		authorization_url: string;
		access_code: string;
		reference: string;
	}>("/transaction/initialize", {
		method: "POST",
		body: JSON.stringify(payload),
	});
}

export async function verifyPaystackTransaction(
	reference: string,
	secretKey = config.paystackSecretKey,
	fetcher: PaystackFetch = fetch,
) {
	return paystackRequest<PaystackTransaction>(
		`/transaction/verify/${encodeURIComponent(reference)}`,
		{ method: "GET" },
		secretKey,
		fetcher,
	);
}

export async function disablePaystackSubscription(subscriptionCode: string, emailToken: string) {
	return paystackRequest<{ code: string; message: string }>(
		"/subscription/disable",
		{
			method: "POST",
			body: JSON.stringify({ code: subscriptionCode, token: emailToken }),
		},
	);
}

export function verifyPaystackSignature(
	rawBody: Buffer,
	signature: string | undefined,
	secretKey = config.paystackSecretKey,
) {
	if (!secretKey || !signature || !/^[a-f\d]{128}$/i.test(signature)) return false;
	const expected = createHmac("sha512", secretKey).update(rawBody).digest();
	const supplied = Buffer.from(signature, "hex");
	return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

function tokenEncryptionKey() {
	if (!config.billingTokenEncryptionKey) {
		throw new PaystackError("Subscription cancellation is unavailable until BILLING_TOKEN_ENCRYPTION_KEY is configured.", 503);
	}
	return createHash("sha256").update(config.billingTokenEncryptionKey).digest();
}

export function encryptPaystackToken(token: string) {
	const iv = randomBytes(12);
	const cipher = createCipheriv("aes-256-gcm", tokenEncryptionKey(), iv);
	const ciphertext = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
	return `${iv.toString("base64url")}.${cipher.getAuthTag().toString("base64url")}.${ciphertext.toString("base64url")}`;
}

export function decryptPaystackToken(encrypted: string) {
	const [ivText, tagText, ciphertextText] = encrypted.split(".");
	if (!ivText || !tagText || !ciphertextText) throw new PaystackError("Stored subscription cancellation token is invalid.", 500);
	try {
		const decipher = createDecipheriv("aes-256-gcm", tokenEncryptionKey(), Buffer.from(ivText, "base64url"));
		decipher.setAuthTag(Buffer.from(tagText, "base64url"));
		return Buffer.concat([
			decipher.update(Buffer.from(ciphertextText, "base64url")),
			decipher.final(),
		]).toString("utf8");
	} catch {
		throw new PaystackError("Could not decrypt the stored subscription cancellation token.", 500);
	}
}

export function manualAccessPeriod(now: Date, currentExpiry: Date | null) {
	const startsAt = currentExpiry && currentExpiry > now ? currentExpiry : now;
	return {
		startsAt,
		expiresAt: new Date(startsAt.getTime() + MANUAL_ACCESS_DAYS * 24 * 60 * 60 * 1000),
	};
}

export function hasProAccess(plan: string | undefined, expiresAt: Date | null | undefined, now = new Date()) {
	return plan === "pro" && expiresAt instanceof Date && expiresAt > now;
}

export function subscriptionAccessPeriod(paidAt: Date, nextPaymentAt?: Date | null) {
	return {
		startsAt: paidAt,
		expiresAt: nextPaymentAt && nextPaymentAt > paidAt
			? nextPaymentAt
			: new Date(paidAt.getTime() + MANUAL_ACCESS_DAYS * 24 * 60 * 60 * 1000),
	};
}

export function paystackWebhookEventKey(eventType: string, data: Record<string, unknown>) {
	return createHash("sha256")
		.update(eventType)
		.update(":")
		.update(JSON.stringify(data))
		.digest("hex");
}

export function configuredCheckoutReturnUrl() {
	return new URL("/billing/return", config.webAppUrl).toString();
}
