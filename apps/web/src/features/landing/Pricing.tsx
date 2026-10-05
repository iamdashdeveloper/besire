import { Link } from "react-router-dom";
import { Check, Minus } from "lucide-react";

const freeFeatures = [
	"Professional profile",
	"Discover and organize opportunities",
	"Track applications, deadlines, and progress",
	"Keep next steps in view",
];

const proFeatures = [
	...freeFeatures,
	"IAN intelligent assistance",
	"Guidance with opportunities and applications",
	"Interview preparation support",
];

const Pricing = () => {
	return (
		<main className="px-6 pt-28 pb-20 md:px-12">
			<section className="mx-auto max-w-6xl">
				<div className="mx-auto max-w-2xl text-center">
					<p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
						Besire plans
					</p>
					<h1 className="mt-4 font-cormorant text-5xl font-medium italic tracking-tight sm:text-6xl">
						Make your next move with Besire.
					</h1>
					<p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
						Choose the job-search experience that fits you. Start with the core
						workspace, or add IAN for practical guidance and preparation.
					</p>
				</div>

				<div className="mx-auto mt-12 grid max-w-4xl gap-5 md:grid-cols-2">
					<article className="flex flex-col border border-border bg-background p-7 sm:p-8">
						<div>
							<p className="text-sm font-medium text-muted-foreground">Free</p>
							<p className="mt-4 flex items-baseline gap-2">
								<span className="text-4xl font-medium tracking-tight">KSh 0</span>
							</p>
							<p className="mt-3 min-h-12 text-sm leading-relaxed text-muted-foreground">
								The core Besire job-search experience for keeping your search
								organized.
							</p>
						</div>
						<ul className="my-8 flex-1 space-y-4 border-t border-border pt-6">
							{freeFeatures.map((feature) => (
								<li key={feature} className="flex gap-3 text-sm">
									<Check className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
									<span>{feature}</span>
								</li>
							))}
							<li className="flex gap-3 text-sm text-muted-foreground">
								<Minus className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
								<span>IAN is not included in Free.</span>
							</li>
						</ul>
						<Link
							to="/signup"
							className="inline-flex min-h-11 items-center justify-center rounded-md border border-border px-5 py-3 text-sm font-medium transition-colors hover:bg-muted"
						>
							Get started free
						</Link>
					</article>

					<article className="relative flex flex-col border border-neutral-800 bg-neutral-900 p-7 text-white sm:p-8">
						<span className="absolute right-6 top-6 border border-white/25 px-2 py-1 text-[10px] uppercase tracking-[0.16em] text-white/75">
							With IAN
						</span>
						<div>
							<p className="text-sm font-medium text-white/65">Pro</p>
							<p className="mt-4 flex flex-wrap items-baseline gap-x-2 gap-y-0">
								<span className="text-4xl font-medium tracking-tight">KSh 2,000</span>
								<span className="text-sm text-white/65">/ month</span>
							</p>
							<p className="mt-3 min-h-12 text-sm leading-relaxed text-white/70">
								The Besire platform experience, with IAN for added guidance and
								preparation.
							</p>
						</div>
						<ul className="my-8 flex-1 space-y-4 border-t border-white/20 pt-6">
							{proFeatures.map((feature) => (
								<li key={feature} className="flex gap-3 text-sm">
									<Check className="mt-0.5 size-4 shrink-0 text-white/70" aria-hidden="true" />
									<span>{feature}</span>
								</li>
							))}
						</ul>
						<Link
							to="/signup"
							className="inline-flex min-h-11 items-center justify-center rounded-md bg-white px-5 py-3 text-sm font-medium text-neutral-900 transition-colors hover:bg-white/90"
						>
							Create an account
						</Link>
					</article>
				</div>
				<p className="mx-auto mt-6 max-w-3xl text-center text-xs leading-relaxed text-muted-foreground">
					Pricing is shown for information. Subscription payments are not
					processed on this website yet.
				</p>
			</section>
		</main>
	);
};

export default Pricing;
