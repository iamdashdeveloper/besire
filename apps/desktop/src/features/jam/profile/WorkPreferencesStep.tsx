import { Button } from "../../../components/ui/button";
import { Label } from "../../../components/ui/label";
import { Input } from "../../../components/ui/input";
import type { Profile } from "../../../../backend/db/models/profile";

interface WorkPreferencesStepProps {
	profile: Profile;
	onUpdate: (profile: Profile) => void;
	onNext: () => void;
	onPrevious: () => void;
}

export function WorkPreferencesStep({
	profile,
	onUpdate,
	onNext,
	onPrevious,
}: WorkPreferencesStepProps) {
	const prefs = profile.workPreferences ?? {
		workModes: [],
		employmentTypes: [],
		preferredRoles: [],
		preferredIndustries: [],
		preferredLocations: [],
		willingToRelocate: false,
		salaryExpectation: { minimum: 0, maximum: 0, currency: "USD" },
		availability: "",
	};

	const handleArrayUpdate = (field: string, value: string) => {
		const arr = typeof value === "string"
			? value.split(",").map((s) => s.trim()).filter(Boolean)
			: value || [];
		onUpdate({
			...profile,
			workPreferences: { ...prefs, [field]: arr },
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
					Work Preferences
				</h2>
				<p className="text-sm text-muted-foreground">
					Your work preferences and expectations.
				</p>
			</div>

			<div className="space-y-4">
				<div>
					<h3 className="text-sm font-medium">Work Modes</h3>
					<p className="text-xs text-muted-foreground">
						Your preferred work arrangements (comma-separated).
					</p>
					<Input
						type="text"
						value={prefs.workModes.join(", ")}
						onChange={(e) => handleArrayUpdate("workModes", e.target.value)}
						placeholder="Remote, Onsite, Hybrid"
					/>
				</div>

				<div>
					<h3 className="text-sm font-medium">Employment Types</h3>
					<p className="text-xs text-muted-foreground">
						Preferred employment types (comma-separated).
					</p>
					<Input
						type="text"
						value={prefs.employmentTypes.join(", ")}
						onChange={(e) => handleArrayUpdate("employmentTypes", e.target.value)}
						placeholder="Full Time, Part Time, Contract"
					/>
				</div>

				<div>
					<h3 className="text-sm font-medium">Preferred Roles</h3>
					<p className="text-xs text-muted-foreground">
						Your ideal roles (comma-separated).
					</p>
					<Input
						type="text"
						value={prefs.preferredRoles.join(", ")}
						onChange={(e) => handleArrayUpdate("preferredRoles", e.target.value)}
						placeholder="Software Engineer, Tech Lead"
					/>
				</div>

				<div>
					<h3 className="text-sm font-medium">Preferred Industries</h3>
					<p className="text-xs text-muted-foreground">
						Industries you're interested in (comma-separated).
					</p>
					<Input
						type="text"
						value={prefs.preferredIndustries.join(", ")}
						onChange={(e) => handleArrayUpdate("preferredIndustries", e.target.value)}
						placeholder="Fintech, SaaS, Healthcare"
					/>
				</div>

				<div>
					<h3 className="text-sm font-medium">Preferred Locations</h3>
					<p className="text-xs text-muted-foreground">
						Preferred locations (comma-separated).
					</p>
					<Input
						type="text"
						value={prefs.preferredLocations.join(", ")}
						onChange={(e) => handleArrayUpdate("preferredLocations", e.target.value)}
						placeholder="San Francisco, Remote, New York"
					/>
				</div>

				<div className="flex items-center gap-2">
					<input
						type="checkbox"
						id="relocate"
						checked={prefs.willingToRelocate || false}
						onChange={(e) =>
							onUpdate({
								...profile,
								workPreferences: {
									...prefs,
									willingToRelocate: e.target.checked,
								},
							})
						}
					/>
					<Label htmlFor="relocate">Willing to relocate</Label>
				</div>

				<div className="grid gap-4 md:grid-cols-3">
					<div className="space-y-1">
						<Label htmlFor="minSalary" className="text-xs">
							Min Salary
						</Label>
						<Input
							id="minSalary"
							type="number"
							value={prefs.salaryExpectation?.minimum || ""}
							onChange={(e) =>
								onUpdate({
									...profile,
									workPreferences: {
										...prefs,
										salaryExpectation: {
											...prefs.salaryExpectation,
											minimum: e.target.value ? Number(e.target.value) : 0,
										},
									},
								})
							}
						/>
					</div>
					<div className="space-y-1">
						<Label htmlFor="maxSalary" className="text-xs">
							Max Salary
						</Label>
						<Input
							id="maxSalary"
							type="number"
							value={prefs.salaryExpectation?.maximum || ""}
							onChange={(e) =>
								onUpdate({
									...profile,
									workPreferences: {
										...prefs,
										salaryExpectation: {
											...prefs.salaryExpectation,
											maximum: e.target.value ? Number(e.target.value) : 0,
										},
									},
								})
							}
						/>
					</div>
					<div className="space-y-1">
						<Label htmlFor="currency" className="text-xs">
							Currency
						</Label>
						<Input
							id="currency"
							value={prefs.salaryExpectation?.currency || "USD"}
							onChange={(e) =>
								onUpdate({
									...profile,
									workPreferences: {
										...prefs,
										salaryExpectation: {
											...prefs.salaryExpectation,
											currency: e.target.value,
										},
									},
								})
							}
						/>
					</div>
				</div>

				<div className="space-y-1">
					<Label htmlFor="availability" className="text-xs">
						Availability
					</Label>
					<Input
						id="availability"
						type="text"
						value={prefs.availability || ""}
						onChange={(e) =>
							onUpdate({
								...profile,
								workPreferences: { ...prefs, availability: e.target.value },
							})
						}
						placeholder="Immediate, 2 weeks notice, etc."
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