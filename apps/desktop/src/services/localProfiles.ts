import type { Profile, ProfileDocument } from "../../backend/db/models/profile";

const localApiUrl = "http://127.0.0.1:3002";

async function localRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
	const response = await fetch(`${localApiUrl}${path}`, {
		...options,
		headers: {
			...(options.body instanceof File ? { "Content-Type": options.body.type || "application/octet-stream" } : {}),
			...options.headers,
		},
	});

	if (!response.ok) {
		const body = await response.json().catch(() => null) as { error?: string } | null;
		throw new Error(body?.error || `Local profile request failed (${response.status}).`);
	}

	if (response.status === 204) return undefined as T;
	return response.json() as Promise<T>;
}

export function listLocalProfiles() {
	return localRequest<Profile[]>("/api/profiles");
}

export function getLocalProfile(id: string) {
	return localRequest<Profile>(`/api/profiles/${encodeURIComponent(id)}`);
}

export function saveLocalProfile(profile: Profile) {
	const path = profile._id ? `/api/profiles/${encodeURIComponent(profile._id)}` : "/api/profiles";
	return localRequest<Profile>(path, {
		method: profile._id ? "PUT" : "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(profile),
	});
}

export function deleteLocalProfile(id: string) {
	return localRequest<void>(`/api/profiles/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export function uploadProfileDocument(profileId: string, kind: ProfileDocument["kind"], file: File) {
	const params = new URLSearchParams({ kind, name: file.name });
	return localRequest<{ profile: Profile; document: ProfileDocument }>(
		`/api/profiles/${encodeURIComponent(profileId)}/documents?${params}`,
		{ method: "POST", body: file },
	);
}

export function deleteProfileDocument(profileId: string, documentId: string) {
	return localRequest<Profile>(
		`/api/profiles/${encodeURIComponent(profileId)}/documents/${encodeURIComponent(documentId)}`,
		{ method: "DELETE" },
	);
}

export function getProfileDocumentUrl(profileId: string, documentId: string) {
	return `${localApiUrl}/api/profiles/${encodeURIComponent(profileId)}/documents/${encodeURIComponent(documentId)}/download`;
}
