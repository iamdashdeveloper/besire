import { useState, useCallback } from "react";
import type { Profile } from "../../../../backend/db/models/profile";

function createEmptyProfile(): Profile {
	return {
		personal: {
			fullName: "",
			preferredName: "",
			email: "",
			phone: "",
			location: { city: "", country: "" },
			links: { linkedin: "", github: "", portfolio: "", other: [] },
		},
		professional: {
			headline: "",
			summary: "",
			education: [],
			workExperience: [],
			skills: [],
			certifications: [],
			projects: [],
			languages: [],
		},
		interests: { personal: [], professional: [] },
		workPreferences: {
			workModes: [],
			employmentTypes: [],
			preferredRoles: [],
			preferredIndustries: [],
			preferredLocations: [],
			willingToRelocate: false,
			salaryExpectation: { minimum: 0, maximum: 0, currency: "USD" },
			availability: "",
		},
	};
}

export function useProfileForm(initialProfile?: Partial<Profile>) {
	const [profile, setProfile] = useState<Profile>(() => {
		if (!initialProfile) return createEmptyProfile();
		const merged = createEmptyProfile();
		return { ...merged, ...initialProfile } as Profile;
	});

	const updatePersonal = useCallback(
		(data: Partial<Profile["personal"]>) => {
			setProfile((prev) => ({
				...prev,
				personal: { ...prev.personal, ...data },
			}));
		},
		[]
	);

	const updateProfessional = useCallback(
		(data: Partial<Profile["professional"]>) => {
			setProfile((prev) => ({
				...prev,
				professional: { ...prev.professional, ...data },
			}));
		},
		[]
	);

	const updateWorkPreferences = useCallback(
		(data: Partial<Profile["workPreferences"]>) => {
			setProfile((prev) => ({
				...prev,
				workPreferences: { ...prev.workPreferences, ...data },
			}));
		},
		[]
	);

	const updateInterests = useCallback(
		(data: Partial<Profile["interests"]>) => {
			setProfile((prev) => ({
				...prev,
				interests: { ...prev.interests, ...data },
			}));
		},
		[]
	);

	const reset = useCallback(() => {
		setProfile(createEmptyProfile());
	}, []);

	return {
		profile,
		setProfile,
		updatePersonal,
		updateProfessional,
		updateWorkPreferences,
		updateInterests,
		reset,
	};
}