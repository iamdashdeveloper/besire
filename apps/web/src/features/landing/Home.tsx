import { Link } from "react-router-dom";
import heroImage from "@/assets/hero.svg";
import Features from "@/demos/ui/demo";
import HowItWorksBlock from "@/components/ui/how-it-works-2";
import { Skiper39 } from "@/components/ui/skiper-ui/skiper39";
import { ArrowRight, Sparkles } from "lucide-react";

const HeroSection = () => {
	return (
		<section className='relative flex min-h-[90vh] items-center justify-between gap-1 px-6 pt-24 pb-16 md:px-12 md:pt-28'>
			<div className='flex-1 space-y-6'>
				<p className='text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground'>
					Work is changing. Your approach can, too.
				</p>
				<h1 className='max-w-3xl text-4xl font-medium leading-tight tracking-tight text-foreground md:text-4xl lg:text-6xl'>
					Navigate the modern world of work.
				</h1>
				<p className='max-w-xl text-lg text-muted-foreground'>
					Besire brings job-search tools, practical learning, and guidance
					together to help you find opportunities, apply with confidence, and
					prepare for what comes next in the online work space.
				</p>
				<div className='flex flex-wrap items-center gap-3'>
					<Link
						to='/signup'
						className='inline-flex items-center justify-center rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2'>
						Get started
						<ArrowRight className='ml-2 size-4' aria-hidden='true' />
					</Link>
					<Link
						to='/learning'
						className='inline-flex items-center justify-center rounded-md border border-border px-6 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted'>
						Explore learning
					</Link>
				</div>
			</div>
			<div className='hidden flex-1 md:block'>
				<img
					src={heroImage}
					alt='Abstract illustration representing forward movement'
					className='h-full w-full object-contain'
				/>
			</div>
		</section>
	);
};

const Home = () => {
	return (
		<>
			<HeroSection />
			<Features />
			<HowItWorksBlock />
			<section className='px-6 py-20 text-neutral-900 sm:py-24 md:px-12'>
				<div className='mx-auto grid max-w-6xl gap-10 md:grid-cols-[1fr_auto] md:items-center'>
					<div className='max-w-2xl'>
						<div className='mb-4 flex size-11 items-center justify-center border'>
							<Sparkles className='size-5' aria-hidden='true' />
						</div>
						<p className='mb-3 text-xs font-medium uppercase tracking-[0.2em] text-neutral-600'>
							Besire’s intelligent assistance system
						</p>
						<h2 className='text-4xl font-medium tracking-tight sm:text-5xl'>
							Meet IAN, your guide within Besire.
						</h2>
						<p className='mt-4 max-w-xl leading-relaxed text-neutral-700'>
							IAN helps you make sense of opportunities, refine application
							materials, and prepare for interviews. It supports your journey
							through finding your first remote job.
						</p>
						<p className='mt-4 text-sm font-medium text-neutral-700'>
							Available with Besire Pro.
						</p>
					</div>
					<Link
						to='/pricing'
						className='inline-flex w-fit items-center justify-center rounded-md border border-neutral-400 px-5 py-3 text-sm font-medium transition-colors hover:bg-[#f5f1ca]'>
						Compare plans
						<ArrowRight className='ml-2 size-4' aria-hidden='true' />
					</Link>
				</div>
			</section>
		</>
	);
};

export default Home;
export { HeroSection };
