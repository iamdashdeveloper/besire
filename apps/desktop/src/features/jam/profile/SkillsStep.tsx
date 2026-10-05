import { Button } from "../../../components/ui/button";
import { Label } from "../../../components/ui/label";
import { Input } from "../../../components/ui/input";
import { RepeatingSection } from "./RepeatingSection";
import type { Profile, Skill } from "../../../../backend/db/models/profile";

interface SkillsStepProps {
	profile: Profile;
	onUpdate: (profile: Profile) => void;
	onNext: () => void;
	onPrevious: () => void;
}

export function SkillsStep({
	profile,
	onUpdate,
	onNext,
	onPrevious,
}: SkillsStepProps) {
	const skills = profile.professional?.skills ?? [];

	const handleAdd = () => {
		onUpdate({
			...profile,
			professional: {
				...profile.professional,
				skills: [...skills, { name: "", category: "", level: "intermediate" }],
			},
		});
	};

	const handleUpdate = (index: number, data: Partial<Skill>) => {
		const updated = skills.map((s, i) =>
			i === index ? { ...s, ...data } : s
		);
		onUpdate({
			...profile,
			professional: { ...profile.professional, skills: updated },
		});
	};

	const handleRemove = (index: number) => {
		const updated = skills.filter((_, i) => i !== index);
		onUpdate({
			...profile,
			professional: { ...profile.professional, skills: updated },
		});
	};

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		onNext();
	};

	return (
		<form onSubmit={handleSubmit} className="space-y-6">
			<div className="space-y-2">
				<h2 className="text-2xl font-semibold tracking-tight">Skills</h2>
				<p className="text-sm text-muted-foreground">
					Your technical and professional skills.
				</p>
			</div>

			<RepeatingSection
				title="Skills"
				description="Add your skills and proficiency levels"
				onAdd={handleAdd}
				addLabel="Add Skill"
			>
				{skills.length === 0 ? (
					<p className="text-sm text-muted-foreground py-4 text-center border border-dashed rounded-md">
						No skills added yet. Click "Add Skill" to get started.
					</p>
				) : (
					<div className="space-y-3">
						{skills.map((skill, index) => (
							<div
								key={index}
								className="border rounded-md p-4 space-y-3 bg-card"
							>
								<div className="flex items-center justify-between">
									<span className="text-sm font-medium">
										Skill {index + 1}
									</span>
									<Button
										type="button"
										variant="ghost"
										size="sm"
										className="text-destructive hover:text-destructive"
										onClick={() => handleRemove(index)}
									>
										Remove
									</Button>
								</div>

								<div className="grid gap-3 md:grid-cols-3">
									<div className="space-y-1">
										<Label htmlFor={`name-${index}`} className="text-xs">
											Skill Name *
										</Label>
										<Input
											id={`name-${index}`}
											value={skill.name}
											onChange={(e) =>
												handleUpdate(index, { name: e.target.value })
											}
											placeholder="React"
										/>
									</div>
									<div className="space-y-1">
										<Label htmlFor={`category-${index}`} className="text-xs">
											Category
										</Label>
										<Input
											id={`category-${index}`}
											value={skill.category || ""}
											onChange={(e) =>
												handleUpdate(index, { category: e.target.value })
											}
											placeholder="Frontend"
										/>
									</div>
									<div className="space-y-1">
										<Label htmlFor={`level-${index}`} className="text-xs">
											Level
										</Label>
										<select
											id={`level-${index}`}
											value={skill.level || "intermediate"}
											onChange={(e) =>
												handleUpdate(index, {
													level: e.target.value as any,
												})
											}
											className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
										>
											<option value="beginner">Beginner</option>
											<option value="intermediate">Intermediate</option>
											<option value="advanced">Advanced</option>
											<option value="expert">Expert</option>
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