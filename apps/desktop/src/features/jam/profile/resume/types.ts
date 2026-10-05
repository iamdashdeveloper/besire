import type {
	Profile,
	Education,
	WorkExperience,
	Skill,
	Certification,
	Project,
	Language,
	WorkMode,
	EmploymentType,
} from "../../../../../backend/db/models/profile";

export type ResumeImportStatus = "idle" | "extracting" | "processing" | "complete" | "error";

export interface ResumeImportResult {
	profile: Profile;
	status: ResumeImportStatus;
	error?: string;
}

/**
 * Safely extract a string value, returning undefined if empty/whitespace.
 */
function safeGetString(obj: Record<string, unknown>, key: string): string | undefined {
	const val = obj[key];
	return (typeof val === "string" && val.trim().length > 0) ? val.trim() : undefined;
}

/**
 * Safely extract a string array value.
 */
function safeGetStringArray(obj: Record<string, unknown>, key: string): string[] {
	const val = obj[key];
	if (!Array.isArray(val)) return [];
	return val
		.filter((item): item is string => typeof item === "string")
		.map((s) => s.trim())
		.filter((s) => s.length > 0);
}

/**
 * Parse a date string, returning undefined if empty.
 */
function safeGetDate(obj: Record<string, unknown>, key: string): string | undefined {
	const val = obj[key];
	if (!val || typeof val !== "string") return undefined;
	const trimmed = val.trim();
	return trimmed.length > 0 ? trimmed : undefined;
}

function parseLevel(level: string): "beginner" | "intermediate" | "advanced" | "expert" | undefined {
	const lvl = level.toLowerCase();
	if (["beginner", "intermediate", "advanced", "expert"].includes(lvl)) return lvl as "beginner" | "intermediate" | "advanced" | "expert";
	return undefined;
}

function parseWorkMode(mode: string): "remote" | "onsite" | "hybrid" | undefined {
	const m = mode.toLowerCase();
	if (["remote", "onsite", "hybrid"].includes(m)) return m as "remote" | "onsite" | "hybrid";
	return undefined;
}

function parseEmploymentType(type: string): EmploymentType | undefined {
	const t = type.toLowerCase();
	if (
		["full_time", "part_time", "contract", "temporary", "internship", "freelance"].includes(t)
	) return t as EmploymentType;
	return undefined;
}

function isStatusValue(s: string): s is "completed" | "in_progress" | "paused" {
	return ["completed", "in_progress", "paused"].includes(s);
}

export function sanitizeProfile(raw: unknown): Profile {
	const p = (raw ?? {}) as Record<string, unknown>;

	const personalRaw = (p.personal ?? {}) as Record<string, unknown>;
	const professionalRaw = (p.professional ?? {}) as Record<string, unknown>;
	const interestsRaw = (p.interests ?? {}) as Record<string, unknown>;
	const workPrefsRaw = (p.workPreferences ?? {}) as Record<string, unknown>;
	const linksRaw = (personalRaw.links ?? {}) as Record<string, unknown>;
	const locationRaw = (personalRaw.location ?? {}) as Record<string, unknown>;

	// Education
	const educationItems = professionalRaw.education;
	const education: Education[] = Array.isArray(educationItems)
		? educationItems
			.map((item): Education => {
				const e = item as Record<string, unknown>;
				return {
					institution: safeGetString(e, "institution") || "",
					qualification: safeGetString(e, "qualification"),
					field: safeGetString(e, "field"),
					startDate: safeGetDate(e, "startDate"),
					endDate: safeGetDate(e, "endDate"),
					status: isStatusValue(e.status as string) ? e.status as "completed" | "in_progress" | "paused" : undefined,
					location: safeGetString(e, "location"),
					description: safeGetString(e, "description"),
				};
			})
			.filter((e) => e.institution.length > 0)
		: [];

	// Work Experience
	const workExpItems = professionalRaw.workExperience;
	const workExperience: WorkExperience[] = Array.isArray(workExpItems)
		? workExpItems
			.map((item): WorkExperience => {
				const w = item as Record<string, unknown>;
				return {
					company: safeGetString(w, "company") || "",
					role: safeGetString(w, "role") || "",
					employmentType: parseEmploymentType(safeGetString(w, "employmentType") || ""),
					startDate: safeGetDate(w, "startDate"),
					endDate: safeGetDate(w, "endDate"),
					location: safeGetString(w, "location"),
					workMode: parseWorkMode(safeGetString(w, "workMode") || ""),
					description: safeGetString(w, "description"),
					achievements: safeGetStringArray(w, "achievements"),
					skills: safeGetStringArray(w, "skills"),
				};
			})
			.filter((w) => w.company.length > 0)
		: [];

	// Skills
	const skillsItems = professionalRaw.skills;
	const skills: Skill[] = Array.isArray(skillsItems)
		? skillsItems
			.map((item): Skill => {
				const s = item as Record<string, unknown>;
				const name = safeGetString(s, "name") || "";
				if (name.length === 0) return { name: "" };
				return {
					name,
					category: safeGetString(s, "category"),
					level: parseLevel(safeGetString(s, "level") || ""),
				};
			})
			.filter((s) => s.name.length > 0)
		: [];

	// Certifications
	const certItems = professionalRaw.certifications;
	const certifications: Certification[] = Array.isArray(certItems)
		? certItems
			.map((item): Certification => {
				const c = item as Record<string, unknown>;
				return {
					name: safeGetString(c, "name") || "",
					issuer: safeGetString(c, "issuer"),
					issueDate: safeGetDate(c, "issueDate"),
					expiryDate: safeGetDate(c, "expiryDate"),
					credentialId: safeGetString(c, "credentialId"),
					credentialUrl: safeGetString(c, "credentialUrl"),
				};
			})
			.filter((c) => c.name.length > 0)
		: [];

	// Projects
	const projItems = professionalRaw.projects;
	const projects: Project[] = Array.isArray(projItems)
		? projItems
			.map((item): Project => {
				const proj = item as Record<string, unknown>;
				return {
					name: safeGetString(proj, "name") || "",
					description: safeGetString(proj, "description"),
					role: safeGetString(proj, "role"),
					startDate: safeGetDate(proj, "startDate"),
					endDate: safeGetDate(proj, "endDate"),
					skills: safeGetStringArray(proj, "skills"),
					url: safeGetString(proj, "url"),
					repositoryUrl: safeGetString(proj, "repositoryUrl"),
				};
			})
			.filter((p) => p.name.length > 0)
		: [];

	// Languages
	const langItems = professionalRaw.languages;
	const languages: Language[] = Array.isArray(langItems)
		? langItems
			.map((item): Language => {
				const lang = item as Record<string, unknown>;
				const name = safeGetString(lang, "name") || "";
				if (name.length === 0) return { name: "" };
				const profStr =
					lang.proficiency && typeof lang.proficiency === "string"
						? lang.proficiency.toLowerCase()
						: undefined;
				const proficiency = profStr
					? (["basic", "conversational", "professional", "fluent", "native"].includes(profStr)
						? (profStr as "basic" | "conversational" | "professional" | "fluent" | "native")
						: undefined)
					: undefined;
				return { name, proficiency };
			})
			.filter((l) => l.name.length > 0)
		: [];

	// Salary expectation
	const salary = workPrefsRaw.salaryExpectation;
	const salaryIsObject =
		salary && typeof salary === "object" && salary !== null;
	const minSalary = salaryIsObject
		? Number((salary as Record<string, unknown>).minimum) || 0
		: 0;
	const maxSalary = salaryIsObject
		? Number((salary as Record<string, unknown>).maximum) || 0
		: 0;
	const currency = salaryIsObject
		? (safeGetString(salary as Record<string, unknown>, "currency") || "USD")
		: "USD";

	const profile: Profile = {
		personal: {
			fullName: safeGetString(personalRaw, "fullName") || "",
			preferredName: safeGetString(personalRaw, "preferredName"),
			email: safeGetString(personalRaw, "email"),
			phone: safeGetString(personalRaw, "phone"),
			location: {
				city: safeGetString(locationRaw, "city"),
				country: safeGetString(locationRaw, "country"),
			},
			links: {
				linkedin: safeGetString(linksRaw, "linkedin"),
				github: safeGetString(linksRaw, "github"),
				portfolio: safeGetString(linksRaw, "portfolio"),
				other: safeGetStringArray(linksRaw, "other"),
			},
		},
		professional: {
			headline: safeGetString(professionalRaw, "headline"),
			summary: safeGetString(professionalRaw, "summary"),
			education,
			workExperience,
			skills,
			certifications,
			projects,
			languages,
		},
		interests: {
			personal: safeGetStringArray(interestsRaw, "personal"),
			professional: safeGetStringArray(interestsRaw, "professional"),
		},
		workPreferences: {
			workModes: safeGetStringArray(workPrefsRaw, "workModes")
				.map((m) => m.toLowerCase() as WorkMode),
			employmentTypes: safeGetStringArray(workPrefsRaw, "employmentTypes")
				.map((t) => t.toLowerCase() as EmploymentType),
			preferredRoles: safeGetStringArray(workPrefsRaw, "preferredRoles"),
			preferredIndustries: safeGetStringArray(workPrefsRaw, "preferredIndustries"),
			preferredLocations: safeGetStringArray(workPrefsRaw, "preferredLocations"),
			willingToRelocate: workPrefsRaw.willingToRelocate === true,
			salaryExpectation: {
				minimum: minSalary,
				maximum: maxSalary,
				currency,
			},
			availability: safeGetString(workPrefsRaw, "availability"),
		},
	};

	return profile;
}