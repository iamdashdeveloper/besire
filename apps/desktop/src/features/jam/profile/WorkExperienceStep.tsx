import { Button } from "../../../components/ui/button";
import { Label } from "../../../components/ui/label";
import { Input } from "../../../components/ui/input";
import { Textarea } from "../../../components/ui/textarea";
import { RepeatingSection } from "./RepeatingSection";
import type { WorkExperience, Profile } from "../../../../backend/db/models/profile";

interface WorkExperienceStepProps {
	profile: Profile;
	onUpdate: (profile: Profile) => void;
	onNext: () => void;
	onPrevious: () => void;
}

export function WorkExperienceStep({
	profile,
	onUpdate,
	onNext,
	onPrevious,
}: WorkExperienceStepProps) {
	const workExp = profile.professional?.workExperience ?? [];

	const handleAdd = () => {
		const newEntry = {
			company: "",
			role: "",
			employmentType: undefined,
			startDate: "",
			endDate: "",
			location: "",
			workMode: undefined,
			description: "",
			achievements: [],
			skills: [],
		};
		onUpdate({
			...profile,
			professional: {
				...profile.professional,
				workExperience: [...workExp, newEntry],
			},
		});
	};

	const handleUpdate = (
		index: number,
		data: Partial<WorkExperience>
	) => {
		const updated = workExp.map((w, i) =>
			i === index ? { ...w, ...data } : w
		);
		onUpdate({
			...profile,
			professional: { ...profile.professional, workExperience: updated },
		});
	};

	const handleRemove = (index: number) => {
		const updated = workExp.filter((_, i) => i !== index);
		onUpdate({
			...profile,
			professional: { ...profile.professional, workExperience: updated },
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
					Work Experience
				</h2>
				<p className="text-sm text-muted-foreground">
					Your professional work history.
				</p>
			</div>

			<RepeatingSection
				title="Work Experience"
				description="Add your previous positions"
				onAdd={handleAdd}
				addLabel="Add Experience"
			>
				{workExp.length === 0 ? (
					<p className="text-sm text-muted-foreground py-4 text-center border border-dashed rounded-md">
						No work experience entries yet. Click "Add Experience" to get started.
					</p>
				) : (
					<div className="space-y-3">
{workExp.map((we, index) => (
	<div
		key={index}
		className="border rounded-md p-4 space-y-3 bg-card"
	>
		<div className="flex items-center justify-between mb-3">
			<span className="text-sm font-medium">
				Experience {index + 1}
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
		<div className="grid gap-4 md:grid-cols-2">
									<div className="space-y-1">
										<Label htmlFor={`company-${index}`} className="text-xs">
											Company *
										</Label>
										<Input
											id={`company-${index}`}
											value={we.company}
											onChange={(e) =>
												handleUpdate(index, { company: e.target.value })
											}
											placeholder="Acme Corp"
										/>
									</div>
									<div className="space-y-1">
										<Label htmlFor={`role-${index}`} className="text-xs">
											Role
										</Label>
										<Input
											id={`role-${index}`}
											value={we.role}
											onChange={(e) =>
												handleUpdate(index, { role: e.target.value })
											}
											placeholder="Senior Software Engineer"
										/>
									</div>
									<div className="space-y-1">
										<Label htmlFor={`employment-${index}`} className="text-xs">
											Employment Type
										</Label>
										<select
											id={`employment-${index}`}
											className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
										>
											<option value="">Select...</option>
											<option value="full_time">Full Time</option>
											<option value="part_time">Part Time</option>
											<option value="contract">Contract</option>
											<option value="temporary">Temporary</option>
											<option value="internship">Internship</option>
											<option value="freelance">Freelance</option>
										</select>
									</div>
									<div className="space-y-1">
										<Label htmlFor={`start-${index}`} className="text-xs">
											Start Date
										</Label>
										<Input
											id={`start-${index}`}
											type="date"
											value={we.startDate || ""}
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
											value={we.endDate || ""}
											onChange={(e) =>
												handleUpdate(index, { endDate: e.target.value })
											}
										/>
									</div>
									<div className="space-y-1">
										<Label htmlFor={`location-${index}`} className="text-xs">
											Location
										</Label>
										<Input
											id={`location-${index}`}
											value={we.location || ""}
											onChange={(e) =>
												handleUpdate(index, { location: e.target.value })
											}
											placeholder="San Francisco, CA"
										/>
									</div>
									<div className="space-y-1">
										<Label htmlFor={`workmode-${index}`} className="text-xs">
											Work Mode
										</Label>
										<select
											id={`workmode-${index}`}
											className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
										>
											<option value="">Select...</option>
											<option value="remote">Remote</option>
											<option value="onsite">Onsite</option>
											<option value="hybrid">Hybrid</option>
										</select>
									</div>
									<div className="space-y-1">
										<Label htmlFor={`desc-${index}`} className="text-xs">
											Description
										</Label>
										<Textarea
											id={`desc-${index}`}
											value={we.description || ""}
											onChange={(e) =>
												handleUpdate(index, { description: e.target.value })
											}
											className="min-h-[60px]"
										/>
									</div>
									<div className="space-y-1">
										<Label htmlFor={`skills-${index}`} className="text-xs">
											Skills Used
										</Label>
										<Input
											id={`skills-${index}`}
											type="text"
											value={we.skills?.join(", ") || ""}
											onChange={(e) =>
												handleUpdate(index, {
													skills: e.target.value
														.split(",")
														.map((s) => s.trim())
														.filter(Boolean),
												})
											}
											placeholder="JavaScript, React, TypeScript"
										/>
									</div>
									<div className="space-y-1">
										<Label htmlFor={`achievements-${index}`} className="text-xs">
											Achievements
										</Label>
										<Textarea
											id={`achievements-${index}`}
											value={we.achievements?.join("\n") || ""}
											onChange={(e) =>
												handleUpdate(index, {
													achievements: e.target.value.split("\n").filter(Boolean),
												})
											}
											className="min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
										/>
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