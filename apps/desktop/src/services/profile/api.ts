import type { Profile } from "../../../backend/db/models/profile";
import { getLocalProfile, listLocalProfiles, saveLocalProfile } from "../localProfiles";

export async function createProfile(profile: Profile): Promise<{ _id: string }> {
	const created = await saveLocalProfile(profile);
	if (!created._id) throw new Error("The local profile service did not return a profile ID.");
	return { _id: created._id };
}

export async function getProfile(): Promise<Profile | null> {
	const profiles = await listLocalProfiles();
	return profiles[0] ?? null;
}

export function listProfiles(): Promise<Profile[]> {
	return listLocalProfiles();
}

export async function updateProfile(id: string, updates: Partial<Profile>): Promise<{ _id: string }> {
	const existing = await getLocalProfile(id);
	const updated = await saveLocalProfile({ ...existing, ...updates, _id: id });
	if (!updated._id) throw new Error("The local profile service did not return a profile ID.");
	return { _id: updated._id };
}
