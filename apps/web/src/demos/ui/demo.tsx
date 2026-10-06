import { Icons } from "@/demos/ui/icons";
import { Badge } from "@/components/ui/badge";
import { Marquee } from "@/components/ui/marquee";

const marqueeData = [
	"How do I write a winning CV?",
	"Where do I find job listings?",
	"How do I prepare for interviews?",
	"Should I apply now or wait?",
	"What salary should I ask for?",
	"How do I follow up after applying?",
	"Should I negotiate my offer?",
	"How do I stand out from other candidates?",
	"What should I include in my cover letter?",
	"How do I track my applications?",
	"Is this job worth pursuing?",
	"How do I choose the right role?"
];

const features = [
	{
		description:
			"Keep your experience, skills, and job-search preferences in a professional profile.",
		icon: Icons.search,
		title: "Your professional profile"
	},
	{
		description:
			"Discover opportunities and organize the ones you want to pursue in one workspace.",
		icon: Icons.fileUser,
		title: "Opportunities to pursue"
	},
	{
		description:
			"Keep applications, deadlines, progress, and next steps together as you move forward.",
		icon: Icons.clipboardCheck,
		title: "Applications and next steps"
	},
	{
		description:
			"IAN can help with opportunities, application materials, and interview preparation on Pro.",
		icon: Icons.shine,
		title: "Guidance with IAN"
	}
];

export default function Features() {
	const m1 = marqueeData.slice(0, marqueeData.length / 3);
	const m2 = marqueeData.slice(
		marqueeData.length / 3,
		(marqueeData.length / 3) * 2
	);
	const m3 = marqueeData.slice((marqueeData.length / 3) * 2);

	return (
		<section
			id='workspace'
			className='relative px-6 py-20 text-neutral-900 sm:py-28 md:px-12'>
			<div className='mx-auto max-w-6xl'>
				<div className='mx-auto flex max-w-5xl flex-col items-center justify-center space-y-4 px-5 text-center md:px-10'>
					<p className='text-xs font-medium uppercase tracking-[0.2em] text-neutral-600'>
						The Besire workspace
					</p>
					<h2 className='max-w-3xl text-4xl font-medium sm:text-5xl lg:text-6xl'>
						Your job search, in one workspace.
					</h2>
					<p className='max-w-2xl text-base leading-relaxed text-neutral-700 md:text-lg'>
						Keep opportunities, applications, profile details, deadlines, and
						next steps together instead of juggling multiple tools.
					</p>
					<div className='relative mx-auto mt-6 w-full max-w-4xl overflow-hidden'>
						<div className='absolute inset-y-0 left-0 z-10 w-12 sm:w-20' />
						<div className='absolute inset-y-0 right-0 z-10 w-12  sm:w-20' />
						<div className='flex flex-col gap-3'>
							<Marquee className='[--duration:45s] [--gap:0.75rem]' repeat={1}>
								{m1.map((question) => (
									<Badge
										className='rounded-none bg-[#a0c6ff] px-3 py-1 whitespace-nowrap'
										key={question}
										size='lg'
										variant='outline'>
										{question}
									</Badge>
								))}
							</Marquee>
							<Marquee
								className='[--duration:50s] [--gap:0.75rem]'
								repeat={4}
								reverse>
								{m2.map((question) => (
									<Badge
										className='rounded-none bg-[#a0c6ff] px-3 py-1 whitespace-nowrap'
										key={question}
										size='lg'
										variant='outline'>
										{question}
									</Badge>
								))}
							</Marquee>
							<Marquee className='[--duration:42s] [--gap:0.75rem]' repeat={4}>
								{m3.map((question) => (
									<Badge
										className='rounded-none bg-[#a0c6ff] px-3 py-1 whitespace-nowrap'
										key={question}
										size='lg'
										variant='outline'>
										{question}
									</Badge>
								))}
							</Marquee>
						</div>
					</div>
				</div>

				<div className='mt-12 grid grid-cols-1 divide-y divide-dashed divide-neutral-400 border-y border-dashed border-neutral-400 sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4'>
					{features.map((feature) => {
						const Icon = feature.icon;
						return (
							<div
								className='flex flex-col gap-5 px-5 py-8 first:pt-8 last:pb-8 lg:px-6 lg:py-10'
								key={feature.title}>
								<Icon className='size-8 text-neutral-700' aria-hidden='true' />

								<div className='flex flex-col gap-2'>
									<h3 className='font-medium text-xl tracking-tight sm:text-2xl'>
										{feature.title}
									</h3>
									<p className='text-sm leading-relaxed text-neutral-700'>
										{feature.description}
									</p>
								</div>
							</div>
						);
					})}
				</div>
			</div>
		</section>
	);
}
