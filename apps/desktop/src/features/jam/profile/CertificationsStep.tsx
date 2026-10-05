import { Button } from "../../../components/ui/button";
import { Label } from "../../../components/ui/label";
import { Input } from "../../../components/ui/input";
import { RepeatingSection } from "./RepeatingSection";
import type { Certification, Profile } from "../../../../backend/db/models/profile";

interface CertificationsStepProps {
	profile: Profile;
	onUpdate: (profile: Profile) => void;
	onNext: () => void;
	onPrevious: () => void;
}

export function CertificationsStep({
	profile,
	onUpdate,
	onNext,
	onPrevious,
}: CertificationsStepProps) {
	const certifications = profile.professional?.certifications ?? [];

	const handleAdd = () => {
		onUpdate({
			...profile,
			professional: {
				...profile.professional,
				certifications: [
					...certifications,
					{
						name: "",
						issuer: "",
						issueDate: "",
						expiryDate: "",
						credentialId: "",
						credentialUrl: "",
					},
				],
			},
		});
	};

	const handleUpdate = (index: number, data: Partial<Certification>) => {
		const updated = certifications.map((c, i) =>
			i === index ? { ...c, ...data } : c
		);
		onUpdate({
			...profile,
			professional: { ...profile.professional, certifications: updated },
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
					Certifications
				</h2>
				<p className="text-sm text-muted-foreground">
					Professional certifications and credentials.
				</p>
			</div>

			<RepeatingSection
				title="Certifications"
				description="Add your certifications and credentials"
				onAdd={handleAdd}
				addLabel="Add Certification"
			>
				{certifications.length === 0 ? (
					<p className="text-sm text-muted-foreground py-4 text-center border border-dashed rounded-md">
						No certifications added yet. Click "Add Certification" to get started.
					</p>
				) : (
					<div className="space-y-3">
						{certifications.map((cert, index) => (
							<div
								key={index}
								className="border rounded-md p-4 space-y-3 bg-card"
							>
								<div className="grid gap-3 md:grid-cols-3">
									<div className="space-y-1">
										<Label htmlFor={`name-${index}`} className="text-xs">
											Name *
										</Label>
										<Input
											id={`name-${index}`}
											value={cert.name}
											onChange={(e) =>
												handleUpdate(index, { name: e.target.value })
											}
											placeholder="AWS Certified Solutions Architect"
										/>
									</div>
									<div className="space-y-1">
										<Label htmlFor={`issuer-${index}`} className="text-xs">
											Issuer
										</Label>
										<Input
											id={`issuer-${index}`}
											value={cert.issuer || ""}
											onChange={(e) =>
												handleUpdate(index, { issuer: e.target.value })
											}
											placeholder="Amazon Web Services"
										/>
									</div>
									<div className="space-y-1">
										<Label htmlFor={`issue-${index}`} className="text-xs">
											Issue Date
										</Label>
										<Input
											id={`issue-${index}`}
											type="date"
											value={cert.issueDate || ""}
											onChange={(e) =>
												handleUpdate(index, { issueDate: e.target.value })
											}
										/>
									</div>
									<div className="space-y-1">
										<Label htmlFor={`expiry-${index}`} className="text-xs">
											Expiry Date
										</Label>
										<Input
											id={`expiry-${index}`}
											type="date"
											value={cert.expiryDate || ""}
											onChange={(e) =>
												handleUpdate(index, { expiryDate: e.target.value })
											}
										/>
									</div>
									<div className="space-y-1">
										<Label htmlFor={`credId-${index}`} className="text-xs">
											Credential ID
										</Label>
										<Input
											id={`credId-${index}`}
											value={cert.credentialId || ""}
											onChange={(e) =>
												handleUpdate(index, { credentialId: e.target.value })
											}
											placeholder="CERT-12345"
										/>
									</div>
									<div className="space-y-1">
										<Label htmlFor={`credUrl-${index}`} className="text-xs">
											Credential URL
										</Label>
										<Input
											id={`credUrl-${index}`}
											type="url"
											value={cert.credentialUrl || ""}
											onChange={(e) =>
												handleUpdate(index, { credentialUrl: e.target.value })
											}
											placeholder="https://credential.url"
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