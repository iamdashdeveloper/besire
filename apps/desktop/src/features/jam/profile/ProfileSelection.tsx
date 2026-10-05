import { useNavigate } from "react-router-dom";
import type { Profile } from "../../../../backend/db/models/profile";

interface ProfileSelectionProps {
	profiles: Profile[];
	onSelectProfile: (profile: Profile) => void;
	onCreateNew: () => void;
}

export function ProfileSelection({
	profiles,
	onSelectProfile,
	onCreateNew,
}: ProfileSelectionProps) {
	const navigate = useNavigate();

	return (
		<main className="flex min-h-screen flex-col items-center justify-center p-8">
			<div className="w-full max-w-4xl space-y-8">
				<div className="text-center space-y-3">
					<h1 className="text-3xl font-semibold tracking-tight">Select a Profile</h1>
					<p className="text-muted-foreground text-sm leading-relaxed">
						Choose a profile to continue with JAM, or create a new one.
					</p>
				</div>

				<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
					{profiles.map((p) => (
						<button
							key={p._id}
							className="text-left border rounded-lg p-6 hover:border-primary transition-colors"
							onClick={() => {
								onSelectProfile(p);
								navigate("/dashboard");
							}}
						>
							<div className="space-y-3">
								<div>
									<h3 className="font-semibold text-base">
										{p.personal?.fullName || "Untitled Profile"}
									</h3>
									{p.personal?.preferredName && (
										<p className="text-sm text-muted-foreground">
											{p.personal.preferredName}
										</p>
									)}
								</div>

								{p.professional?.headline && (
									<p className="text-sm text-muted-foreground line-clamp-2">
										{p.professional.headline}
									</p>
								)}

								{p.personal?.location?.city && (
									<div className="flex items-center gap-1 text-sm text-muted-foreground">
										<span>📍</span>
										<span>
											{p.personal.location.city}
											{p.personal.location.country && `, ${p.personal.location.country}`}
										</span>
									</div>
								)}

								<div className="flex flex-wrap gap-1 pt-2">
									{p.personal?.email && (
										<span className="text-xs bg-muted px-2 py-1 rounded">
											{p.personal.email}
										</span>
									)}
									{p.personal?.phone && (
										<span className="text-xs bg-muted px-2 py-1 rounded">
											{p.personal.phone}
										</span>
									)}
								</div>
							</div>
						</button>
					))}

					<button
						className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center text-muted-foreground hover:border-primary hover:text-foreground transition-colors"
						onClick={() => {
							onCreateNew();
							navigate("/");
						}}
					>
						<span className="text-2xl mb-2">+</span>
						<span className="text-sm font-medium">Create New Profile</span>
					</button>
				</div>
			</div>
		</main>
	);
}