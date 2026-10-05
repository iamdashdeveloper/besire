import { UserPlus, Search, ClipboardCheck, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";

const steps = [
	{
		icon: UserPlus,
		title: "Create your profile",
		copy: "Build your professional profile once—your experience, skills, preferences, and the details that matter to your job search.",
	},
	{
		icon: Search,
		title: "Find opportunities",
		copy: "Discover opportunities and keep the ones you're interested in organized in your workspace.",
	},
	{
		icon: ClipboardCheck,
		title: "Apply and track",
		copy: "Manage applications, deadlines, progress, and next steps without losing track of where you are.",
	},
	{
		icon: Sparkles,
		title: "Prepare with IAN",
		copy: "Get help understanding opportunities, refining your application materials, and preparing for interviews with IAN, Besire's intelligent assistance system.",
	},
];

export default function HowItWorksBlock() {
	return (
		<section className="flex w-full items-center justify-center bg-background px-6 py-16 text-foreground">
			<div className="mx-auto w-full max-w-2xl">
				<div className="mb-14">
					<Badge variant="outline" className="mb-4">
						How It Works
					</Badge>
					<h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
						From job search to next step.
					</h2>
					<p className="mt-3 text-muted-foreground">
						Besire keeps the process together, so you can spend less time
						organizing your job search and more time moving it forward.
					</p>
				</div>

				<ol className="flex flex-col">
					{steps.map(({ icon: Icon, title, copy }, index) => {
						const isLast = index === steps.length - 1;
						return (
							<li key={title} className="flex gap-6">
								<div className="flex flex-col items-center">
									<span className="flex size-10 shrink-0 items-center justify-center border border-border bg-muted">
										<Icon
											className="size-4 text-foreground"
											aria-hidden="true"
										/>
									</span>
									{!isLast && <span className="mt-1 w-px flex-1 bg-border" />}
								</div>

								<div className={isLast ? "pb-0" : "pb-10"}>
									<h3 className="text-base font-semibold">
										<span className="mr-2 font-mono text-xs font-normal text-muted-foreground">
											0{index + 1} —
										</span>
										{title}
									</h3>
									<p className="mt-1.5 text-sm text-muted-foreground">{copy}</p>
								</div>
							</li>
						);
					})}
				</ol>
			</div>
		</section>
	);
}
