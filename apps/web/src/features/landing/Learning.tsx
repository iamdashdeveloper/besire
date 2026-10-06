import { Link } from "react-router-dom";
import { ArrowRight, Compass, Globe2, UserRound } from "lucide-react";

const learningAreas = [
	{
		icon: Globe2,
		title: "Navigate online work",
		description:
			"Build a clearer understanding of the online work space and how to approach it."
	},
	{
		icon: UserRound,
		title: "Build your professional presence",
		description:
			"Explore ways to present your experience and skills with clarity."
	},
	{
		icon: Compass,
		title: "Approach the modern job search",
		description:
			"Learn to find opportunities and move through your job search with intention."
	}
];

const Learning = () => {
	return (
		<main className='pt-16'>
			<section className='px-6 py-20 text-neutral-900 sm:py-28 md:px-12'>
				<div className='mx-auto max-w-6xl'>
					<div className='max-w-3xl'>
						<p className='text-xs font-medium uppercase tracking-[0.2em] text-neutral-600'>
							Besire learning
						</p>
						<h1 className='mt-4 text-5xl font-medium leading-tight tracking-tight sm:text-6xl lg:text-7xl'>
							Learn. Build. Move forward.
						</h1>
						<p className='mt-5 max-w-2xl text-base leading-relaxed text-neutral-700 sm:text-lg'>
							Practical courses and guidance designed to help you navigate
							online work, build your professional presence, find opportunities,
							and approach the modern job market more effectively.
						</p>
						<a
							href='#learning-areas'
							className='mt-7 inline-flex items-center rounded-md bg-neutral-900 px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-neutral-800'>
							Explore learning areas
							<ArrowRight className='ml-2 size-4' aria-hidden='true' />
						</a>
					</div>
				</div>
			</section>

			<section id='learning-areas' className='px-6 py-20 md:px-12'>
				<div className='mx-auto max-w-6xl'>
					<div className='max-w-2xl'>
						<p className='text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground'>
							Built for the way work is changing
						</p>
						<h2 className='mt-3 text-4xl font-medium tracking-tight sm:text-5xl'>
							Learning for your next step.
						</h2>
						<p className='mt-4 leading-relaxed text-muted-foreground'>
							Besire learning is a dedicated part of the platform—not another
							screen in your job tracker. It brings practical learning and
							guidance alongside the tools you use to move your search forward.
						</p>
					</div>
					<div className='mt-10 grid gap-0 border-y border-dashed border-border sm:grid-cols-3 sm:divide-x sm:divide-dashed sm:divide-border'>
						{learningAreas.map(({ icon: Icon, title, description }, index) => (
							<article
								key={title}
								className='border-b border-dashed border-border px-5 py-7 last:border-b-0 sm:border-b-0 sm:px-6 sm:py-9'>
								<div className='flex items-center justify-between'>
									<Icon className='size-7 text-foreground' aria-hidden='true' />
									<span className='font-mono text-xs text-muted-foreground'>
										0{index + 1}
									</span>
								</div>
								<h3 className='mt-8 text-lg font-medium'>{title}</h3>
								<p className='mt-2 text-sm leading-relaxed text-muted-foreground'>
									{description}
								</p>
							</article>
						))}
					</div>
					<p className='mt-6 text-sm text-muted-foreground'>
						The course catalogue is being prepared. These are learning areas,
						not individual course listings.
					</p>
				</div>
			</section>

			<section className='bg-neutral-900 px-6 py-16 text-white md:px-12'>
				<div className='mx-auto flex max-w-6xl flex-col gap-6 sm:flex-row sm:items-center sm:justify-between'>
					<div>
						<h2 className='text-3xl font-medium sm:text-4xl'>
							Learning is one part of the journey.
						</h2>
						<p className='mt-2 max-w-xl text-sm leading-relaxed text-white/70'>
							Bring practical learning together with a workspace for your job
							search.
						</p>
					</div>
					<Link
						to='/pricing'
						className='inline-flex w-fit items-center rounded-md bg-white px-5 py-3 text-sm font-medium text-neutral-900 transition-colors hover:bg-white/90'>
						Explore Besire plans
						<ArrowRight className='ml-2 size-4' aria-hidden='true' />
					</Link>
				</div>
			</section>
		</main>
	);
};

export default Learning;
