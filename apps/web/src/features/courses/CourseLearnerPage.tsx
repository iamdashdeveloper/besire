import { useEffect, useState } from "react";
import { SignInButton, useAuth } from "@clerk/react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { AlertCircle, ArrowLeft, ArrowRight, BookOpen, CheckCircle2, LoaderCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import CoursePlayer from "@/features/courses/CoursePlayer";
import { courseApi, type Course } from "@/lib/courses";

type PurchaseVerification = {
	paymentStatus: "pending" | "success" | "failed" | "cancelled" | "partially_refunded" | "refunded" | "reversed";
	courseId: string;
};

export default function CourseLearnerPage() {
	const { courseId } = useParams();
	const [searchParams] = useSearchParams();
	const purchaseReference = searchParams.get("purchase_reference");
	const { isLoaded, isSignedIn, getToken } = useAuth();
	const [course, setCourse] = useState<Course | null>(null);
	const [error, setError] = useState("");
	const [loading, setLoading] = useState(true);
	const [loadedCourseId, setLoadedCourseId] = useState<string | null>(null);
	const [checkoutLoading, setCheckoutLoading] = useState(false);
	const [checkoutError, setCheckoutError] = useState("");
	const [purchaseError, setPurchaseError] = useState("");
	const [verification, setVerification] = useState<PurchaseVerification | null>(null);
	const [retryCount, setRetryCount] = useState(0);

	useEffect(() => {
		if (!courseId || !isLoaded) return;
		let active = true;
		const load = async () => {
			setLoading(true);
			try {
				const token = isSignedIn ? await getToken() : null;
				if (purchaseReference && token) {
					try {
						const result = await courseApi<PurchaseVerification>(
							`/course-purchases/verify?reference=${encodeURIComponent(purchaseReference)}`,
							token,
						);
						if (active) {
							if (result.courseId !== courseId) {
								setVerification(null);
								setPurchaseError("This payment reference belongs to a different course.");
							} else {
								setVerification(result);
								setPurchaseError("");
							}
						}
					} catch (cause) {
						if (active) {
							setVerification(null);
							setPurchaseError(cause instanceof Error ? cause.message : "Could not verify this payment.");
						}
					}
				}
				const result = await courseApi<Course>(`/courses/${courseId}`, token);
				if (active) {
					setCourse(result);
					setError("");
					setLoadedCourseId(courseId);
				}
			} catch (cause: unknown) {
				if (active) {
					setError(cause instanceof Error ? cause.message : "This course could not be loaded.");
					setLoadedCourseId(courseId);
				}
			} finally {
				if (active) setLoading(false);
			}
		};
		void load();
		return () => {
			active = false;
		};
	}, [courseId, getToken, isLoaded, isSignedIn, purchaseReference, retryCount]);

	const buyCourse = async () => {
		if (!courseId || !isLoaded) return;
		setCheckoutError("");
		if (!isSignedIn) return;
		setCheckoutLoading(true);
		try {
			const token = await getToken();
			if (!token) throw new Error("Sign in to purchase this course.");
			const checkout = await courseApi<{
				alreadyOwned?: boolean;
				checkoutUrl?: string;
			}>(`/courses/${courseId}/purchase`, token, {
				method: "POST",
				headers: { "Idempotency-Key": crypto.randomUUID() },
				body: JSON.stringify({}),
			});
			if (checkout.alreadyOwned) {
				setRetryCount((count) => count + 1);
				return;
			}
			if (!checkout.checkoutUrl) throw new Error("Paystack did not provide a checkout link.");
			window.location.assign(checkout.checkoutUrl);
		} catch (cause) {
			setCheckoutError(cause instanceof Error ? cause.message : "Could not start course checkout.");
		} finally {
			setCheckoutLoading(false);
		}
	};

	if (!isLoaded || loading || loadedCourseId !== courseId) {
		return <main className="grid min-h-[70vh] place-items-center pt-16"><LoaderCircle className="size-6 animate-spin text-muted-foreground" /></main>;
	}

	if (error || !course) {
		return (
			<main className="mx-auto max-w-3xl px-6 pt-28 pb-20">
				<p role="alert" className="rounded-md border border-border bg-muted/30 p-5 text-sm text-muted-foreground">
					{error || "This course could not be found."}
				</p>
				<Link to="/learning" className="mt-5 inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted">
					<ArrowLeft className="size-4" /> Back to learning
				</Link>
			</main>
		);
	}

	if (course.requiresPurchase || (course.price > 0 && course.accessGranted === false)) {
		return (
			<main className="mx-auto max-w-4xl px-6 pt-28 pb-20">
				<Link to="/learning" className="mb-5 inline-flex min-h-10 items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-muted">
					<ArrowLeft className="size-4" /> All courses
				</Link>
				<section className="overflow-hidden rounded-lg border border-border bg-background">
					{course.thumbnailAsset?.url && <img src={course.thumbnailAsset.url} alt="" className="aspect-[16/7] w-full border-b border-border object-cover" />}
					<div className="max-w-3xl p-6 sm:p-10">
						<p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">Course by {course.creatorName || "Besire creator"}</p>
						<h1 className="mt-3 text-3xl font-medium tracking-tight sm:text-4xl">{course.title}</h1>
						<p className="mt-4 leading-relaxed text-muted-foreground">{course.description}</p>
						<div className="mt-7 flex flex-wrap items-center gap-4">
							<p className="text-2xl font-medium">KSh {course.price.toLocaleString()}</p>
							{isSignedIn ? (
								<Button onClick={() => void buyCourse()} disabled={checkoutLoading}>
									{checkoutLoading ? <LoaderCircle className="size-4 animate-spin" /> : <ArrowRight className="size-4" />}
									{checkoutLoading ? "Preparing checkout..." : "Buy course"}
								</Button>
							) : (
								<SignInButton mode="modal">
									<Button type="button"><ArrowRight className="size-4" /> Sign in to buy</Button>
								</SignInButton>
							)}
						</div>
						{checkoutError && <p role="alert" className="mt-4 text-sm text-destructive">{checkoutError}</p>}
						{purchaseError && <p role="alert" className="mt-4 text-sm text-destructive">{purchaseError}</p>}
						{!isSignedIn && <p className="mt-3 text-sm text-muted-foreground">Sign in with a verified email address to continue to secure Paystack checkout.</p>}
						{purchaseReference && verification && (
							<div role="status" className="mt-5 rounded-md border border-border bg-muted/30 p-4 text-sm">
								<p>
									{verification.paymentStatus === "pending"
										? "Payment is pending confirmation. Access will appear after Paystack confirms it."
										: verification.paymentStatus === "success"
											? "Payment is verified. Refresh this course to load your access."
											: `The payment status is ${verification.paymentStatus.replaceAll("_", " ")}. No access was granted.`}
								</p>
								{verification.paymentStatus === "pending" && (
									<Button variant="outline" size="sm" className="mt-3" onClick={() => setRetryCount((count) => count + 1)}>
										<RefreshCw className="size-4" /> Check payment again
									</Button>
								)}
							</div>
						)}
						<p className="mt-4 text-xs text-muted-foreground">One-time payment in KES. Course access is granted after the payment is verified.</p>
					</div>
				</section>
			</main>
		);
	}

	return (
		<main className="mx-auto max-w-6xl px-4 pt-24 pb-16 sm:px-6">
			<Link to="/learning" className="mb-5 inline-flex min-h-10 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors hover:bg-muted">
				<ArrowLeft className="size-4" /> All courses
			</Link>
			{purchaseReference && verification && (
				<div role="status" className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-muted/30 p-4 text-sm">
					<span className="flex items-center gap-2">
						{verification.paymentStatus === "success"
							? <CheckCircle2 className="size-4 text-primary" />
							: verification.paymentStatus === "pending"
								? <RefreshCw className="size-4" />
								: <AlertCircle className="size-4 text-muted-foreground" />}
						{verification.paymentStatus === "success"
							? "Payment verified. Your course access is active."
							: verification.paymentStatus === "pending"
								? "Payment is pending confirmation. Course access will update when Paystack confirms it."
								: `Payment status: ${verification.paymentStatus.replaceAll("_", " ")}.`}
					</span>
					{verification.paymentStatus === "pending" && (
						<Button variant="outline" size="sm" onClick={() => setRetryCount((count) => count + 1)}>
							<RefreshCw className="size-4" /> Check again
						</Button>
					)}
				</div>
			)}
			{course.accessGranted ? (
				<CoursePlayer course={course} />
			) : (
				<div className="rounded-lg border border-border bg-background p-8 text-center">
					<BookOpen className="mx-auto size-8 text-muted-foreground" />
					<h1 className="mt-4 text-xl font-medium">Course access is not active</h1>
					<p className="mt-2 text-sm text-muted-foreground">The purchase could not be verified for this course.</p>
				</div>
			)}
		</main>
	);
}
