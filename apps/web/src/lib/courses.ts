export type CourseStatus = "draft" | "published";
export type CourseBlockType = "text" | "image" | "video";

export interface CourseAsset {
	id: string;
	fileName: string;
	contentType: string;
	size: number;
	url?: string;
}

export interface LessonBlock {
	id: string;
	type: CourseBlockType;
	position: number;
	data: Record<string, string>;
	asset?: CourseAsset | null;
}

export interface CourseLesson {
	id: string;
	moduleId: string;
	title: string;
	position: number;
	blocks: LessonBlock[];
}

export interface CourseModule {
	id: string;
	courseId: string;
	title: string;
	position: number;
	lessons: CourseLesson[];
}

export interface Course {
	id: string;
	title: string;
	description: string;
	price: number;
	status: CourseStatus;
	thumbnailAsset?: CourseAsset | null;
	creatorId: string;
	creatorName?: string | null;
	createdAt: string;
	updatedAt: string;
	modules: CourseModule[];
	accessGranted?: boolean;
	requiresPurchase?: boolean;
}

export class CourseApiError extends Error {
	status: number;

	constructor(message: string, status: number) {
		super(message);
		this.name = "CourseApiError";
		this.status = status;
	}
}

const apiBaseUrl = (import.meta.env.VITE_API_URL as string | undefined) ?? "";

export async function courseApi<T>(
	path: string,
	token: string | null,
	options: RequestInit = {},
): Promise<T> {
	const headers = new Headers(options.headers);
	if (token) headers.set("Authorization", `Bearer ${token}`);
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
			const body = (await response.json()) as { error?: string; message?: string };
			message = body.error ?? body.message ?? message;
		} catch {
			if (response.statusText) message = response.statusText;
		}
		throw new CourseApiError(message, response.status);
	}

	if (response.status === 204) return undefined as T;
	return (await response.json()) as T;
}

export function jsonBody(value: unknown): string {
	return JSON.stringify(value);
}

export function uploadFile(
	url: string,
	file: File,
	headers: Record<string, string>,
	onProgress: (progress: number) => void,
): Promise<void> {
	return new Promise((resolve, reject) => {
		const request = new XMLHttpRequest();
		request.open("PUT", url);
		for (const [name, value] of Object.entries(headers)) {
			request.setRequestHeader(name, value);
		}
		request.upload.onprogress = (event) => {
			if (event.lengthComputable) {
				onProgress(Math.round((event.loaded / event.total) * 100));
			}
		};
		request.onerror = () => reject(new Error("Upload failed. Check your connection and try again."));
		request.onabort = () => reject(new Error("Upload was cancelled."));
		request.onload = () => {
			if (request.status >= 200 && request.status < 300) {
				onProgress(100);
				resolve();
			} else {
				reject(new Error(`Upload failed (${request.status}).`));
			}
		};
		request.send(file);
	});
}
