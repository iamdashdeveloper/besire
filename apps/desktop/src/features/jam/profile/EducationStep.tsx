import { Button } from "../../../components/ui/button";
import { Label } from "../../../components/ui/label";
import { Input } from "../../../components/ui/input";
import { Textarea } from "../../../components/ui/textarea";
import { RepeatingSection } from "./RepeatingSection";
import type { Education, Profile } from "../../../../backend/db/models/profile";

interface EducationStepProps {
	profile: Profile;
	onUpdate: (profile: Profile) => void;
	onNext: () => void;
	onPrevious: () => void;
}

export function EducationStep({
	profile,
	onUpdate,
	onNext,
	onPrevious,
}: EducationStepProps) {
	const education = profile.professional?.education ?? [];

	const handleAdd = () => {
		const newEducation: Education = {
			institution: "",
			qualification: "",
			field: "",
			startDate: "",
			endDate: "",
			status: "in_progress",
			location: "",
			description: "",
		};
		onUpdate({
			...profile,
			professional: {
				...profile.professional,
				education: [...education, newEducation],
			},
		});
	};

	const handleUpdate = (index: number, data: Partial<Education>) => {
		const updated = education.map((e, i) =>
			i === index ? { ...e, ...data } : e
		);
		onUpdate({
			...profile,
			professional: { ...profile.professional, education: updated },
		});
	};

	const handleRemove = (index: number) => {
		const updated = education.filter((_, i) => i !== index);
		onUpdate({
			...profile,
			professional: { ...profile.professional, education: updated },
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
					Education
				</h2>
				<p className="text-sm text-muted-foreground">
					Your academic background.
				</p>
			</div>

			<RepeatingSection
				title="Education"
				description="Add your degrees and certifications"
				onAdd={handleAdd}
				addLabel="Add Education"
			>
				{education.length === 0 ? (
					<p className="text-sm text-muted-foreground py-4 text-center border border-dashed rounded-md">
						No education entries yet. Click "Add Education" to get started.
					</p>
				) : (
					<div className="space-y-3">
						{education.map((edu, index) => (
							<div
								key={index}
								className="border rounded-md p-4 space-y-3 bg-card"
							>
								<div className="flex items-center justify-between">
									<span className="text-sm font-medium">
										Entry {index + 1}
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

								<div className="grid gap-3 md:grid-cols-2">
									<div className="space-y-1">
										<Label htmlFor={`inst-${index}`} className="text-xs">
											Institution *
										</Label>
										<Input
											id={`inst-${index}`}
											value={edu.institution}
											onChange={(e) =>
												handleUpdate(index, { institution: e.target.value })
											}
											placeholder="University of Example"
										/>
									</div>
									<div className="space-y-1">
										<Label htmlFor={`qual-${index}`} className="text-xs">
											Qualification
										</Label>
										<Input
											id={`qual-${index}`}
											value={edu.qualification || ""}
											onChange={(e) =>
												handleUpdate(index, { qualification: e.target.value })
											}
											placeholder="Bachelor of Science"
										/>
									</div>
									<div className="space-y-1">
										<Label htmlFor={`field-${index}`} className="text-xs">
											Field of Study
										</Label>
										<Input
											id={`field-${index}`}
											value={edu.field || ""}
											onChange={(e) =>
												handleUpdate(index, { field: e.target.value })
											}
											placeholder="Computer Science"
										/>
									</div>
									<div className="space-y-1">
										<Label htmlFor={`status-${index}`} className="text-xs">
											Status
										</Label>
										<select
											id={`status-${index}`}
											value={edu.status || "in_progress"}
											onChange={(e) =>
												handleUpdate(index, {
													status: e.target.value as "completed" | "in_progress" | "paused",
												})
											}
											className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
										>
											<option value="in_progress">In Progress</option>
											<option value="completed">Completed</option>
											<option value="paused">Paused</option>
										</select>
									</div>
									<div className="space-y-1">
										<Label htmlFor={`start-${index}`} className="text-xs">
											Start Date
										</Label>
										<Input
											id={`start-${index}`}
											type="date"
											value={edu.startDate || ""}
											onChange={(e) =>
												handleUpdate(index, { startDate: e.target.value })
											}
										/>
									</div>
									<div className="space-y-1">
										<Label htmlFor={`end-${index}`} className="text-xs">
											End Date
										</Label>
										<Input
											id={`end-${index}`}
											type="date"
											value={edu.endDate || ""}
											onChange={(e) =>
												handleUpdate(index, { endDate: e.target.value })
											}
										/>
									</div>
									<div className="space-y-1">
										<Label htmlFor={`loc-${index}`} className="text-xs">
											Location
										</Label>
										<Input
											id={`loc-${index}`}
											value={edu.location || ""}
											onChange={(e) =>
												handleUpdate(index, { location: e.target.value })
											}
											placeholder="City, Country"
										/>
									</div>
								</div>
								<div className="space-y-1">
									<Label htmlFor={`desc-${index}`} className="text-xs">
										Description
									</Label>
									<Textarea
										id={`desc-${index}`}
										value={edu.description || ""}
										onChange={(e) =>
											handleUpdate(index, { description: e.target.value })
										}
										placeholder="Relevant details..."
										className="min-h-[60px]"
									/>
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