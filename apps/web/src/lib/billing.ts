export interface BillingStatus {
	plan: "free" | "pro";
	paymentMode: "manual" | "subscription" | null;
	accessStartsAt: string | null;
	accessExpiresAt: string | null;
	isExpired: boolean;
	subscriptionStatus: string | null;
	nextPaymentAt: string | null;
	cancelAtPeriodEnd: boolean;
	subscriptionAvailable: boolean;
}

export interface SubscriptionOption {
	available: boolean;
	message: string | null;
}

const apiBaseUrl = (import.meta.env.VITE_API_URL as string | undefined) ?? "";

export async function billingApi<T>(
	path: string,
	getToken?: () => Promise<string | null>,
	options: RequestInit = {},
): Promise<T> {
	const headers = new Headers(options.headers);
	if (getToken) {
		const token = await getToken();
		if (!token) throw new Error("Sign in to manage your Besire Pro subscription.");
		headers.set("Authorization", `Bearer ${token}`);
	}
	if (options.body && !(options.body instanceof FormData)) {
		headers.set("Content-Type", "application/json");
	}

	const response = await fetch(`${apiBaseUrl}/api${path}`, {
		...options,
		credentials: "include",
		headers,
	});
	if (!response.ok) {
		let message = `Request failed (${response.status})`;
		try {
			const body = await response.json() as { error?: string; message?: string };
			message = body.error ?? body.message ?? message;
		} catch {
			if (response.statusText) message = response.statusText;
		}
		throw new Error(message);
	}
	if (response.status === 204) return undefined as T;
	return await response.json() as T;
}

export function formatBillingDate(value: string | null) {
	if (!value) return "Not available";
	const date = new Date(value);
	return Number.isNaN(date.getTime())
		? "Not available"
		: date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}
