import { useState, useEffect } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import type { Profile } from "../backend/db/models/profile";
import { ProfileLanding } from "./features/jam/profile/ProfileLanding";
import { ProfileStepper } from "./features/jam/profile/ProfileStepper";
import { ProfileSelection } from "./features/jam/profile/ProfileSelection";
import { JamDashboard } from "./features/jam/dashboard/JamDashboard";
import { createProfile, getProfile, updateProfile, listProfiles } from "./services/profile/api";
import { importProfileFromResume, ProfileImportError } from "./features/jam/profile/resume";
import "./App.css";

function App() {
	const navigate = useNavigate();
	const [view, setView] = useState<"landing" | "stepper" | "profileSelection" | "dashboard">("landing");
	const [profile, setProfile] = useState<Profile | null>(null);
	const [profiles, setProfiles] = useState<Profile[]>([]);
	const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
	const [isImporting, setIsImporting] = useState(false);
	const [importError, setImportError] = useState<string | null>(null);

	async function loadProfiles() {
		try {
			const allProfiles = await listProfiles();
			setProfiles(allProfiles);
		} catch (error) {
			console.error("Failed to load profiles:", error);
		}
	}

	async function loadProfile() {
		try {
			const existing = await getProfile();
			setProfile(existing);
		} catch (error) {
			console.error("Failed to load profile:", error);
		}
	}

	const handleCreateManual = () => {
		loadProfile();
		setView("stepper");
		navigate("/profile");
	};

	const handleImportResume = async () => {
		setIsImporting(true);
		setImportError(null);
		try {
			const file = await selectResumeFile();
			if (!file) {
				setIsImporting(false);
				return;
			}

			const importedProfile = await importProfileFromResume(file);
			await loadProfile();
			setProfile(importedProfile);
			setView("stepper");
			navigate("/profile");
		} catch (error) {
			if (error instanceof ProfileImportError) {
				setImportError(error.message);
			} else {
				setImportError((error as Error).message || "Failed to import resume");
			}
		} finally {
			setIsImporting(false);
		}
	};

	async function selectResumeFile(): Promise<File | null> {
		return new Promise((resolve) => {
			const input = document.createElement("input");
			input.type = "file";
			input.accept = ".docx,.pdf";
			input.onchange = (e) => {
				const file = (e.target as HTMLInputElement).files?.[0];
				resolve(file || null);
			};
			input.oncancel = () => resolve(null);
			input.click();
		});
	}

	const handleSave = async (_profile: Profile) => {
		if (!profile?._id) {
			await createProfile(_profile);
		} else {
			await updateProfile(profile._id, _profile);
		}
		const existing = await getProfile();
		setProfile(existing);
		await loadProfiles();
		setSelectedProfile(existing);
		setView("dashboard");
		navigate("/dashboard");
	};

	function handleSelectProfile(p: Profile) {
		setSelectedProfile(p);
		setView("dashboard");
		navigate("/dashboard");
	}

	function handleSwitchProfile() {
		setView("profileSelection");
		navigate("/profiles");
	}

	function handleEditProfile() {
		setProfile(selectedProfile);
		setView("stepper");
		navigate("/profile");
	}

	const handleCreateNew = () => {
		setView("landing");
		navigate("/");
	};

	useEffect(() => {
		loadProfiles();
	}, []);

	return (
		<>
			{view === "landing" && (
				<ProfileLanding
					onCreateManual={handleCreateManual}
					onImportResume={handleImportResume}
				/>
			)}
			{view === "profileSelection" && (
				<ProfileSelection
					profiles={profiles}
					onSelectProfile={handleSelectProfile}
					onCreateNew={handleCreateNew}
				/>
			)}
			{view === "stepper" && (
				<ProfileStepper
					onSave={handleSave}
					initialProfile={profile as Partial<Profile>}
				/>
			)}
			{view === "dashboard" && selectedProfile && (
				<JamDashboard
					profile={selectedProfile}
					onSwitchProfile={handleSwitchProfile}
					onEditProfile={handleEditProfile}
				/>
			)}
			{isImporting && (
				<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
					<div className="bg-background border rounded-lg p-6 shadow-lg">
						<p>Importing resume...</p>
					</div>
				</div>
			)}
			{importError && (
				<div className="fixed bottom-4 right-4 bg-destructive text-destructive-foreground px-4 py-2 rounded-md shadow-lg z-50">
					{importError}
				</div>
			)}
		</>
	);
}

export default App;