export type WorkMode = "remote" | "onsite" | "hybrid";

export type EmploymentType =
	| "full_time"
	| "part_time"
	| "contract"
	| "temporary"
	| "internship"
	| "freelance";

export interface Education {
	institution: string;
	qualification?: string;
	field?: string;

	startDate?: string;
	endDate?: string;

	status?: "completed" | "in_progress" | "paused";

	location?: string;
	description?: string;
}

export interface WorkExperience {
	company: string;
	role: string;

	employmentType?: EmploymentType | string;

	startDate?: string;
	endDate?: string;

	location?: string;
	workMode?: WorkMode;

	description?: string;
	achievements?: string[];

	skills?: string[];
}

export interface Skill {
	name: string;

	category?: string;

	level?: "beginner" | "intermediate" | "advanced" | "expert";
}

export interface Certification {
	name: string;
	issuer?: string;

	issueDate?: string;
	expiryDate?: string;

	credentialId?: string;
	credentialUrl?: string;
}

export interface Project {
	name: string;

	description?: string;

	role?: string;

	startDate?: string;
	endDate?: string;

	skills?: string[];

	url?: string;
	repositoryUrl?: string;
}

export interface Language {
	name: string;

	proficiency?:
		| "basic"
		| "conversational"
		| "professional"
		| "fluent"
		| "native";
}

export interface WorkPreferences {
	workModes: WorkMode[];

	employmentTypes: EmploymentType[];

	preferredRoles: string[];

	preferredIndustries: string[];

	preferredLocations: string[];

	willingToRelocate?: boolean;

	salaryExpectation?: {
		minimum?: number;
		maximum?: number;
		currency?: string;
	};

	availability?: string;
}

export interface Profile {
	_id?: string;

	[key: string]: unknown;

	personal: {
		fullName: string;
		preferredName?: string;
		email?: string;
		phone?: string;

		location?: {
			city?: string;
			country?: string;
		};

		links?: {
			linkedin?: string;
			github?: string;
			portfolio?: string;
			other?: string[];
		};
	};

	professional: {
		headline?: string;
		summary?: string;

		education: Education[];
		workExperience: WorkExperience[];
		skills: Skill[];
		certifications: Certification[];
		projects: Project[];
		languages: Language[];
	};

	interests: {
		personal: string[];
		professional: string[];
	};

	workPreferences: WorkPreferences;
}
