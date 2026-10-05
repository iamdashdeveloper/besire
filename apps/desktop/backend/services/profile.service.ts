import { profiles } from "../db/collections";
import type { Profile } from "../db/models/profile";

export async function createProfile(profile: Profile) {
	return profiles.insertOne(profile);
}

export async function getProfile() {
	return profiles.findOne({});
}

export async function listProfiles() {
	return profiles.find({}).toArray();
}

export async function updateProfile(id: string, updates: Partial<Profile>) {
	return profiles.updateOne({ _id: id }, { $set: updates });
}
