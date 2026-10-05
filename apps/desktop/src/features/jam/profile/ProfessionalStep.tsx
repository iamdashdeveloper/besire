import type { Profile } from "../../../../backend/db/models/profile";
import { Button } from "../../../components/ui/button";
import { Label } from "../../../components/ui/label";

interface ProfessionalStepProps {
	profile: Profile;
	onUpdate: (profile: Profile) => void;
	onNext: () => void;
	onPrevious: () => void;
}

export function ProfessionalStep({
	profile,
	onUpdate,
	onNext,
	onPrevious,
}: ProfessionalStepProps) {
	const localData = profile.professional ?? {
		headline: "",
		summary: "",
		education: [],
		workExperience: [],
		skills: [],
		certifications: [],
		projects: [],
		languages: [],
	};

	const handleChange = (
		field: keyof typeof localData,
		value: string
	) => {
		onUpdate({
			...profile,
			professional: { ...localData, [field]: value },
		});
	};

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		onNext();
	};

	return (
		<form onSubmit={handleSubmit} className="space-y-8">
			<div className="space-y-2">
				<h2 className="text-2xl font-semibold tracking-tight">
					Professional Summary
				</h2>
				<p className="text-sm text-muted-foreground">
					A brief overview of your professional identity.
				</p>
			</div>

			<div className="grid gap-4 md:grid-cols-1">
				<div className="space-y-2">
					<Label htmlFor="headline" className="text-sm font-medium">
						Professional Headline
					</Label>
					<input
						id="headline"
						type="text"
						value={localData.headline || ""}
						onChange={(e) => handleChange("headline", e.target.value)}
						placeholder="Senior Software Engineer at TechCorp"
						className="flex h-9 w-full rounded-none border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
					/>
				</div>

				<div className="space-y-2">
					<Label htmlFor="summary" className="text-sm font-medium">
						Professional Summary
					</Label>
					<textarea
						id="summary"
						value={localData.summary || ""}
						onChange={(e) => handleChange("summary", e.target.value)}
						placeholder="A brief description of your professional background and goals..."
						className="flex min-h-[120px] w-full rounded-none border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
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
