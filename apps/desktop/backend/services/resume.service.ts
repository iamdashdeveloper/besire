import { randomUUID } from "node:crypto";
import { resumes } from "../db/collections";
import type { ResumeData, ResumeDocument } from "../db/models/resume";

export async function createResume(input: {
	name?: string;
	data: ResumeData;
}) {
	const now = new Date().toISOString();
	const created: ResumeDocument = {
		_id: randomUUID(),
		name: input.name?.trim() || input.data.basics.name.trim() || "Untitled resume",
		data: input.data,
		createdAt: now,
		updatedAt: now,
	};
	await resumes.insertOne(created);
	return created;
}

export async function getResume(id: string) {
	return (await resumes.findOne({ _id: id })) as ResumeDocument | null;
}

export async function listResumes() {
	return (await resumes.find({}).toArray()) as ResumeDocument[];
}

export async function updateResume(
	id: string,
	updates: { name?: string; data?: ResumeData },
) {
	const existing = await getResume(id);
	if (!existing) return null;
	const updated: ResumeDocument = {
		...existing,
		...(updates.name !== undefined ? { name: updates.name.trim() || "Untitled resume" } : {}),
		...(updates.data ? { data: updates.data } : {}),
		updatedAt: new Date().toISOString(),
	};
	await resumes.updateOne({ _id: id }, { $set: updated });
	return updated;
}

export async function deleteResume(id: string) {
	const existing = await getResume(id);
	if (!existing) return null;
	await resumes.deleteOne({ _id: id });
	return existing;
}
