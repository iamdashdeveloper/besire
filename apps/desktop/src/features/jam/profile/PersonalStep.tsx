import { useState } from "react";
import type { Profile } from "../../../../backend/db/models/profile";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";

interface PersonalStepProps {
	profile: Profile;
	onUpdate: (profile: Profile) => void;
	onNext: () => void;
	onPrevious: () => void;
}

export function PersonalStep({
	profile,
	onUpdate,
	onNext,
	onPrevious,
}: PersonalStepProps) {
	const [localData, setLocalData] = useState<Profile["personal"]>(
		profile.personal ?? { fullName: "" }
	);

	const handleChange = (field: keyof typeof localData, value: typeof localData[keyof typeof localData]) => {
		setLocalData((prev) => ({ ...prev, [field]: value }));
	};

	const handleLocationChange = (field: "city" | "country", value: string) => {
		setLocalData((prev) => ({
			...prev,
			location: {
				...prev.location,
				[field]: value,
			},
		}));
	};

	const handleLinksChange = (
		field: "linkedin" | "github" | "portfolio",
		value: string
	) => {
		setLocalData((prev) => ({
			...prev,
			links: {
				...prev.links,
				[field]: value,
			},
		}));
	};

	const handleOtherLinksChange = (value: string) => {
		const links = value
			.split(",")
			.map((s) => s.trim())
			.filter(Boolean);
		setLocalData((prev) => ({
			...prev,
			links: {
				...prev.links,
				other: links,
			},
		}));
	};

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		onUpdate({ ...profile, personal: localData });
		onNext();
	};

	return (
		<form onSubmit={handleSubmit} className="space-y-8">
			<div className="space-y-2">
				<h2 className="text-2xl font-semibold tracking-tight">
					Personal Information
				</h2>
				<p className="text-sm text-muted-foreground">
					Your basic contact details.
				</p>
			</div>

			<div className="grid gap-4 md:grid-cols-2">
				<div className="space-y-2">
					<Label htmlFor="fullName" className="text-sm font-medium">
						Full Name *
					</Label>
					<Input
						id="fullName"
						value={localData.fullName || ""}
						onChange={(e) => handleChange("fullName", e.target.value)}
						placeholder="John Doe"
						required
					/>
				</div>

				<div className="space-y-2">
					<Label htmlFor="preferredName" className="text-sm font-medium">
						Preferred Name
					</Label>
					<Input
						id="preferredName"
						value={localData.preferredName || ""}
						onChange={(e) => handleChange("preferredName", e.target.value)}
						placeholder="Johndoe"
					/>
				</div>

				<div className="space-y-2">
					<Label htmlFor="email" className="text-sm font-medium">
						Email
					</Label>
					<Input
						id="email"
						type="email"
						value={localData.email || ""}
						onChange={(e) => handleChange("email", e.target.value)}
						placeholder="john@example.com"
					/>
				</div>

				<div className="space-y-2">
					<Label htmlFor="phone" className="text-sm font-medium">
						Phone
					</Label>
					<Input
						id="phone"
						type="tel"
						value={localData.phone || ""}
						onChange={(e) => handleChange("phone", e.target.value)}
						placeholder="+1 (555) 123-4567"
					/>
				</div>

				<div className="space-y-2">
					<Label htmlFor="city" className="text-sm font-medium">
						City
					</Label>
					<Input
						id="city"
						value={localData.location?.city || ""}
						onChange={(e) => handleLocationChange("city", e.target.value)}
						placeholder="San Francisco"
					/>
				</div>

				<div className="space-y-2">
					<Label htmlFor="country" className="text-sm font-medium">
						Country
					</Label>
					<Input
						id="country"
						value={localData.location?.country || ""}
						onChange={(e) => handleLocationChange("country", e.target.value)}
						placeholder="United States"
					/>
				</div>
			</div>

			<div className="space-y-4">
				<h3 className="text-sm font-medium">Professional Links</h3>

				<div className="grid gap-4 md:grid-cols-2">
					<div className="space-y-2">
						<Label htmlFor="linkedin" className="text-sm">
							LinkedIn
						</Label>
						<Input
							id="linkedin"
							type="url"
							value={localData.links?.linkedin || ""}
							onChange={(e) => handleLinksChange("linkedin", e.target.value)}
							placeholder="linkedin.com/in/yourname"
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="github" className="text-sm">
							GitHub
						</Label>
						<Input
							id="github"
							type="url"
							value={localData.links?.github || ""}
							onChange={(e) => handleLinksChange("github", e.target.value)}
							placeholder="github.com/yourname"
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="portfolio" className="text-sm">
							Portfolio
						</Label>
						<Input
							id="portfolio"
							type="url"
							value={localData.links?.portfolio || ""}
							onChange={(e) => handleLinksChange("portfolio", e.target.value)}
							placeholder="yourwebsite.com"
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="otherLinks" className="text-sm">
							Other Links
						</Label>
						<Input
							id="otherLinks"
							type="text"
							value={localData.links?.other?.join(", ") || ""}
							onChange={(e) => handleOtherLinksChange(e.target.value)}
							placeholder="Website, Behance, etc."
						/>
					</div>
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