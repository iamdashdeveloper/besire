import { useEffect, useState } from "react";
import { useAuth } from "@clerk/react";
import { Link } from "react-router-dom";
import {
	ArrowRight,
	BookOpen,
	Compass,
	Globe2,
	LoaderCircle,
	UserRound
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { courseApi, type Course } from "@/lib/courses";

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
	const { isLoaded, isSignedIn, getToken } = useAuth();
	const [courses, setCourses] = useState<Course[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");
	const [retryCount, setRetryCount] = useState(0);

	useEffect(() => {
		let active = true;
		if (!isLoaded) return;
		Promise.resolve(isSignedIn ? getToken() : null)
			.then((token) => courseApi<Course[]>("/courses", token))
			.then((result) => {
				if (active) setCourses(result);
			})
			.catch((cause: unknown) => {
				if (active)
					setError(
						cause instanceof Error ?
							cause.message
						:	"Courses could not be loaded."
					);
			})
			.finally(() => {
				if (active) setLoading(false);
			});
		return () => {
			active = false;
		};
	}, [getToken, isLoaded, isSignedIn, retryCount]);

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
						Explore published courses below. Course lessons are structured with
						the same learning experience used in preview.
					</p>
				</div>
			</section>

			<section
				aria-labelledby='course-catalogue'
				className='border-t border-border px-6 py-16 md:px-12'>
				<div className='mx-auto max-w-6xl'>
					<div className='flex flex-col justify-between gap-4 sm:flex-row sm:items-end'>
						<div>
							<p className='text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground'>
								Course catalogue
							</p>
							<h2
								id='course-catalogue'
								className='mt-2 text-3xl font-medium tracking-tight sm:text-4xl'>
								Explore published courses.
							</h2>
							<p className='mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground'>
								Practical courses created for people navigating the modern world
								of work.
							</p>
						</div>
					</div>

					{loading ?
						<div className='grid min-h-48 place-items-center'>
							<LoaderCircle
								className='size-6 animate-spin text-muted-foreground'
								aria-label='Loading courses'
							/>
						</div>
					: error ?
						<div className='mt-8 rounded-md border border-destructive/40 bg-destructive/5 p-5'>
							<p role='alert' className='text-sm text-destructive'>
								{error}
							</p>
							<Button
								variant='outline'
								className='mt-3'
								onClick={() => {
									setLoading(true);
									setError("");
									setRetryCount((count) => count + 1);
								}}>
								Try again
							</Button>
						</div>
					: courses.length ?
						<div className='mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3'>
							{courses.map((course) => (
								<Link
									key={course.id}
									to={`/courses/${course.id}`}
									className='group overflow-hidden rounded-lg border border-border bg-background transition-shadow hover:shadow-md'>
									{course.thumbnailAsset?.url ?
										<img
											src={course.thumbnailAsset.url}
											alt=''
											className='aspect-[16/9] w-full border-b border-border object-cover'
										/>
									:	<div className='grid aspect-[16/9] place-items-center border-b border-border bg-muted/30 text-muted-foreground'>
											<BookOpen className='size-8' aria-hidden='true' />
										</div>
									}
									<div className='p-5'>
										<div className='flex items-center justify-between gap-3'>
											<Badge variant='outline'>Course</Badge>
											<span className='text-sm font-medium'>
												{course.price === 0 ?
													"Free"
												:	`KSh ${course.price.toLocaleString()}`}
											</span>
										</div>
										<h3 className='mt-4 line-clamp-2 text-lg font-semibold group-hover:underline'>
											{course.title}
										</h3>
										<p className='mt-2 line-clamp-3 min-h-[4.5rem] text-sm leading-relaxed text-muted-foreground'>
											{course.description}
										</p>
										<p className='mt-4 text-xs text-muted-foreground'>
											By {course.creatorName || "Besire creator"}
										</p>
										<p className='mt-5 inline-flex items-center gap-2 text-sm font-medium'>
											{course.price === 0 || course.accessGranted ?
												"Go to course"
											:	"Buy course"}
											<ArrowRight
												className='size-4 transition-transform group-hover:translate-x-0.5'
												aria-hidden='true'
											/>
										</p>
									</div>
								</Link>
							))}
						</div>
					:	<div className='mt-8 rounded-md border border-dashed border-border px-6 py-14 text-center'>
							<BookOpen
								className='mx-auto size-8 text-muted-foreground'
								aria-hidden='true'
							/>
							<h3 className='mt-4 font-medium'>No published courses yet</h3>
							<p className='mt-2 text-sm text-muted-foreground'>
								Published courses will appear here when they are ready.
							</p>
						</div>
					}
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
