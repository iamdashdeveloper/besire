import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import type { Profile } from "../../../../backend/db/models/profile";

interface InterestsStepProps {
	profile: Profile;
	onUpdate: (profile: Profile) => void;
	onNext: () => void;
	onPrevious: () => void;
}

export function InterestsStep({
	profile,
	onUpdate,
	onNext,
	onPrevious,
}: InterestsStepProps) {
	const interests = profile.interests ?? { personal: [], professional: [] };

	const handleUpdateInterests = (
		type: "personal" | "professional",
		value: string
	) => {
		onUpdate({
			...profile,
			interests: {
				...profile.interests,
				[type]: typeof value === "string"
					? value.split(",").map((s) => s.trim()).filter(Boolean)
					: value || [],
			},
		});
	};

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		onNext();
	};

	return (
		<form onSubmit={handleSubmit} className="space-y-6">
			<div className="space-y-2">
				<h2 className="text-2xl font-semibold tracking-tight">
					Interests
				</h2>
				<p className="text-sm text-muted-foreground">
					Your personal and professional interests.
				</p>
			</div>

			<div className="space-y-6">
				<div>
					<h3 className="text-sm font-medium">Personal Interests</h3>
					<p className="text-xs text-muted-foreground">
						Hobbies, activities, and things you enjoy outside of work.
					</p>
					<Input
						type="text"
						value={interests.personal.join(", ")}
						onChange={(e) =>
							handleUpdateInterests("personal", e.target.value)
						}
						placeholder="Hiking, photography, chess"
					/>
				</div>

				<div>
					<h3 className="text-sm font-medium">Professional Interests</h3>
					<p className="text-xs text-muted-foreground">
						Industry topics, technologies, or domains you're interested in professionally.
					</p>
					<Input
						type="text"
						value={interests.professional.join(", ")}
						onChange={(e) =>
							handleUpdateInterests("professional", e.target.value)
						}
						placeholder="Machine learning, distributed systems, AI ethics"
					/>
				</div>
			</div>

			<div className="flex justify-between pt-4">
				<Button type="button" variant="outline" onClick={onPrevious}>
					Previous
				</Button>
				<Button type="submit">Next</Button>
			</div>
		</form>
	);
}