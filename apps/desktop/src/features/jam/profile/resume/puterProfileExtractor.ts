import { puter } from "@heyputer/puter.js";
import type { Profile } from "../../../../../backend/db/models/profile";

function createPuterPrompt(resumeText: string): string {
	return `
You are an expert resume parsing AI. Your task is to transform the raw resume text into a structured JSON profile according to the following schema:

- personal.fullName (string)
- personal.preferredName (string, optional)
- personal.email (string, optional)
- personal.phone (string, optional)
- personal.location.city (string, optional)
- personal.location.country (string, optional)
- personal.links.linkedin (string, optional)
- personal.links.github (string, optional)
- personal.links.portfolio (string, optional)
- personal.links.other (string array, optional)

- professional.headline (string, optional)
- professional.summary (string, optional)

- professional.education (array of objects, each with: institution (required), qualification (optional), field (optional), startDate (optional), endDate (optional), status (optional: "completed"|"in_progress"|"paused"), location (optional), description (optional))
- professional.workExperience (array of objects, each with: company (required), role (required), employmentType (optional), startDate (optional), endDate (optional), location (optional), workMode (optional: "remote"|"onsite"|"hybrid"), description (optional), achievements (optional array), skills (optional array))
- professional.skills (array of objects, each with: name (required), category (optional), level (optional: "beginner"|"intermediate"|"advanced"|"expert"))
- professional.certifications (array of objects, each with: name (required), issuer (optional), issueDate (optional), expiryDate (optional), credentialId (optional), credentialUrl (optional))
- professional.projects (array of objects, each with: name (required), description (optional), role (optional), startDate (optional), endDate (optional), skills (optional array), url (optional), repositoryUrl (optional))
- professional.languages (array of objects, each with: name (required), proficiency (optional: "basic"|"conversational"|"professional"|"fluent"|"native"))

- interests.personal (array of strings, optional)
- interests.professional (array of strings, optional)

- workPreferences.workModes (array of strings, optional)
- workPreferences.employmentTypes (array of strings, optional)
- workPreferences.preferredRoles (array of strings, optional)
- workPreferences.preferredIndustries (array of strings, optional)
- workPreferences.preferredLocations (array of strings, optional)
- workPreferences.willingToRelocate (boolean, optional)
- workPreferences.salaryExpectation.minimum (number, optional)
- workPreferences.salaryExpectation.maximum (number, optional)
- workPreferences.salaryExpectation.currency (string, optional)
- workPreferences.availability (string, optional)

CRITICAL RULES:
1. NEVER invent information. If something is not present in the resume text, leave the field empty (null, undefined, or empty array).
2. For arrays, only include items when there are actual values in the resume.
3. For dates, use YYYY-MM-DD format when found.
4. Preserve exact company names, institution names, and text as provided.
5. Do NOT infer skills, achievements, dates, or any other information unless explicitly stated in the resume.
6. Return valid JSON only - no explanations, no markdown formatting.

Resume text to parse:
---
${resumeText}
---

Return JSON that strictly follows the above schema.
`;
}

function extractContentFromPuterResponse(response: any): string {
	if (response && typeof response === "object") {
		if (response.message && typeof response.message.content === "string") {
			return response.message.content.trim();
		}
		if (response.content && typeof response.content === "string") {
			return response.content.trim();
		}
		if (response.choices && Array.isArray(response.choices) && response.choices.length > 0) {
			const first = response.choices[0];
			if (first.message && typeof first.message.content === "string") {
				return first.message.content.trim();
			}
			if (first.text && typeof first.text === "string") {
				return first.text.trim();
			}
		}
	}
	if (typeof response === "string") {
		return response.trim();
	}
	throw new Error("Unexpected Puter response format");
}

export async function extractProfileFromResume(resumeText: string): Promise<Profile> {
	const prompt = createPuterPrompt(resumeText);

	const aiResponse = await puter.ai.chat([
		{ role: "user", content: prompt },
	], {
		model: "gpt-4o-mini",
	});

	const content = extractContentFromPuterResponse(aiResponse);

	let parsed: unknown;
	try {
		parsed = JSON.parse(content);
	} catch (error) {
		throw new Error(`Failed to parse AI response: ${(error as Error).message}\n\nResponse: ${content.substring(0, 500)}...`);
	}

	return parsed as Profile;
}