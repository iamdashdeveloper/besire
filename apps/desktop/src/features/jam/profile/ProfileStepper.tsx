import { useState } from "react";
import type { Profile } from "../../../../backend/db/models/profile";
import { Button } from "../../../components/ui/button";
import { useProfileForm } from "./useProfileForm";
import { PersonalStep } from "./PersonalStep";
import { ProfessionalStep } from "./ProfessionalStep";
import { EducationStep } from "./EducationStep";
import { WorkExperienceStep } from "./WorkExperienceStep";
import { SkillsStep } from "./SkillsStep";
import { ProjectsStep } from "./ProjectsStep";
import { CertificationsStep } from "./CertificationsStep";
import { LanguagesStep } from "./LanguagesStep";
import { InterestsStep } from "./InterestsStep";
import { WorkPreferencesStep } from "./WorkPreferencesStep";

interface ProfileStepperProps {
	onSave: (profile: Profile) => void;
	initialProfile?: Partial<Profile>;
}

const steps = [
	"Personal",
	"Professional",
	"Education",
	"Experience",
	"Skills",
	"Projects",
	"Certifications",
	"Languages",
	"Interests",
	"Work Preferences",
];

export function ProfileStepper({
	onSave,
	initialProfile,
}: ProfileStepperProps) {
	const [currentStep, setCurrentStep] = useState(0);
	const { profile, setProfile } = useProfileForm(initialProfile);

	const isLastStep = currentStep === steps.length - 1;
	const isFirstStep = currentStep === 0;

	function handleNext() {
		if (!isLastStep) {
			setCurrentStep((prev) => prev + 1);
		}
	}

	function handlePrevious() {
		if (!isFirstStep) {
			setCurrentStep((prev) => prev - 1);
		}
	}

	function handleSave() {
		onSave(profile);
	}

	const renderStep = () => {
		switch (currentStep) {
			case 0:
				return (
					<PersonalStep
						profile={profile}
						onUpdate={(updated) => setProfile(updated)}
						onNext={handleNext}
						onPrevious={handlePrevious}
					/>
				);
			case 1:
				return (
					<ProfessionalStep
						profile={profile}
						onUpdate={(updated) => setProfile(updated)}
						onNext={handleNext}
						onPrevious={handlePrevious}
					/>
				);
			case 2:
				return (
					<EducationStep
						profile={profile}
						onUpdate={(updated) => setProfile(updated)}
						onNext={handleNext}
						onPrevious={handlePrevious}
					/>
				);
			case 3:
				return (
					<WorkExperienceStep
						profile={profile}
						onUpdate={(updated) => setProfile(updated)}
						onNext={handleNext}
						onPrevious={handlePrevious}
					/>
				);
			case 4:
				return (
					<SkillsStep
						profile={profile}
						onUpdate={(updated) => setProfile(updated)}
						onNext={handleNext}
						onPrevious={handlePrevious}
					/>
				);
			case 5:
				return (
					<ProjectsStep
						profile={profile}
						onUpdate={(updated) => setProfile(updated)}
						onNext={handleNext}
						onPrevious={handlePrevious}
					/>
				);
			case 6:
				return (
					<CertificationsStep
						profile={profile}
						onUpdate={(updated) => setProfile(updated)}
						onNext={handleNext}
						onPrevious={handlePrevious}
					/>
				);
			case 7:
				return (
					<LanguagesStep
						profile={profile}
						onUpdate={(updated) => setProfile(updated)}
						onNext={handleNext}
						onPrevious={handlePrevious}
					/>
				);
			case 8:
				return (
					<InterestsStep
						profile={profile}
						onUpdate={(updated) => setProfile(updated)}
						onNext={handleNext}
						onPrevious={handlePrevious}
					/>
				);
			case 9:
				return (
					<WorkPreferencesStep
						profile={profile}
						onUpdate={(updated) => setProfile(updated)}
						onNext={handleNext}
						onPrevious={handlePrevious}
					/>
				);
			default:
				return null;
		}
	};

	return (
		<div className="flex flex-col h-full">
			<div className="border-b">
				<div className="container mx-auto px-4 py-3">
					<div className="flex items-center justify-between">
						<div className="text-sm text-muted-foreground">
							Step {currentStep + 1} of {steps.length}: {steps[currentStep]}
						</div>
						<div className="flex gap-2">
							<Button
								variant="outline"
								size="sm"
								onClick={handlePrevious}
								disabled={isFirstStep}
							>
								Previous
							</Button>
							<Button
								variant="outline"
								size="sm"
								onClick={handleNext}
								disabled={isLastStep}
							>
								Next
							</Button>
						</div>
					</div>
					<div className="w-full bg-muted/50 h-1.5 mt-3 rounded-full overflow-hidden">
						<div
							className="bg-primary h-full transition-all duration-300 ease-in-out"
							style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
						></div>
					</div>
				</div>
			</div>

			<div className="flex-1 container mx-auto px-4 py-6 overflow-auto">
				{renderStep()}
			</div>

			<div className="border-t">
				<div className="container mx-auto px-4 py-4">
					<div className="flex justify-between items-center">
						<Button
							variant="outline"
							onClick={handlePrevious}
							disabled={isFirstStep}
						>
							Previous
						</Button>
						<Button onClick={handleSave} disabled={!isLastStep}>
							Save Profile
						</Button>
					</div>
				</div>
			</div>
		</div>
	);
}