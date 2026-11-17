import { profiles } from "../db/collections";
import { randomUUID } from "node:crypto";
import type { Profile, ProfileDocument } from "../db/models/profile";

function withProfileDefaults(profile: Profile): Profile {
	return {
		...profile,
		name: typeof profile.name === "string" && profile.name.trim()
			? profile.name
			: profile.personal?.fullName || "Untitled profile",
		documents: Array.isArray(profile.documents) ? profile.documents : [],
	};
}

export async function createProfile(profile: Profile) {
	const created = { ...profile, _id: randomUUID() };
	await profiles.insertOne(created);
	return created;
}

export async function getProfile(id: string) {
	const profile = await profiles.findOne({ _id: id }) as Profile | null;
	return profile ? withProfileDefaults(profile) : null;
}

export async function listProfiles() {
	const results = await profiles.find({}).toArray() as Profile[];
	return results.map(withProfileDefaults);
}

export async function updateProfile(id: string, updates: Partial<Profile>) {
	const existing = await getProfile(id);
	if (!existing) return null;
	const updated = { ...existing, ...updates, _id: id };
	await profiles.updateOne({ _id: id }, { $set: updated });
	return updated;
}

export async function deleteProfile(id: string) {
	const existing = await getProfile(id);
	if (!existing) return null;
	await profiles.deleteOne({ _id: id });
	return existing;
}

export async function addProfileDocument(id: string, document: ProfileDocument) {
	const profile = await getProfile(id);
	if (!profile) return null;
	return updateProfile(id, { documents: [...(profile.documents ?? []), document] });
}

export async function removeProfileDocument(id: string, documentId: string) {
	const profile = await getProfile(id);
	if (!profile) return null;
	const document = (profile.documents ?? []).find((item) => item._id === documentId);
	if (!document) return null;
	const updated = await updateProfile(id, {
		documents: (profile.documents ?? []).filter((item) => item._id !== documentId),
	});
	return { profile: updated, document };
}
