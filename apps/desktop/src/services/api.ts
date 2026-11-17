const apiBaseUrl = (import.meta.env.VITE_API_URL || "http://localhost:3001").replace(/\/$/, "");

export async function apiRequest<T>(
	path: string,
	token: string,
	options: RequestInit = {},
): Promise<T> {
	const response = await fetch(`${apiBaseUrl}${path}`, {
		...options,
		headers: {
			Accept: "application/json",
			...(options.body ? { "Content-Type": "application/json" } : {}),
			Authorization: `Bearer ${token}`,
			...options.headers,
		},
	});
	if (!response.ok) {
		const body = await response.json().catch(() => null) as { error?: string } | null;
		throw new Error(body?.error || `Request failed (${response.status}).`);
	}
	if (response.status === 204) return undefined as T;
	return response.json() as Promise<T>;
}

export function getWebAppUrl(path: string) {
	const base = (import.meta.env.VITE_WEB_APP_URL || "http://localhost:5173").replace(/\/$/, "");
	return `${base}${path}`;
}
