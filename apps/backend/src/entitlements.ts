import { pool } from "./db.js";
import { getBillingStatus } from "./billing.js";

export const freeFeatureKeys = [
	"jam.job_search",
	"jam.job_details",
	"jam.saved_jobs",
	"jam.application_tracking",
	"jam.career_profile",
	"jam.cv_library",
	"jam.basic_cv_match",
	"jam.dashboard",
	"learning.free_content",
] as const;

export const proFeatureKeys = [
	"ian.companion",
	"cv.ai_match",
	"cv.ai_tailoring",
	"applications.ai_cover_letters",
	"applications.ai_answers",
	"interview.ai_prep",
	"tracking.email_assistance",
	"research.ai_mode",
	"analytics.advanced",
] as const;

export type EntitlementFeature = typeof freeFeatureKeys[number] | typeof proFeatureKeys[number];

export function resolveEntitlements(
	plan: "free" | "pro",
	courseIds: string[],
	billing: {
		paymentMode: "manual" | "subscription" | null;
		accessStartsAt: Date | string | null;
		accessExpiresAt: Date | string | null;
		isExpired: boolean;
		subscriptionStatus: string | null;
		nextPaymentAt: Date | string | null;
		cancelAtPeriodEnd: boolean;
	},
) {
	const features = Object.fromEntries([
		...freeFeatureKeys.map((feature) => [feature, true] as const),
		...proFeatureKeys.map((feature) => [feature, plan === "pro"] as const),
	]) as Record<EntitlementFeature, boolean>;

	return {
		plan,
		features,
		courses: { courseIds: [...new Set(courseIds)] },
		billing: {
			paymentMode: billing.paymentMode,
			accessStartsAt: billing.accessStartsAt,
			accessExpiresAt: billing.accessExpiresAt,
			isExpired: billing.isExpired,
			subscriptionStatus: billing.subscriptionStatus,
			nextPaymentAt: billing.nextPaymentAt,
			cancelAtPeriodEnd: billing.cancelAtPeriodEnd,
		},
	};
}

export async function loadUserEntitlements(userId: string) {
	const [billing, courseResult] = await Promise.all([
		getBillingStatus(userId),
		pool.query<{ course_id: string }>(
			`SELECT e.course_id
			 FROM course_enrollments e
			 JOIN courses c ON c.id = e.course_id
			 WHERE e.user_id = $1
			   AND e.status = 'active'
			   AND c.status = 'published'
			 ORDER BY e.created_at DESC`,
			[userId],
		),
	]);
	const plan = billing.plan === "pro" ? "pro" : "free";
	return resolveEntitlements(plan, courseResult.rows.map((row) => row.course_id), billing);
}
