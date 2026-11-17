import { useMemo, useState } from "react";
import { BookOpen, Play, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Course, CourseLesson, LessonBlock } from "@/lib/courses";

interface CoursePlayerProps {
	course: Course;
}

const ordered = <T extends { position: number }>(items: T[]) =>
	[...items].sort((a, b) => a.position - b.position);

function LessonContent({ block }: { block: LessonBlock }) {
	if (block.type === "text") {
		return (
			<div className="whitespace-pre-wrap text-sm leading-7 text-foreground sm:text-base">
				{block.data.text}
			</div>
		);
	}

	if (block.type === "image") {
		return (
			<figure className="space-y-2">
				{block.asset?.url ? (
					<img
						src={block.asset.url}
						alt={block.data.caption || block.asset.fileName}
						className="h-auto max-h-[640px] w-full rounded-md border border-border object-contain"
					/>
				) : (
					<div className="grid min-h-40 place-items-center rounded-md border border-dashed border-border text-sm text-muted-foreground">
						Image unavailable
					</div>
				)}
				{block.data.caption && (
					<figcaption className="text-sm text-muted-foreground">
						{block.data.caption}
					</figcaption>
				)}
			</figure>
		);
	}

	return (
		<figure className="space-y-2">
			{block.asset?.url ? (
				<video
					className="w-full rounded-md border border-border bg-black"
					src={block.asset.url}
					controls
					preload="metadata"
				/>
			) : (
				<div className="grid min-h-40 place-items-center rounded-md border border-dashed border-border text-sm text-muted-foreground">
					Video unavailable
				</div>
			)}
			{block.data.title && (
				<figcaption className="font-medium">{block.data.title}</figcaption>
			)}
			{block.data.description && (
				<p className="text-sm leading-relaxed text-muted-foreground">
					{block.data.description}
				</p>
			)}
		</figure>
	);
}

function LessonBody({ lesson }: { lesson: CourseLesson }) {
	const blocks = useMemo(() => ordered(lesson.blocks ?? []), [lesson.blocks]);

	if (!blocks.length) {
		return (
			<p className="rounded-md border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
				This lesson does not have content yet.
			</p>
		);
	}

	return (
		<div className="space-y-7">
			{blocks.map((block) => (
				<section key={block.id} aria-label={`${block.type} content block`}>
					<LessonContent block={block} />
				</section>
			))}
		</div>
	);
}

export default function CoursePlayer({ course }: CoursePlayerProps) {
	const modules = useMemo(() => ordered(course.modules ?? []), [course.modules]);
	const lessons = useMemo(
		() => modules.flatMap((module) => ordered(module.lessons ?? [])),
		[modules],
	);
	const [selectedLessonId, setSelectedLessonId] = useState<string | null>(
		lessons[0]?.id ?? null,
	);
	const selectedLesson =
		lessons.find((lesson) => lesson.id === selectedLessonId) ?? lessons[0] ?? null;

	return (
		<div className="grid min-h-[560px] overflow-hidden rounded-lg border border-border bg-background lg:grid-cols-[280px_minmax(0,1fr)]">
			<aside className="border-b border-border bg-muted/30 p-4 lg:border-r lg:border-b-0">
				<div className="mb-4 flex items-center gap-2">
					<BookOpen className="size-4 text-muted-foreground" aria-hidden="true" />
					<span className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
						Course contents
					</span>
				</div>
				{modules.length === 0 ? (
					<p className="text-sm text-muted-foreground">No modules yet.</p>
				) : (
					<div className="space-y-5">
						{modules.map((module, moduleIndex) => (
							<div key={module.id}>
								<p className="mb-2 text-xs font-semibold text-muted-foreground">
									{String(moduleIndex + 1).padStart(2, "0")} · {module.title}
								</p>
								<div className="space-y-1">
									{ordered(module.lessons ?? []).map((lesson) => (
										<Button
											key={lesson.id}
											variant={selectedLesson?.id === lesson.id ? "secondary" : "ghost"}
											className="h-auto min-h-9 w-full justify-start whitespace-normal px-2 py-2 text-left text-sm"
											onClick={() => setSelectedLessonId(lesson.id)}
										>
											<Play className="size-3 shrink-0" aria-hidden="true" />
											<span>{lesson.title || "Untitled lesson"}</span>
										</Button>
									))}
								</div>
							</div>
						))}
					</div>
				)}
			</aside>

			<article className="min-w-0 p-5 sm:p-8 lg:p-10">
				<div className="mx-auto max-w-3xl">
					{course.thumbnailAsset?.url && (
						<img
							src={course.thumbnailAsset.url}
							alt=""
							className="mb-8 max-h-64 w-full rounded-md border border-border object-cover"
						/>
					)}
					<p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
						{course.creatorName || "Besire course"}
					</p>
					<h1 className="mt-2 text-3xl font-medium tracking-tight sm:text-4xl">
						{course.title || "Untitled course"}
					</h1>
					{course.description && (
						<p className="mt-3 max-w-2xl leading-relaxed text-muted-foreground">
							{course.description}
						</p>
					)}
					<div className="my-8 border-t border-border" />
					{selectedLesson ? (
						<>
							<div className="mb-6">
								<p className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">
									<Video className="size-4" aria-hidden="true" />
									Lesson
								</p>
								<h2 className="mt-2 text-2xl font-semibold tracking-tight">
									{selectedLesson.title || "Untitled lesson"}
								</h2>
							</div>
							<LessonBody lesson={selectedLesson} />
						</>
					) : (
						<p className="rounded-md border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
							Add a module and lesson to preview your course content.
						</p>
					)}
				</div>
			</article>
		</div>
	);
}
