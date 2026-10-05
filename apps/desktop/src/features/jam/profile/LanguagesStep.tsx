import { Button } from "../../../components/ui/button";
import { Label } from "../../../components/ui/label";
import { Input } from "../../../components/ui/input";
import { RepeatingSection } from "./RepeatingSection";
import type { Profile } from "../../../../backend/db/models/profile";

interface LanguagesStepProps {
	profile: Profile;
	onUpdate: (profile: Profile) => void;
	onNext: () => void;
	onPrevious: () => void;
}

export function LanguagesStep({
	profile,
	onUpdate,
	onNext,
	onPrevious,
}: LanguagesStepProps) {
	const languages = profile.professional?.languages ?? [];

	const handleAdd = () => {
		onUpdate({
			...profile,
			professional: {
				...profile.professional,
				languages: [...languages, { name: "", proficiency: "conversational" }],
			},
		});
	};

	const handleUpdate = (index: number, data: any) => {
		const updated = languages.map((l, i) =>
			i === index ? { ...l, ...data } : l
		);
		onUpdate({
			...profile,
			professional: { ...profile.professional, languages: updated },
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
					Languages
				</h2>
				<p className="text-sm text-muted-foreground">
					Languages you speak and your proficiency level.
				</p>
			</div>

			<RepeatingSection
				title="Languages"
				description="Add languages you speak"
				onAdd={handleAdd}
				addLabel="Add Language"
			>
				{languages.length === 0 ? (
					<p className="text-sm text-muted-foreground py-4 text-center border border-dashed rounded-md">
						No languages added yet. Click "Add Language" to get started.
					</p>
				) : (
					<div className="space-y-3">
						{languages.map((lang, index) => (
							<div
								key={index}
								className="border rounded-md p-4 space-y-3 bg-card"
							>
								<div className="grid gap-3 md:grid-cols-2">
									<div className="space-y-1">
										<Label htmlFor={`name-${index}`} className="text-xs">
											Language *
										</Label>
										<Input
											id={`name-${index}`}
											value={lang.name}
											onChange={(e) =>
												handleUpdate(index, { name: e.target.value })
											}
											placeholder="English"
										/>
									</div>
									<div className="space-y-1">
										<Label htmlFor={`prof-${index}`} className="text-xs">
											Proficiency
										</Label>
										<select
											id={`prof-${index}`}
											value={lang.proficiency || "conversational"}
											onChange={(e) =>
												handleUpdate(index, {
													proficiency: e.target.value as any,
												})
											}
											className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
										>
											<option value="basic">Basic</option>
											<option value="conversational">Conversational</option>
											<option value="professional">Professional</option>
											<option value="fluent">Fluent</option>
											<option value="native">Native</option>
										</select>
									</div>
								</div>
							</div>
						))}
					</div>
				)}
			</RepeatingSection>

			<div className="flex justify-between pt-4">
				<Button type="button" variant="outline" onClick={onPrevious}>
					Previous
				</Button>
				<Button type="submit">Next</Button>
			</div>
		</form>
	);
}