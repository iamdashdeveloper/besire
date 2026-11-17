import type { ResumeData, ResumeDocument } from "../../backend/db/models/resume";

const localApiUrl = "http://127.0.0.1:3002";

async function localRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
	const response = await fetch(`${localApiUrl}${path}`, {
		...options,
		headers: {
			"Content-Type": "application/json",
			...options.headers,
		},
	});

	if (!response.ok) {
		const body = (await response.json().catch(() => null)) as { error?: string } | null;
		throw new Error(body?.error || `Local resume request failed (${response.status}).`);
	}

	if (response.status === 204) return undefined as T;
	return response.json() as Promise<T>;
}

export function listLocalResumes() {
	return localRequest<ResumeDocument[]>("/api/resumes");
}

export function getLocalResume(id: string) {
	return localRequest<ResumeDocument>(`/api/resumes/${encodeURIComponent(id)}`);
}

export function createLocalResume(input: { name?: string; data?: ResumeData } = {}) {
	return localRequest<ResumeDocument>("/api/resumes", {
		method: "POST",
		body: JSON.stringify(input),
	});
}

export function updateLocalResume(
	id: string,
	updates: { name?: string; data?: ResumeData },
) {
	return localRequest<ResumeDocument>(`/api/resumes/${encodeURIComponent(id)}`, {
		method: "PUT",
		body: JSON.stringify(updates),
	});
}

export function deleteLocalResume(id: string) {
	return localRequest<void>(`/api/resumes/${encodeURIComponent(id)}`, {
		method: "DELETE",
	});
}

export function importLocalResume(data: ResumeData, name?: string) {
	return localRequest<ResumeDocument>("/api/resumes/import", {
		method: "POST",
		body: JSON.stringify({ data, ...(name ? { name } : {}) }),
	});
}

export function exportLocalResume(id: string) {
	return localRequest<ResumeData>(`/api/resumes/${encodeURIComponent(id)}/export`);
}
