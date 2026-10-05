import { Button } from "../../../components/ui/button";

interface ProfileLandingProps {
	onCreateManual: () => void;
	onImportResume: () => void;
}

export function ProfileLanding({ onCreateManual, onImportResume }: ProfileLandingProps) {
	return (
		<main className="flex min-h-screen flex-col items-center justify-center p-8">
			<div className="w-full max-w-md space-y-8">
				<div className="text-center space-y-3">
					<h1 className="text-3xl font-semibold tracking-tight">Welcome to JAM</h1>
					<p className="text-muted-foreground text-sm leading-relaxed">
						Your profile stores your professional information — education, experience,
						skills, and preferences. It becomes the foundation for every job
						application in JAM.
					</p>
				</div>

				<div className="flex flex-col gap-3">
					<Button onClick={onCreateManual} className="w-full h-11 text-base">
						Create manually
					</Button>
					<Button variant="outline" onClick={onImportResume} className="w-full h-11 text-base">
						Import from resume
					</Button>
				</div>
			</div>
		</main>
	);
}