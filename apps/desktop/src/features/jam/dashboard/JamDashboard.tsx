import { useNavigate } from "react-router-dom";
import type { Profile } from "../../../../backend/db/models/profile";
import { Button } from "../../../components/ui/button";

interface JamDashboardProps {
	profile: Profile;
	onSwitchProfile: () => void;
	onEditProfile: () => void;
}

export function JamDashboard({
	profile,
	onSwitchProfile,
	onEditProfile,
}: JamDashboardProps) {
	const navigate = useNavigate();

	return (
		<div className="flex h-screen">
			<aside className="w-64 border-r bg-sidebar text-sidebar-foreground flex flex-col">
				<div className="p-6 border-b">
					<h1 className="font-semibold text-lg">JAM</h1>
					<p className="text-sm text-muted-foreground">Dashboard</p>
				</div>

				<nav className="flex-1 p-4 space-y-2">
					<Button
						variant="outline"
						className="w-full justify-start"
						onClick={() => {
							onSwitchProfile();
							navigate("/profiles");
						}}
					>
						Switch Profile
					</Button>
					<Button
						variant="outline"
						className="w-full justify-start"
						onClick={() => {
							onEditProfile();
							navigate("/profile");
						}}
					>
						Edit Profile
					</Button>
				</nav>
			</aside>

			<main className="flex-1 overflow-auto p-8">
				<div className="max-w-4xl space-y-8">
					<div className="space-y-2">
						<h2 className="text-3xl font-semibold tracking-tight">
							{profile.personal?.fullName || "Untitled Profile"}
						</h2>
						{profile.professional?.headline && (
							<p className="text-muted-foreground text-lg">
								{profile.professional.headline}
							</p>
						)}
						{profile.personal?.location?.city && (
							<p className="text-sm text-muted-foreground">
								{profile.personal?.location?.city}
								{profile.personal?.location?.country && `, ${profile.personal.location.country}`}
							</p>
						)}
					</div>

					<div className="border rounded-lg p-6 space-y-4">
						<h3 className="font-semibold">Profile Summary</h3>
						<div className="grid grid-cols-2 gap-4 text-sm">
							<div>
								<p className="text-muted-foreground">Email</p>
								<p>{profile.personal?.email || "Not provided"}</p>
							</div>
							<div>
								<p className="text-muted-foreground">Phone</p>
								<p>{profile.personal?.phone || "Not provided"}</p>
							</div>
							<div>
								<p className="text-muted-foreground">Experience</p>
								<p>{profile.professional?.workExperience?.length || 0} roles</p>
							</div>
							<div>
								<p className="text-muted-foreground">Skills</p>
								<p>{profile.professional?.skills?.length || 0} skills</p>
							</div>
						</div>
					</div>
				</div>
			</main>
		</div>
	);
}