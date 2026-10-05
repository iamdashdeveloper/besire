import type { Profile } from "../../../../../backend/db/models/profile";
import { extractResumeText } from "./resumeImportService";
import { extractProfileFromResume } from "./puterProfileExtractor";
import { sanitizeProfile } from "./types";

export class ProfileImportError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "ProfileImportError";
	}
}

export async function importProfileFromResume(file: File): Promise<Profile> {
	try {
		const extractionResult = await extractResumeText(file);
		
		const profileData = await extractProfileFromResume(extractionResult.text);
		
		const sanitizedProfile = sanitizeProfile(profileData);
		
		// Ensure required fields are present with sensible defaults
		const finalProfile: Profile = {
			...sanitizedProfile,
			personal: {
				...sanitizedProfile.personal,
				fullName: sanitizedProfile.personal.fullName || "",
				preferredName: sanitizedProfile.personal.preferredName ?? "",
				email: sanitizedProfile.personal.email ?? "",
				phone: sanitizedProfile.personal.phone ?? "",
				location: {
					city: sanitizedProfile.personal.location?.city ?? "",
					country: sanitizedProfile.personal.location?.country ?? "",
				},
links: {
				linkedin: sanitizedProfile.personal.links?.linkedin ?? "",
				github: sanitizedProfile.personal.links?.github ?? "",
				portfolio: sanitizedProfile.personal.links?.portfolio ?? "",
				other: sanitizedProfile.personal.links?.other ?? [],
			},
			},
			professional: {
				...sanitizedProfile.professional,
				headline: sanitizedProfile.professional.headline ?? "",
				summary: sanitizedProfile.professional.summary ?? "",
				education: sanitizedProfile.professional.education ?? [],
				workExperience: sanitizedProfile.professional.workExperience ?? [],
				skills: sanitizedProfile.professional.skills ?? [],
				certifications: sanitizedProfile.professional.certifications ?? [],
				projects: sanitizedProfile.professional.projects ?? [],
				languages: sanitizedProfile.professional.languages ?? [],
			},
			interests: {
				personal: sanitizedProfile.interests.personal ?? [],
				professional: sanitizedProfile.interests.professional ?? [],
			},
			workPreferences: {
				...sanitizedProfile.workPreferences,
				workModes: sanitizedProfile.workPreferences.workModes ?? [],
				employmentTypes: sanitizedProfile.workPreferences.employmentTypes ?? [],
				preferredRoles: sanitizedProfile.workPreferences.preferredRoles ?? [],
				preferredIndustries: sanitizedProfile.workPreferences.preferredIndustries ?? [],
				preferredLocations: sanitizedProfile.workPreferences.preferredLocations ?? [],
				willingToRelocate: sanitizedProfile.workPreferences.willingToRelocate ?? false,
				salaryExpectation: {
					...sanitizedProfile.workPreferences.salaryExpectation,
					minimum: sanitizedProfile.workPreferences.salaryExpectation?.minimum ?? 0,
					maximum: sanitizedProfile.workPreferences.salaryExpectation?.maximum ?? 0,
					currency: sanitizedProfile.workPreferences.salaryExpectation?.currency ?? "USD",
				},
				availability: sanitizedProfile.workPreferences.availability ?? "",
			},
		};
		
		return finalProfile;
	} catch (error) {
		if (error instanceof Error) {
			throw new ProfileImportError(`Resume import failed: ${error.message}`);
		}
		throw new ProfileImportError("Resume import failed due to an unknown error");
	}
}