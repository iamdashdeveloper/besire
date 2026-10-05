import { Button } from "../../../components/ui/button";
import { Label } from "../../../components/ui/label";
import { Input } from "../../../components/ui/input";
import { Textarea } from "../../../components/ui/textarea";
import { RepeatingSection } from "./RepeatingSection";
import type { Project, Profile } from "../../../../backend/db/models/profile";

interface ProjectsStepProps {
	profile: Profile;
	onUpdate: (profile: Profile) => void;
	onNext: () => void;
	onPrevious: () => void;
}

export function ProjectsStep({
	profile,
	onUpdate,
	onNext,
	onPrevious,
}: ProjectsStepProps) {
	const projects = profile.professional?.projects ?? [];

	const handleAdd = () => {
		const newEntry: Project = {
			name: "",
			description: "",
			role: "",
			startDate: "",
			endDate: "",
			skills: [],
			url: "",
			repositoryUrl: "",
		};
		onUpdate({
			...profile,
			professional: {
				...profile.professional,
				projects: [...projects, newEntry],
			},
		});
	};

	const handleUpdate = (index: number, data: Partial<Project>) => {
		const updated = projects.map((p, i) =>
			i === index ? { ...p, ...data } : p
		);
		onUpdate({
			...profile,
			professional: { ...profile.professional, projects: updated },
		});
	};

	const handleRemove = (index: number) => {
		const updated = projects.filter((_, i) => i !== index);
		onUpdate({
			...profile,
			professional: { ...profile.professional, projects: updated },
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
					Projects
				</h2>
				<p className="text-sm text-muted-foreground">
					Personal or professional projects.
				</p>
			</div>

			<RepeatingSection
				title="Projects"
				description="Add your notable projects"
				onAdd={handleAdd}
				addLabel="Add Project"
			>
				{projects.length === 0 ? (
					<p className="text-sm text-muted-foreground py-4 text-center border border-dashed rounded-md">
						No projects added yet. Click "Add Project" to get started.
					</p>
				) : (
					<div className="space-y-3">
						{projects.map((project, index) => (
							<div
								key={index}
								className="border rounded-md p-4 space-y-3 bg-card"
							>
								<div className="flex items-center justify-between">
									<span className="text-sm font-medium">
										Project {index + 1}
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
										<Label htmlFor={`name-${index}`} className="text-xs">
											Name *
										</Label>
										<Input
											id={`name-${index}`}
											value={project.name}
											onChange={(e) =>
												handleUpdate(index, { name: e.target.value })
											}
											placeholder="My Awesome App"
										/>
									</div>
									<div className="space-y-1">
										<Label htmlFor={`role-${index}`} className="text-xs">
											Role
										</Label>
										<Input
											id={`role-${index}`}
											value={project.role || ""}
											onChange={(e) =>
												handleUpdate(index, { role: e.target.value })
											}
											placeholder="Lead Developer"
										/>
									</div>
									<div className="space-y-1">
										<Label htmlFor={`start-${index}`} className="text-xs">
											Start Date
										</Label>
										<Input
											id={`start-${index}`}
											type="date"
											value={project.startDate || ""}
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
											value={project.endDate || ""}
											onChange={(e) =>
												handleUpdate(index, { endDate: e.target.value })
											}
										/>
									</div>
									<div className="space-y-1">
										<Label htmlFor={`url-${index}`} className="text-xs">
											Project URL
										</Label>
										<Input
											id={`url-${index}`}
											type="url"
											value={project.url || ""}
											onChange={(e) =>
												handleUpdate(index, { url: e.target.value })
											}
											placeholder="https://example.com"
										/>
									</div>
									<div className="space-y-1">
										<Label htmlFor={`repo-${index}`} className="text-xs">
											Repository URL
										</Label>
										<Input
											id={`repo-${index}`}
											type="url"
											value={project.repositoryUrl || ""}
											onChange={(e) =>
												handleUpdate(index, { repositoryUrl: e.target.value })
											}
											placeholder="https://github.com/user/repo"
										/>
									</div>
									<div className="space-y-1">
										<Label htmlFor={`skills-${index}`} className="text-xs">
											Skills
										</Label>
										<Input
											id={`skills-${index}`}
											type="text"
											value={project.skills?.join(", ") || ""}
											onChange={(e) =>
												handleUpdate(index, {
													skills: e.target.value
														.split(",")
														.map((s) => s.trim())
														.filter(Boolean),
												})
											}
											placeholder="React, Node.js, PostgreSQL"
										/>
									</div>
								</div>
								<div className="space-y-1">
									<Label htmlFor={`desc-${index}`} className="text-xs">
										Description
									</Label>
									<Textarea
										id={`desc-${index}`}
										value={project.description || ""}
										onChange={(e) =>
											handleUpdate(index, { description: e.target.value })
										}
										placeholder="Describe your project..."
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