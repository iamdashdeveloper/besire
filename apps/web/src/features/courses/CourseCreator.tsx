import { useCallback, useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation, useNavigate, useParams } from "react-router-dom";
import {
	ArrowDown,
	ArrowRight,
	ArrowLeft,
	ArrowUp,
	BookOpen,
	BookOpenCheck,
	Check,
	ChevronDown,
	ChevronRight,
	CirclePlus,
	DollarSign,
	GripVertical,
	ImagePlus,
	Layers,
	LayoutDashboard,
	LoaderCircle,
	LogOut,
	MonitorPlay,
	Plus,
	Save,
	Trash2,
	Upload,
	UsersRound,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import CoursePlayer from "@/features/courses/CoursePlayer";
import CourseSales from "@/features/courses/CourseSales";
import {
	CourseApiError,
	courseApi,
	jsonBody,
	uploadFile,
	type Course,
	type CourseAsset,
	type CourseBlockType,
	type CourseLesson,
	type CourseModule,
	type LessonBlock,
} from "@/lib/courses";

type UploadTicket = {
	assetId: string;
	uploadUrl: string;
	headers?: Record<string, string>;
};

const ordered = <T extends { position: number }>(items: T[]) =>
	[...items].sort((a, b) => a.position - b.position);

function ErrorNotice({ message }: { message: string }) {
	return (
		<div role="alert" className="rounded-md border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
			{message}
		</div>
	);
}

function CreatorHome({ mode }: { mode: "manage" | "all" }) {
	const navigate = useNavigate();
	const [courses, setCourses] = useState<Course[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");

	useEffect(() => {
		let cancelled = false;
		const load = async () => {
			try {
				const result = await courseApi<Course[]>("/courses?manage=true", null);
				if (!cancelled) {
					setCourses(result);
					setError("");
				}
			} catch (cause) {
				if (!cancelled) {
					setError(cause instanceof Error ? cause.message : "Could not load your courses.");
				}
			} finally {
				if (!cancelled) setLoading(false);
			}
		};
		void load();
		return () => {
			cancelled = true;
		};
	}, []);

	return (
		<section className="mx-auto w-full max-w-6xl">
			<div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
				<div>
					<p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
						{mode === "manage" ? "Needs attention" : "Course library"}
					</p>
					<h1 className="mt-2 text-3xl font-medium tracking-tight sm:text-4xl">
						{mode === "manage" ? "Manage courses" : "All courses"}
					</h1>
					<p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
						{mode === "manage"
							? "Review drafts, continue editing, and get courses ready to publish."
							: "View and edit every draft and published course in the Besire catalogue."}
					</p>
				</div>
				<Button onClick={() => navigate("/admin/create-course")}>
					<Plus className="size-4" />
					Create course
				</Button>
			</div>
			{error && <div className="mt-6"><ErrorNotice message={error} /></div>}
			{loading ? (
				<div className="grid min-h-48 place-items-center"><LoaderCircle className="size-6 animate-spin text-muted-foreground" /></div>
			) : (mode === "manage" ? courses.filter((course) => course.status === "draft") : courses).length ? (
				<div className="mt-8 divide-y divide-border rounded-lg border border-border bg-background px-5">
					{(mode === "manage" ? courses.filter((course) => course.status === "draft") : courses).map((course) => (
						<Link
							key={course.id}
							to={`/admin/courses/${course.id}`}
							className="flex flex-col gap-4 py-5 transition-colors hover:bg-muted/40 sm:flex-row sm:items-center"
						>
							{course.thumbnailAsset?.url ? (
								<img src={course.thumbnailAsset.url} alt="" className="size-20 rounded-md border border-border object-cover" />
							) : (
								<div className="grid size-20 place-items-center rounded-md border border-dashed border-border bg-muted/40 text-muted-foreground">
									<BookOpen className="size-6" aria-hidden="true" />
								</div>
							)}
							<div className="min-w-0 flex-1">
								<h2 className="truncate font-medium">{course.title || "Untitled course"}</h2>
								<p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{course.description || "Add a course description."}</p>
							</div>
							<Badge variant="outline" className="w-fit capitalize">{course.status}</Badge>
							<span className="text-sm text-muted-foreground">{course.price === 0 ? "Free" : `KSh ${course.price.toLocaleString()}`}</span>
							<ChevronRight className="hidden size-4 text-muted-foreground sm:block" aria-hidden="true" />
						</Link>
					))}
				</div>
			) : (
				<div className="mt-8 rounded-lg border border-dashed border-border bg-background px-6 py-16 text-center">
					<BookOpen className="mx-auto size-8 text-muted-foreground" aria-hidden="true" />
					<h2 className="mt-4 font-medium">{mode === "manage" ? "No drafts to manage" : "Start your course library"}</h2>
					<p className="mt-2 text-sm text-muted-foreground">
						{mode === "manage"
							? "New courses begin as drafts and will appear here until they are published."
							: "Your drafts and published courses will appear here."}
					</p>
					{mode === "manage" && (
						<Button variant="outline" className="mt-5" onClick={() => navigate("/admin/all-courses")}>
							View all courses <ArrowRight className="size-4" />
						</Button>
					)}
				</div>
			)}
		</section>
	);
}

function DashboardOverview() {
	const navigate = useNavigate();
	const [courses, setCourses] = useState<Course[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");

	useEffect(() => {
		let cancelled = false;
		const load = async () => {
			try {
				const result = await courseApi<Course[]>("/courses?manage=true", null);
				if (!cancelled) setCourses(result);
			} catch (cause) {
				if (!cancelled) setError(cause instanceof Error ? cause.message : "Could not load dashboard data.");
			} finally {
				if (!cancelled) setLoading(false);
			}
		};
		void load();
		return () => {
			cancelled = true;
		};
	}, []);

	const published = courses.filter((course) => course.status === "published").length;
	const drafts = courses.length - published;

	return (
		<section className="mx-auto w-full max-w-6xl">
			<div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
				<div>
					<p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Besire administration</p>
					<h1 className="mt-2 text-3xl font-medium tracking-tight sm:text-4xl">Dashboard</h1>
					<p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
						Your workspace for managing learning content and courses.
					</p>
				</div>
				<Button onClick={() => navigate("/admin/create-course")}>
					<CirclePlus className="size-4" /> Create course
				</Button>
			</div>

			{error && <div className="mt-6"><ErrorNotice message={error} /></div>}
			<div className="mt-8 grid gap-4 sm:grid-cols-3">
				{[
					{ label: "Total courses", value: loading ? "—" : courses.length, icon: BookOpen },
					{ label: "Published", value: loading ? "—" : published, icon: BookOpenCheck },
					{ label: "Drafts", value: loading ? "—" : drafts, icon: Layers },
				].map(({ label, value, icon: Icon }) => (
					<div key={label} className="rounded-lg border border-border bg-background p-5">
						<div className="flex items-center justify-between text-sm text-muted-foreground">
							{label}<Icon className="size-4" aria-hidden="true" />
						</div>
						<p className="mt-4 text-3xl font-medium tabular-nums">{value}</p>
					</div>
				))}
			</div>

			<div className="mt-8 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
				<div className="rounded-lg border border-border bg-background p-5 sm:p-6">
					<div className="flex items-center justify-between gap-4">
						<div>
							<h2 className="font-medium">Recently updated</h2>
							<p className="mt-1 text-sm text-muted-foreground">Continue where you left off.</p>
						</div>
						<Link to="/admin/all-courses" className="text-sm font-medium hover:underline">All courses</Link>
					</div>
					{loading ? (
						<div className="grid min-h-36 place-items-center"><LoaderCircle className="size-5 animate-spin text-muted-foreground" /></div>
					) : courses.length ? (
						<div className="mt-5 divide-y divide-border border-y border-border">
							{[...courses].sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt)).slice(0, 5).map((course) => (
								<Link key={course.id} to={`/admin/courses/${course.id}`} className="flex items-center gap-3 py-4 hover:bg-muted/40">
									<div className="grid size-10 shrink-0 place-items-center rounded-md bg-muted text-muted-foreground">
										<BookOpen className="size-4" aria-hidden="true" />
									</div>
									<div className="min-w-0 flex-1">
										<p className="truncate text-sm font-medium">{course.title || "Untitled course"}</p>
										<p className="mt-1 text-xs text-muted-foreground">
											Updated {Number.isNaN(Date.parse(course.updatedAt)) ? "recently" : new Date(course.updatedAt).toLocaleDateString()}
										</p>
									</div>
									<Badge variant="outline" className="capitalize">{course.status}</Badge>
									<ChevronRight className="size-4 text-muted-foreground" aria-hidden="true" />
								</Link>
							))}
						</div>
					) : (
						<div className="py-12 text-center">
							<BookOpen className="mx-auto size-7 text-muted-foreground" aria-hidden="true" />
							<p className="mt-3 text-sm text-muted-foreground">Your courses will appear here.</p>
							<Link to="/admin/create-course" className="mt-3 inline-block text-sm font-medium underline-offset-4 hover:underline">Create your first course</Link>
						</div>
					)}
				</div>

				<div className="space-y-4">
					<Link to="/admin/create-course" className="group block rounded-lg border border-border bg-background p-5 transition-colors hover:bg-muted/40">
						<div className="flex size-10 items-center justify-center rounded-md bg-muted"><CirclePlus className="size-5" /></div>
						<h2 className="mt-4 font-medium">Create a course</h2>
						<p className="mt-1 text-sm leading-relaxed text-muted-foreground">Start a draft, organize lessons, and publish when it is ready.</p>
						<span className="mt-4 inline-flex items-center gap-2 text-sm font-medium">Get started <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" /></span>
					</Link>
					<div className="rounded-lg border border-dashed border-border p-5">
						<div className="flex items-center gap-2 text-sm font-medium"><UsersRound className="size-4" /> Community management</div>
						<p className="mt-2 text-sm leading-relaxed text-muted-foreground">Classlists and cohorts will be available here as those tools are developed.</p>
						<Badge variant="outline" className="mt-3">Coming soon</Badge>
					</div>
				</div>
			</div>

			<section aria-labelledby="dashboard-course-catalogue" className="mt-10">
				<div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
					<div>
						<p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">Course catalogue</p>
						<h2 id="dashboard-course-catalogue" className="mt-2 text-2xl font-medium tracking-tight">All courses</h2>
						<p className="mt-1 text-sm text-muted-foreground">Drafts and published courses from your course library.</p>
					</div>
					<Link to="/admin/all-courses" className="text-sm font-medium hover:underline">Open full course list</Link>
				</div>
				{loading ? (
					<div className="grid min-h-40 place-items-center"><LoaderCircle className="size-5 animate-spin text-muted-foreground" /></div>
				) : courses.length ? (
					<div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
						{[...courses].sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt)).map((course) => (
							<Link
								key={course.id}
								to={`/admin/courses/${course.id}`}
								className="group overflow-hidden rounded-lg border border-border bg-background transition-colors hover:bg-muted/20"
							>
								{course.thumbnailAsset?.url ? (
									<img src={course.thumbnailAsset.url} alt="" className="aspect-[16/9] w-full border-b border-border object-cover" />
								) : (
									<div className="grid aspect-[16/9] place-items-center border-b border-border bg-muted/30 text-muted-foreground">
										<BookOpen className="size-8" aria-hidden="true" />
									</div>
								)}
								<div className="p-4">
									<div className="flex items-center justify-between gap-3">
										<Badge variant="outline" className="capitalize">{course.status}</Badge>
										<span className="text-sm text-muted-foreground">{course.price === 0 ? "Free" : `KSh ${course.price.toLocaleString()}`}</span>
									</div>
									<h3 className="mt-3 truncate font-medium group-hover:underline">{course.title || "Untitled course"}</h3>
									<p className="mt-1 line-clamp-2 min-h-10 text-sm leading-relaxed text-muted-foreground">{course.description || "Add a course description."}</p>
								</div>
							</Link>
						))}
					</div>
				) : (
					<div className="mt-5 rounded-lg border border-dashed border-border bg-background px-6 py-12 text-center">
						<BookOpen className="mx-auto size-7 text-muted-foreground" aria-hidden="true" />
						<p className="mt-3 text-sm text-muted-foreground">No courses are available in the admin catalogue yet.</p>
					</div>
				)}
			</section>
		</section>
	);
}

function CreateCourseStart() {
	const navigate = useNavigate();
	const [creating, setCreating] = useState(false);
	const [error, setError] = useState("");

	const createCourse = async () => {
		setCreating(true);
		setError("");
		try {
			const course = await courseApi<Course>("/courses", null, {
				method: "POST",
				body: jsonBody({ title: "Untitled course", description: "", price: 0 }),
			});
			navigate(`/admin/courses/${course.id}`);
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : "Could not create the course.");
		} finally {
			setCreating(false);
		}
	};

	return (
		<section className="mx-auto w-full max-w-3xl">
			<p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Course authoring</p>
			<h1 className="mt-2 text-3xl font-medium tracking-tight sm:text-4xl">Create a course</h1>
			<p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
				Start with a draft, then add course details, modules, lessons, and learning materials in the editor.
			</p>
			{error && <div className="mt-6"><ErrorNotice message={error} /></div>}
			<div className="mt-8 rounded-lg border border-border bg-background p-6 sm:p-8">
				<div className="flex size-11 items-center justify-center rounded-md bg-muted"><BookOpen className="size-5" /></div>
				<h2 className="mt-4 text-lg font-medium">Your new course starts as a draft</h2>
				<p className="mt-2 text-sm leading-relaxed text-muted-foreground">
					You can save your work as you build. The course only becomes visible in the learner catalogue after you publish it.
				</p>
				<Button className="mt-6" onClick={() => void createCourse()} disabled={creating}>
					{creating ? <LoaderCircle className="size-4 animate-spin" /> : <CirclePlus className="size-4" />}
					Start course draft
				</Button>
			</div>
		</section>
	);
}

function AdminShell({ children, onLogout }: { children: React.ReactNode; onLogout: () => void }) {
	const location = useLocation();
	const isEditingCourse = /^\/admin\/courses\/[^/]+$/.test(location.pathname);
	const linkClass = ({ isActive }: { isActive: boolean }) =>
		`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors ${
			isActive ? "bg-muted font-medium text-foreground" : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
		}`;
	const courseLinkClass = ({ isActive }: { isActive: boolean }) =>
		linkClass({ isActive: isActive || isEditingCourse });

	return (
		<div className="min-h-screen bg-muted/20">
			<header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-border bg-background/95 px-4 backdrop-blur sm:px-6">
				<Link to="/admin" className="font-medium tracking-tight" aria-label="Besire admin dashboard">
					Besire <span className="ml-2 text-xs font-normal uppercase tracking-[0.16em] text-muted-foreground">Admin</span>
				</Link>
				<div className="flex items-center gap-3">
					<Link to="/" className="hidden text-sm text-muted-foreground hover:text-foreground sm:inline">View website</Link>
					<Button variant="outline" size="sm" onClick={onLogout}>
						<LogOut className="size-4" /> Sign out
					</Button>
				</div>
			</header>
			<div className="mx-auto flex max-w-[1600px]">
				<aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-60 shrink-0 flex-col border-r border-border bg-background px-4 py-6 md:flex">
					<p className="px-3 text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">Workspace</p>
					<nav aria-label="Admin dashboard" className="mt-3 space-y-1">
						<NavLink to="/admin" end className={linkClass}><LayoutDashboard className="size-4" /> Dashboard</NavLink>
					</nav>
					<p className="mt-8 px-3 text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">Courses</p>
					<nav aria-label="Course management" className="mt-3 space-y-1">
						<NavLink to="/admin/create-course" className={linkClass}><CirclePlus className="size-4" /> Create course</NavLink>
						<NavLink to="/admin/manage-courses" className={courseLinkClass}><Layers className="size-4" /> Manage courses</NavLink>
						<NavLink to="/admin/all-courses" className={linkClass}><BookOpen className="size-4" /> All courses</NavLink>
						<NavLink to="/admin/course-sales" className={linkClass}><DollarSign className="size-4" /> Course sales</NavLink>
					</nav>
					<p className="mt-8 px-3 text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">Community</p>
					<div className="mt-3 space-y-1">
						<div className="flex items-center justify-between rounded-md px-3 py-2.5 text-sm text-muted-foreground/70">
							<span className="flex items-center gap-3"><UsersRound className="size-4" /> Classlists</span><span className="text-[10px]">Soon</span>
						</div>
						<div className="flex items-center justify-between rounded-md px-3 py-2.5 text-sm text-muted-foreground/70">
							<span className="flex items-center gap-3"><UsersRound className="size-4" /> Cohorts</span><span className="text-[10px]">Soon</span>
						</div>
					</div>
				</aside>
				<div className="min-w-0 flex-1">
					<nav aria-label="Admin dashboard" className="flex gap-1 overflow-x-auto border-b border-border bg-background px-3 py-2 md:hidden">
						{[
							{ to: "/admin", label: "Dashboard", end: true },
							{ to: "/admin/create-course", label: "Create" },
							{ to: "/admin/manage-courses", label: "Manage" },
							{ to: "/admin/all-courses", label: "All courses" },
							{ to: "/admin/course-sales", label: "Sales" },
						].map((item) => (
							<NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => `${linkClass({ isActive: isActive || (isEditingCourse && item.to === "/admin/manage-courses") })} shrink-0 px-3 py-2`}>
								{item.label}
							</NavLink>
						))}
					</nav>
					<main className={`min-h-[calc(100vh-4rem)] ${isEditingCourse ? "p-0" : "p-5 sm:p-7 lg:p-10"}`}>{children}</main>
				</div>
			</div>
		</div>
	);
}

type DragItem = { kind: "module" | "lesson" | "block"; id: string; parentId: string };

function CourseEditor({ courseId }: { courseId: string }) {
	const navigate = useNavigate();
	const [course, setCourse] = useState<Course | null>(null);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState("");
	const [notice, setNotice] = useState("");
	const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);
	const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
	const [openModules, setOpenModules] = useState<string[]>([]);
	const [dragItem, setDragItem] = useState<DragItem | null>(null);
	const [preview, setPreview] = useState(false);
	const [uploadProgress, setUploadProgress] = useState<number | null>(null);
	const infoFormRef = useRef<HTMLFormElement>(null);

	const applyCourse = useCallback((loaded: Course) => {
		setCourse(loaded);
		setSelectedModuleId((previous) =>
			previous && loaded.modules.some((module) => module.id === previous)
				? previous
				: loaded.modules[0]?.id ?? null,
		);
		setOpenModules(loaded.modules.map((module) => module.id));
		const lessons = loaded.modules.flatMap((module) => module.lessons);
		setSelectedLessonId((previous) =>
			previous && lessons.some((lesson) => lesson.id === previous)
				? previous
				: lessons[0]?.id ?? null,
		);
	}, []);

	const loadCourse = useCallback(async () => {
		try {
			const loaded = await courseApi<Course>(`/courses/${courseId}`, null);
			applyCourse(loaded);
			setError("");
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : "Could not load this course.");
		} finally {
			setLoading(false);
		}
	}, [applyCourse, courseId]);

	useEffect(() => {
		let cancelled = false;
		const load = async () => {
			try {
				const loaded = await courseApi<Course>(`/courses/${courseId}`, null);
				if (!cancelled) {
					applyCourse(loaded);
					setError("");
				}
			} catch (cause) {
				if (!cancelled) {
					setError(cause instanceof Error ? cause.message : "Could not load this course.");
				}
			} finally {
				if (!cancelled) setLoading(false);
			}
		};
		void load();
		return () => {
			cancelled = true;
		};
	}, [applyCourse, courseId]);

	const authenticatedRequest = async <T,>(
		path: string,
		options: RequestInit = {},
	): Promise<T> => {
		return courseApi<T>(path, null, options);
	};

	const runAction = async (action: () => Promise<void>, success?: string): Promise<boolean> => {
		setError("");
		setNotice("");
		try {
			await action();
			if (success) setNotice(success);
			return true;
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : "The change could not be saved.");
			return false;
		}
	};

	const saveCourseInfo = async (form: FormData, openPreview = false): Promise<boolean> => {
		const title = String(form.get("title") ?? "").trim();
		const description = String(form.get("description") ?? "");
		const price = Number(form.get("price") ?? 0);
		const saved = await runAction(async () => {
			setSaving(true);
			try {
				const updated = await authenticatedRequest<Course>(`/courses/${courseId}`, {
					method: "PATCH",
					body: jsonBody({ title, description, price }),
				});
				setCourse(updated);
			} finally {
				setSaving(false);
			}
		}, "Course information saved.");
		if (saved && openPreview) setPreview(true);
		return saved;
	};

	const addModule = async () => {
		await runAction(async () => {
			const module = await authenticatedRequest<CourseModule>(`/courses/${courseId}/modules`, {
				method: "POST",
				body: jsonBody({ title: `Module ${(course?.modules.length ?? 0) + 1}` }),
			});
			await loadCourse();
			setSelectedModuleId(module.id);
			setOpenModules((items) => [...items, module.id]);
		});
	};

	const addLesson = async (moduleId: string) => {
		const module = course?.modules.find((item) => item.id === moduleId);
		await runAction(async () => {
			const lesson = await authenticatedRequest<CourseLesson>(`/modules/${moduleId}/lessons`, {
				method: "POST",
				body: jsonBody({ title: `Lesson ${(module?.lessons.length ?? 0) + 1}` }),
			});
			await loadCourse();
			setSelectedModuleId(moduleId);
			setSelectedLessonId(lesson.id);
			setOpenModules((items) => items.includes(moduleId) ? items : [...items, moduleId]);
		});
	};

	const updateModule = async (moduleId: string, title: string) => {
		await runAction(async () => {
			await authenticatedRequest(`/modules/${moduleId}`, {
				method: "PATCH",
				body: jsonBody({ title }),
			});
			await loadCourse();
		});
	};

	const updateLesson = async (lessonId: string, title: string) => {
		await runAction(async () => {
			await authenticatedRequest(`/lessons/${lessonId}`, {
				method: "PATCH",
				body: jsonBody({ title }),
			});
			await loadCourse();
		});
	};

	const deleteModule = async (moduleId: string) => {
		if (!window.confirm("Delete this module and all of its lessons?")) return;
		await runAction(async () => {
			await authenticatedRequest(`/modules/${moduleId}`, { method: "DELETE" });
			await loadCourse();
		}, "Module deleted.");
	};

	const deleteLesson = async (lessonId: string) => {
		if (!window.confirm("Delete this lesson and its content blocks?")) return;
		await runAction(async () => {
			await authenticatedRequest(`/lessons/${lessonId}`, { method: "DELETE" });
			await loadCourse();
		}, "Lesson deleted.");
	};

	const createBlock = async (lessonId: string, type: CourseBlockType) => {
		await runAction(async () => {
			await authenticatedRequest<LessonBlock>(`/lessons/${lessonId}/blocks`, {
				method: "POST",
				body: jsonBody({
					type,
					data: type === "text" ? { text: "" } : {},
				}),
			});
			await loadCourse();
		});
	};

	const updateBlock = async (block: LessonBlock, data: Record<string, string>) => {
		await runAction(async () => {
			await authenticatedRequest(`/blocks/${block.id}`, {
				method: "PATCH",
				body: jsonBody({ data }),
			});
			await loadCourse();
		}, "Block saved.");
	};

	const deleteBlock = async (blockId: string) => {
		await runAction(async () => {
			await authenticatedRequest(`/blocks/${blockId}`, { method: "DELETE" });
			await loadCourse();
		}, "Block removed.");
	};

	const reorder = async (item: DragItem, targetId: string) => {
		if (item.id === targetId || !course) return;
		await runAction(async () => {
			if (item.kind === "module") {
				const modules = ordered(course.modules);
				const from = modules.findIndex((module) => module.id === item.id);
				const to = modules.findIndex((module) => module.id === targetId);
				if (from < 0 || to < 0) return;
				const [moving] = modules.splice(from, 1);
				modules.splice(to, 0, moving);
				await authenticatedRequest(`/courses/${courseId}/modules/reorder`, {
					method: "PUT",
					body: jsonBody({ ids: modules.map((module) => module.id) }),
				});
			} else if (item.kind === "lesson") {
				const module = course.modules.find((entry) => entry.id === item.parentId);
				if (!module) return;
				const lessons = ordered(module.lessons);
				const from = lessons.findIndex((lesson) => lesson.id === item.id);
				const to = lessons.findIndex((lesson) => lesson.id === targetId);
				if (from < 0 || to < 0) return;
				const [moving] = lessons.splice(from, 1);
				lessons.splice(to, 0, moving);
				await authenticatedRequest(`/modules/${module.id}/lessons/reorder`, {
					method: "PUT",
					body: jsonBody({ ids: lessons.map((lesson) => lesson.id) }),
				});
			} else {
				const lesson = course.modules.flatMap((module) => module.lessons).find((entry) => entry.id === item.parentId);
				if (!lesson) return;
				const blocks = ordered(lesson.blocks);
				const from = blocks.findIndex((block) => block.id === item.id);
				const to = blocks.findIndex((block) => block.id === targetId);
				if (from < 0 || to < 0) return;
				const [moving] = blocks.splice(from, 1);
				blocks.splice(to, 0, moving);
				await authenticatedRequest(`/lessons/${lesson.id}/blocks/reorder`, {
					method: "PUT",
					body: jsonBody({ ids: blocks.map((block) => block.id) }),
				});
			}
			await loadCourse();
		}, "Order updated.");
	};

	const uploadAsset = async (file: File, purpose: "thumbnail" | "image" | "video") => {
		setUploadProgress(0);
		setError("");
		try {
			const ticket = await authenticatedRequest<UploadTicket>("/assets/upload-url", {
				method: "POST",
				body: jsonBody({
					courseId,
					fileName: file.name,
					contentType: file.type,
					size: file.size,
					purpose,
				}),
			});
			await uploadFile(ticket.uploadUrl, file, ticket.headers ?? {}, setUploadProgress);
			const asset = await authenticatedRequest<CourseAsset>(`/assets/${ticket.assetId}/complete`, {
				method: "POST",
			});
			return asset;
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : "File upload failed.");
			throw cause;
		} finally {
			setUploadProgress(null);
		}
	};

	const uploadThumbnail = async (file: File) => {
		await runAction(async () => {
			const previous = course?.thumbnailAsset;
			const asset = await uploadAsset(file, "thumbnail");
			const updated = await authenticatedRequest<Course>(`/courses/${courseId}`, {
				method: "PATCH",
				body: jsonBody({ thumbnailAssetId: asset.id }),
			});
			setCourse(updated);
			if (previous) await removeAsset(previous.id);
		}, "Thumbnail uploaded.");
	};

	const removeAsset = async (assetId: string) => {
		await authenticatedRequest(`/assets/${assetId}`, { method: "DELETE" });
	};

	const publish = async () => {
		const form = infoFormRef.current;
		if (!form?.reportValidity()) return;
		const saved = await saveCourseInfo(new FormData(form));
		if (!saved) return;
		await runAction(async () => {
			const updated = await authenticatedRequest<Course>(`/courses/${courseId}/publish`, { method: "POST" });
			setCourse(updated);
		}, "Course published.");
	};

	const selectedModule = course?.modules.find((module) => module.id === selectedModuleId) ?? null;
	const selectedLesson = selectedModule?.lessons.find((lesson) => lesson.id === selectedLessonId) ?? null;

	if (loading) {
		return <div className="grid min-h-[70vh] place-items-center"><LoaderCircle className="size-6 animate-spin text-muted-foreground" /></div>;
	}
	if (error && !course) {
		return <main className="mx-auto max-w-3xl px-6 pt-28"><ErrorNotice message={error} /></main>;
	}
	if (!course) return null;

	return (
		<main className="min-h-screen bg-muted/20">
			<div className="sticky top-16 z-30 border-y border-border bg-background/95 px-4 py-3 backdrop-blur sm:px-6 lg:px-10">
				<div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-3">
					<div className="flex min-w-0 items-center gap-3">
						<Button variant="ghost" size="icon" aria-label="Back to courses" onClick={() => navigate("/admin/manage-courses")}>
							<ArrowLeft className="size-4" />
						</Button>
						<div className="min-w-0">
							<p className="truncate text-sm font-medium">{course.title || "Untitled course"}</p>
							<p className="text-xs text-muted-foreground">Curriculum saves as you edit. Save course details before leaving.</p>
						</div>
						<Badge variant="outline" className="capitalize">{course.status}</Badge>
					</div>
					<div className="flex items-center gap-2">
						<Button
							variant="outline"
							onClick={() => {
								const form = infoFormRef.current;
								if (!form?.reportValidity()) return;
								void saveCourseInfo(new FormData(form), true);
							}}
						>
							<MonitorPlay className="size-4" /> Preview
						</Button>
						<Button variant="outline" onClick={() => infoFormRef.current?.requestSubmit()} disabled={saving}>
							<Save className="size-4" /> Save draft
						</Button>
						<Button onClick={() => void publish()} disabled={course.status === "published"}>
							<Check className="size-4" /> Publish
						</Button>
					</div>
				</div>
			</div>

			<div className="mx-auto grid max-w-[1440px] gap-5 px-4 py-6 sm:px-6 lg:grid-cols-[300px_minmax(0,1fr)] lg:px-10">
				<aside className="h-fit rounded-lg border border-border bg-background">
					<div className="flex items-center justify-between border-b border-border p-4">
						<div>
							<p className="text-sm font-semibold">Course content</p>
							<p className="mt-1 text-xs text-muted-foreground">Drag handles to reorder</p>
						</div>
						<Button size="sm" variant="outline" onClick={() => void addModule()}>
							<Plus className="size-3.5" /> Module
						</Button>
					</div>
					<div className="max-h-[64vh] space-y-2 overflow-y-auto p-3">
						{ordered(course.modules).map((module, moduleIndex) => (
							<div
								key={module.id}
								className={`rounded-md border ${selectedModuleId === module.id ? "border-ring" : "border-border"}`}
								onDragOver={(event) => event.preventDefault()}
								onDrop={(event) => {
									event.preventDefault();
									if (dragItem?.kind === "module") void reorder(dragItem, module.id);
									setDragItem(null);
								}}
							>
								<div className="flex items-center gap-1 px-2 py-1.5">
									<button
										type="button"
										draggable
										onDragStart={() => setDragItem({ kind: "module", id: module.id, parentId: courseId })}
										onDragEnd={() => setDragItem(null)}
										className="cursor-grab rounded p-1 text-muted-foreground hover:bg-muted active:cursor-grabbing"
										aria-label={`Reorder ${module.title}`}
									>
										<GripVertical className="size-4" />
									</button>
									<Button
										size="icon"
										variant="ghost"
										aria-label="Move module up"
										disabled={moduleIndex === 0}
										onClick={() => {
											const modules = ordered(course.modules);
											if (moduleIndex > 0) void reorder(
												{ kind: "module", id: module.id, parentId: courseId },
												modules[moduleIndex - 1].id,
											);
										}}
									>
										<ArrowUp className="size-3.5" />
									</Button>
									<Button
										size="icon"
										variant="ghost"
										aria-label="Move module down"
										disabled={moduleIndex === course.modules.length - 1}
										onClick={() => {
											const modules = ordered(course.modules);
											if (moduleIndex < modules.length - 1) void reorder(
												{ kind: "module", id: module.id, parentId: courseId },
												modules[moduleIndex + 1].id,
											);
										}}
									>
										<ArrowDown className="size-3.5" />
									</Button>
									<button
										type="button"
										className="flex min-w-0 flex-1 items-center gap-2 text-left"
										onClick={() => {
											setSelectedModuleId(module.id);
											setSelectedLessonId(module.lessons[0]?.id ?? null);
											setOpenModules((items) => items.includes(module.id) ? items.filter((id) => id !== module.id) : [...items, module.id]);
										}}
									>
										{openModules.includes(module.id) ? <ChevronDown className="size-3.5 shrink-0" /> : <ChevronRight className="size-3.5 shrink-0" />}
										<span className="truncate text-xs font-semibold text-muted-foreground">
											{String(moduleIndex + 1).padStart(2, "0")} · {module.title || "Untitled module"}
										</span>
									</button>
									<Button size="icon" variant="ghost" aria-label="Delete module" onClick={() => void deleteModule(module.id)}>
										<Trash2 className="size-3.5" />
									</Button>
								</div>
								{openModules.includes(module.id) && (
									<div className="space-y-1 px-2 pb-2 pl-8">
										{ordered(module.lessons).map((lesson, lessonIndex, lessons) => (
											<div
												key={lesson.id}
												className={`flex items-center gap-1 rounded ${selectedLessonId === lesson.id ? "bg-muted" : ""}`}
												onDragOver={(event) => event.preventDefault()}
												onDrop={(event) => {
													event.preventDefault();
													if (dragItem?.kind === "lesson" && dragItem.parentId === module.id) void reorder(dragItem, lesson.id);
													setDragItem(null);
												}}
											>
												<button
													type="button"
													draggable
													onDragStart={() => setDragItem({ kind: "lesson", id: lesson.id, parentId: module.id })}
													onDragEnd={() => setDragItem(null)}
													className="cursor-grab rounded p-1 text-muted-foreground hover:bg-background active:cursor-grabbing"
													aria-label={`Reorder ${lesson.title}`}
												>
													<GripVertical className="size-3.5" />
												</button>
												<button
													type="button"
													className="min-w-0 flex-1 truncate py-2 text-left text-sm"
													onClick={() => {
														setSelectedModuleId(module.id);
														setSelectedLessonId(lesson.id);
													}}
												>
													{lesson.title || "Untitled lesson"}
												</button>
												<Button
													size="icon"
													variant="ghost"
													aria-label="Move lesson up"
													disabled={lessonIndex === 0}
													onClick={() => {
														if (lessonIndex > 0) void reorder(
															{ kind: "lesson", id: lesson.id, parentId: module.id },
															lessons[lessonIndex - 1].id,
														);
													}}
												>
													<ArrowUp className="size-3" />
												</Button>
												<Button
													size="icon"
													variant="ghost"
													aria-label="Move lesson down"
													disabled={lessonIndex === lessons.length - 1}
													onClick={() => {
														if (lessonIndex < lessons.length - 1) void reorder(
															{ kind: "lesson", id: lesson.id, parentId: module.id },
															lessons[lessonIndex + 1].id,
														);
													}}
												>
													<ArrowDown className="size-3" />
												</Button>
												<Button size="icon" variant="ghost" aria-label="Delete lesson" onClick={() => void deleteLesson(lesson.id)}>
													<Trash2 className="size-3" />
												</Button>
											</div>
										))}
										<Button variant="ghost" size="sm" className="w-full justify-start" onClick={() => void addLesson(module.id)}>
											<Plus className="size-3.5" /> Add lesson
										</Button>
									</div>
								)}
							</div>
						))}
						{!course.modules.length && (
							<p className="px-3 py-7 text-center text-sm text-muted-foreground">Add your first module to begin.</p>
						)}
					</div>
				</aside>

				<div className="min-w-0 space-y-5">
					<form
						ref={infoFormRef}
						className="rounded-lg border border-border bg-background p-5 sm:p-7"
						onSubmit={(event) => {
							event.preventDefault();
							void saveCourseInfo(new FormData(event.currentTarget));
						}}
					>
						<div className="mb-5 flex items-start justify-between gap-4">
							<div>
								<h1 className="text-xl font-semibold">Course information</h1>
								<p className="mt-1 text-sm text-muted-foreground">Add the details learners will see in the catalogue.</p>
							</div>
							<Button type="submit" variant="outline" disabled={saving}>
								{saving ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />}
								Save details
							</Button>
						</div>
						<div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_260px]">
							<div className="space-y-4">
								<label className="block space-y-1.5 text-sm font-medium">
									Course title
									<Input name="title" required maxLength={180} defaultValue={course.title} placeholder="Give your course a clear title" />
								</label>
								<label className="block space-y-1.5 text-sm font-medium">
									Description
									<Textarea name="description" maxLength={6000} defaultValue={course.description} placeholder="What will learners learn?" />
								</label>
								<label className="block max-w-xs space-y-1.5 text-sm font-medium">
									Price (KSh)
									<Input name="price" type="number" min="0" step="1" defaultValue={course.price} />
								</label>
							</div>
							<div className="space-y-2">
								<p className="text-sm font-medium">Course thumbnail</p>
								{course.thumbnailAsset?.url ? (
									<div className="relative">
										<img src={course.thumbnailAsset.url} alt="" className="aspect-video w-full rounded-md border border-border object-cover" />
										<div className="absolute right-2 top-2 flex gap-2">
											<label className="inline-flex min-h-8 cursor-pointer items-center justify-center gap-2 rounded-md bg-background/95 px-3 py-1.5 text-xs font-medium shadow transition-colors hover:bg-muted">
												<Upload className="size-3.5" /> Replace
												<input
												type="file"
												accept="image/*"
												className="sr-only"
												disabled={uploadProgress !== null}
												onChange={(event) => {
													const file = event.currentTarget.files?.[0];
													if (file) void uploadThumbnail(file);
													event.currentTarget.value = "";
												}}
												/>
											</label>
											<Button
												variant="destructive"
												size="sm"
												onClick={() => void runAction(async () => {
												const asset = course.thumbnailAsset;
												const updated = await authenticatedRequest<Course>(`/courses/${courseId}`, {
													method: "PATCH",
													body: jsonBody({ thumbnailAssetId: null }),
												});
												setCourse(updated);
												if (asset) await removeAsset(asset.id);
											}, "Thumbnail removed.")}
											>
											<Trash2 className="size-3.5" /> Remove
											</Button>
										</div>
									</div>
								) : (
									<label className="grid aspect-video cursor-pointer place-items-center rounded-md border border-dashed border-border bg-muted/30 text-center transition-colors hover:bg-muted/60">
										<span className="grid justify-items-center gap-2 px-4 text-sm text-muted-foreground">
											<ImagePlus className="size-6" />
											Upload an image
										</span>
										<input
											type="file"
											accept="image/*"
											className="sr-only"
											disabled={uploadProgress !== null}
											onChange={(event) => {
												const file = event.currentTarget.files?.[0];
												if (file) void uploadThumbnail(file);
												event.currentTarget.value = "";
											}}
										/>
									</label>
								)}
							</div>
						</div>
					</form>

					{error && <ErrorNotice message={error} />}
					{notice && <p role="status" className="rounded-md border border-border bg-background px-4 py-3 text-sm text-muted-foreground">{notice}</p>}
					{uploadProgress !== null && (
						<div className="rounded-md border border-border bg-background p-4">
							<div className="flex items-center justify-between text-sm"><span>Uploading</span><span>{uploadProgress}%</span></div>
							<div className="mt-2 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary transition-all" style={{ width: `${uploadProgress}%` }} /></div>
						</div>
					)}

					<section className="rounded-lg border border-border bg-background p-5 sm:p-7">
						{selectedModule ? (
							<>
								<div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end">
									<label className="flex-1 space-y-1.5 text-sm font-medium">
										Module title
										<Input
											key={`${selectedModule.id}:${selectedModule.title}`}
											defaultValue={selectedModule.title}
											onBlur={(event) => {
												const title = event.currentTarget.value.trim();
												if (title && title !== selectedModule.title) void updateModule(selectedModule.id, title);
											}}
										/>
									</label>
									<Button variant="outline" onClick={() => void addLesson(selectedModule.id)}>
										<Plus className="size-4" /> Add lesson
									</Button>
								</div>
								{selectedLesson ? (
									<div className="space-y-5 border-t border-border pt-5">
										<label className="block space-y-1.5 text-sm font-medium">
											Lesson title
											<Input
												key={`${selectedLesson.id}:${selectedLesson.title}`}
												defaultValue={selectedLesson.title}
												onBlur={(event) => {
													const title = event.currentTarget.value.trim();
													if (title && title !== selectedLesson.title) void updateLesson(selectedLesson.id, title);
												}}
											/>
										</label>
										<div className="flex flex-wrap items-center gap-2">
											<span className="mr-1 text-sm font-medium">Add content</span>
											<Button size="sm" variant="outline" onClick={() => void createBlock(selectedLesson.id, "text")}>Text</Button>
											<label className="inline-flex min-h-8 cursor-pointer items-center justify-center gap-2 rounded-md border border-border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted">
												<Upload className="size-3.5" /> Screenshot
												<input
													type="file"
													accept="image/*"
													className="sr-only"
													disabled={uploadProgress !== null}
													onChange={(event) => {
														const file = event.currentTarget.files?.[0];
														if (file) void addUploadedBlock(file, "image", selectedLesson.id);
														event.currentTarget.value = "";
													}}
												/>
											</label>
											<label className="inline-flex min-h-8 cursor-pointer items-center justify-center gap-2 rounded-md border border-border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted">
												<Upload className="size-3.5" /> Video
												<input
													type="file"
													accept="video/*"
													className="sr-only"
													disabled={uploadProgress !== null}
													onChange={(event) => {
														const file = event.currentTarget.files?.[0];
														if (file) void addUploadedBlock(file, "video", selectedLesson.id);
														event.currentTarget.value = "";
													}}
												/>
											</label>
										</div>

										<div className="space-y-3">
											{ordered(selectedLesson.blocks).map((block, blockIndex) => (
												<div
													key={block.id}
													className={`rounded-md border ${dragItem?.id === block.id ? "border-primary bg-muted/50" : "border-border"} p-4`}
													onDragOver={(event) => event.preventDefault()}
													onDrop={(event) => {
														event.preventDefault();
														if (dragItem?.kind === "block" && dragItem.parentId === selectedLesson.id) void reorder(dragItem, block.id);
														setDragItem(null);
													}}
												>
													<div className="mb-3 flex items-center justify-between gap-2">
														<div className="flex items-center gap-2">
															<button
																type="button"
																draggable
																onDragStart={() => setDragItem({ kind: "block", id: block.id, parentId: selectedLesson.id })}
																onDragEnd={() => setDragItem(null)}
																className="cursor-grab rounded p-1 text-muted-foreground hover:bg-muted active:cursor-grabbing"
																aria-label={`Reorder ${block.type} block`}
															>
																<GripVertical className="size-4" />
															</button>
															<span className="text-sm font-medium capitalize">{block.type === "image" ? "Screenshot" : block.type} block</span>
															<span className="text-xs text-muted-foreground">#{blockIndex + 1}</span>
														</div>
														<div className="flex items-center gap-1">
															<Button
																size="icon"
																variant="ghost"
																aria-label="Move block up"
																disabled={blockIndex === 0}
																onClick={() => {
																	if (blockIndex > 0) {
																		const blocks = ordered(selectedLesson.blocks);
																		[blocks[blockIndex - 1], blocks[blockIndex]] = [blocks[blockIndex], blocks[blockIndex - 1]];
																		void authenticatedRequest(`/lessons/${selectedLesson.id}/blocks/reorder`, {
																			method: "PUT",
																			body: jsonBody({ ids: blocks.map((entry) => entry.id) }),
																		}).then(loadCourse).catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Could not reorder blocks."));
																	}
																}}
															><ArrowUp className="size-4" /></Button>
															<Button
																size="icon"
																variant="ghost"
																aria-label="Move block down"
																disabled={blockIndex === selectedLesson.blocks.length - 1}
																onClick={() => {
																	const blocks = ordered(selectedLesson.blocks);
																	if (blockIndex < blocks.length - 1) {
																		[blocks[blockIndex], blocks[blockIndex + 1]] = [blocks[blockIndex + 1], blocks[blockIndex]];
																		void authenticatedRequest(`/lessons/${selectedLesson.id}/blocks/reorder`, {
																			method: "PUT",
																			body: jsonBody({ ids: blocks.map((entry) => entry.id) }),
																		}).then(loadCourse).catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Could not reorder blocks."));
																	}
																}}
															><ArrowDown className="size-4" /></Button>
															<Button size="icon" variant="ghost" aria-label="Remove content block" onClick={() => void deleteBlock(block.id)}>
																<Trash2 className="size-4" />
															</Button>
														</div>
													</div>
													{block.type === "text" && (
														<Textarea
															key={`${block.id}:${block.data.text ?? ""}`}
															defaultValue={block.data.text ?? ""}
															placeholder="Write the lesson content..."
															onBlur={(event) => {
																const text = event.currentTarget.value;
																if (text !== (block.data.text ?? "")) void updateBlock(block, { ...block.data, text });
															}}
														/>
													)}
													{block.type === "image" && (
														<div className="space-y-3">
															{block.asset?.url && <img src={block.asset.url} alt={block.data.caption || ""} className="max-h-96 w-full rounded-md border border-border object-contain" />}
															<Input
																key={`${block.id}:${block.data.caption ?? ""}`}
																defaultValue={block.data.caption ?? ""}
																placeholder="Optional screenshot caption"
																onBlur={(event) => {
																	const caption = event.currentTarget.value;
																	if (caption !== (block.data.caption ?? "")) void updateBlock(block, { ...block.data, caption });
																}}
															/>
															<label className="inline-flex cursor-pointer items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground">
																<Upload className="size-3.5" /> Replace image
																<input
																	type="file"
																	accept="image/*"
																	className="sr-only"
																	onChange={(event) => {
																		const file = event.currentTarget.files?.[0];
																		if (file) void replaceBlockAsset(block, file, "image");
																		event.currentTarget.value = "";
																	}}
																/>
															</label>
														</div>
													)}
													{block.type === "video" && (
														<div className="space-y-3">
															{block.asset?.url && <video src={block.asset.url} controls preload="metadata" className="w-full rounded-md bg-black" />}
															<Input
																key={`${block.id}:${block.data.title ?? ""}`}
																defaultValue={block.data.title ?? ""}
																placeholder="Optional video title"
																onBlur={(event) => {
																	const title = event.currentTarget.value;
																	if (title !== (block.data.title ?? "")) void updateBlock(block, { ...block.data, title });
																}}
															/>
															<Textarea
																key={`${block.id}:description:${block.data.description ?? ""}`}
																defaultValue={block.data.description ?? ""}
																placeholder="Optional video description"
																onBlur={(event) => {
																	const description = event.currentTarget.value;
																	if (description !== (block.data.description ?? "")) void updateBlock(block, { ...block.data, description });
																}}
															/>
															<label className="inline-flex cursor-pointer items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground">
																<Upload className="size-3.5" /> Replace video
																<input
																	type="file"
																	accept="video/*"
																	className="sr-only"
																	onChange={(event) => {
																		const file = event.currentTarget.files?.[0];
																		if (file) void replaceBlockAsset(block, file, "video");
																		event.currentTarget.value = "";
																	}}
																/>
															</label>
														</div>
													)}
												</div>
											))}
											{!selectedLesson.blocks.length && (
												<div className="rounded-md border border-dashed border-border px-5 py-10 text-center">
													<p className="text-sm text-muted-foreground">This lesson is empty. Add text, a screenshot, or a video to start.</p>
												</div>
											)}
										</div>
									</div>
								) : (
									<div className="rounded-md border border-dashed border-border px-5 py-12 text-center">
										<p className="text-sm text-muted-foreground">Choose a lesson or add one to this module.</p>
									</div>
								)}
							</>
						) : (
							<div className="grid min-h-64 place-items-center text-center">
								<div>
									<BookOpen className="mx-auto size-8 text-muted-foreground" aria-hidden="true" />
									<h2 className="mt-4 font-medium">Build your course curriculum</h2>
									<p className="mt-2 text-sm text-muted-foreground">Start with a module, then add lessons and content blocks.</p>
									<Button className="mt-5" onClick={() => void addModule()}><Plus className="size-4" /> Add first module</Button>
								</div>
							</div>
						)}
					</section>

					{error && <ErrorNotice message={error} />}
					{notice && <p role="status" className="text-sm text-muted-foreground">{notice}</p>}
					{uploadProgress !== null && (
						<div className="rounded-md border border-border bg-background p-4">
							<div className="flex items-center justify-between text-sm"><span>Uploading asset</span><span>{uploadProgress}%</span></div>
							<div className="mt-2 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary transition-all" style={{ width: `${uploadProgress}%` }} /></div>
						</div>
					)}
				</div>
			</div>

			{preview && (
				<div className="fixed inset-0 z-50 overflow-y-auto bg-background/95 p-4 sm:p-8" role="dialog" aria-modal="true" aria-label="Course preview">
					<div className="mx-auto max-w-6xl">
						<div className="mb-4 flex items-center justify-between gap-4">
							<div>
								<Badge variant="outline">Preview</Badge>
								<p className="mt-2 text-xs text-muted-foreground">This is how your current course content will appear to learners.</p>
							</div>
							<Button variant="outline" onClick={() => setPreview(false)}>Close preview</Button>
						</div>
						<CoursePlayer course={course} />
					</div>
				</div>
			)}
		</main>
	);

	async function addUploadedBlock(file: File, type: "image" | "video", lessonId: string) {
		await runAction(async () => {
			const asset = await uploadAsset(file, type);
			await authenticatedRequest(`/lessons/${lessonId}/blocks`, {
				method: "POST",
				body: jsonBody({ type, data: {}, assetId: asset.id }),
			});
			await loadCourse();
		}, "Asset uploaded and added to the lesson.");
	}

	async function replaceBlockAsset(block: LessonBlock, file: File, purpose: "image" | "video") {
		await runAction(async () => {
			const asset = await uploadAsset(file, purpose);
			await authenticatedRequest(`/blocks/${block.id}`, {
				method: "PATCH",
				body: jsonBody({ assetId: asset.id }),
			});
			if (block.asset) await removeAsset(block.asset.id);
			await loadCourse();
		}, "Asset replaced.");
	}
}

export default function CourseCreator() {
	const { courseId } = useParams();
	const location = useLocation();
	const [session, setSession] = useState<"checking" | "signed-in" | "signed-out">("checking");
	const [sessionError, setSessionError] = useState("");
	const [loginError, setLoginError] = useState("");
	const [loggingIn, setLoggingIn] = useState(false);

	const checkSession = useCallback(async () => {
		try {
			await courseApi<{ user: string }>("/admin/session", null);
			setSessionError("");
			setSession("signed-in");
		} catch (cause) {
			if (cause instanceof CourseApiError && cause.status === 401) {
				setSession("signed-out");
				return;
			}
			setSessionError(cause instanceof Error ? cause.message : "Could not verify administrator session.");
			setSession("signed-out");
		}
	}, []);

	useEffect(() => {
		let cancelled = false;
		courseApi<{ user: string }>("/admin/session", null)
			.then(() => {
				if (!cancelled) {
					setSessionError("");
					setSession("signed-in");
				}
			})
			.catch((cause: unknown) => {
				if (!cancelled) {
					if (!(cause instanceof CourseApiError && cause.status === 401)) {
						setSessionError(cause instanceof Error ? cause.message : "Could not verify administrator session.");
					}
					setSession("signed-out");
				}
			});
		return () => {
			cancelled = true;
		};
	}, []);

	const login = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setLoggingIn(true);
		setLoginError("");
		const form = new FormData(event.currentTarget);
		try {
			await courseApi("/admin/login", null, {
				method: "POST",
				body: jsonBody({
					username: String(form.get("username") ?? ""),
					password: String(form.get("password") ?? ""),
				}),
			});
			setSession("signed-in");
			setSessionError("");
		} catch (cause) {
			setLoginError(cause instanceof Error ? cause.message : "Administrator sign-in failed.");
		} finally {
			setLoggingIn(false);
		}
	};

	const logout = async () => {
		try {
			await courseApi("/admin/logout", null, { method: "POST" });
		} finally {
			setSession("signed-out");
			setLoginError("");
		}
	};

	return (
		<div className="min-h-screen bg-background text-foreground">
			{session !== "signed-in" && <header className="flex h-16 items-center justify-between border-b border-border px-5 sm:px-8">
				<Link to="/" className="font-medium tracking-tight" aria-label="Return to Besire home">
					Besire <span className="ml-2 text-xs font-normal uppercase tracking-[0.16em] text-muted-foreground">Admin</span>
				</Link>
			</header>}
			{session === "checking" ? (
				<div className="grid min-h-[calc(100vh-4rem)] place-items-center">
					<LoaderCircle className="size-6 animate-spin text-muted-foreground" aria-label="Checking administrator session" />
				</div>
			) : session !== "signed-in" ? (
				<main className="grid min-h-[calc(100vh-4rem)] place-items-center px-5 py-12">
					<form onSubmit={(event) => void login(event)} className="w-full max-w-sm space-y-5 rounded-lg border border-border bg-background p-6 sm:p-8">
						<div>
							<p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Restricted workspace</p>
							<h1 className="mt-2 text-3xl font-medium tracking-tight">Administrator sign in</h1>
							<p className="mt-2 text-sm leading-relaxed text-muted-foreground">
								This workspace is for Besire administrators only.
							</p>
						</div>
						{sessionError && <ErrorNotice message={`${sessionError} Check that the admin API is running, then try again.`} />}
						{loginError && <ErrorNotice message={loginError} />}
						<label className="block space-y-1.5 text-sm font-medium">
							Username
							<Input name="username" autoComplete="username" required maxLength={120} />
						</label>
						<label className="block space-y-1.5 text-sm font-medium">
							Password
							<Input name="password" type="password" autoComplete="current-password" required maxLength={256} />
						</label>
						<Button type="submit" className="w-full" disabled={loggingIn}>
							{loggingIn && <LoaderCircle className="size-4 animate-spin" />}
							Sign in
						</Button>
						{sessionError && (
							<Button type="button" variant="ghost" className="w-full" onClick={() => void checkSession()}>
								Retry connection
							</Button>
						)}
					</form>
				</main>
			) : (
				<AdminShell onLogout={() => void logout()}>
					{courseId ? (
						<CourseEditor key={`${location.pathname}:${courseId}`} courseId={courseId} />
					) : location.pathname === "/admin/course-sales" ? (
						<CourseSales />
					) : location.pathname === "/admin/create-course" ? (
						<CreateCourseStart />
					) : location.pathname === "/admin/manage-courses" ? (
						<CreatorHome key={location.pathname} mode="manage" />
					) : location.pathname === "/admin/all-courses" ? (
						<CreatorHome key={location.pathname} mode="all" />
					) : (
						<DashboardOverview />
					)}
				</AdminShell>
			)}
		</div>
	);
}
