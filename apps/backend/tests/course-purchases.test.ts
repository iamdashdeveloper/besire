import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import {
	calculateCourseSalesTotals,
	canAccessCourse,
	coursePurchaseStatusForTransaction,
	courseRefundStatus,
	validateVerifiedCoursePayment,
} from "../src/course-purchases.js";
import { paystackWebhookEventKey, type PaystackTransaction } from "../src/paystack.js";

const purchase = {
	id: "d8105482-2c5e-496c-a706-c3fbec7adfb4",
	course_id: "ac5b50c1-3d20-47c8-b574-7e95796a0001",
	paystack_reference: "course-reference-1",
	amount_subunits: "500000",
	currency: "KES",
	learner_email: "learner@example.test",
};

const transaction: PaystackTransaction = {
	reference: purchase.paystack_reference,
	status: "success",
	amount: 500000,
	currency: "KES",
	customer: { email: "LEARNER@example.test" },
	metadata: { course_id: purchase.course_id, purchase_id: purchase.id },
};

test("verified course purchases require the stored reference, amount, currency, email, and course", () => {
	assert.equal(validateVerifiedCoursePayment(transaction, purchase).status, "success");
	assert.throws(() => validateVerifiedCoursePayment({ ...transaction, reference: "other" }, purchase));
	assert.throws(() => validateVerifiedCoursePayment({ ...transaction, amount: 200000 }, purchase));
	assert.throws(() => validateVerifiedCoursePayment({ ...transaction, currency: "USD" }, purchase));
	assert.throws(() => validateVerifiedCoursePayment({ ...transaction, customer: { email: "other@example.test" } }, purchase));
	assert.throws(() => validateVerifiedCoursePayment({ ...transaction, metadata: { course_id: "other-course" } }, purchase));
	assert.throws(() => validateVerifiedCoursePayment({ ...transaction, metadata: { ...transaction.metadata, purchase_id: "other-purchase" } }, purchase));
});

test("course payment states do not grant access for pending, failed, or abandoned payments", () => {
	assert.equal(coursePurchaseStatusForTransaction("success"), "success");
	assert.equal(coursePurchaseStatusForTransaction("pending"), "pending");
	assert.equal(coursePurchaseStatusForTransaction("failed"), "failed");
	assert.equal(coursePurchaseStatusForTransaction("abandoned"), "cancelled");
	assert.equal(coursePurchaseStatusForTransaction("reversed"), "reversed");
});

test("course access is public for free courses and requires active enrollment for paid courses", () => {
	assert.equal(canAccessCourse(0, false), true);
	assert.equal(canAccessCourse(1_500, false), false);
	assert.equal(canAccessCourse(1_500, true), true);
});

test("refunds preserve partial status until the recorded amount is fully refunded", () => {
	assert.equal(courseRefundStatus(500_000, 125_000), "partially_refunded");
	assert.equal(courseRefundStatus(500_000, 500_000), "refunded");
	assert.equal(courseRefundStatus(500_000, 700_000), "refunded");
});

test("course sales totals keep gross, refunds, net, and unique learners distinct", () => {
	assert.deepEqual(calculateCourseSalesTotals({
		purchase_count: "3",
		gross_subunits: "1000000",
		refund_subunits: "250000",
		unique_learners: "2",
	}), {
		purchaseCount: 3,
		grossSubunits: 1_000_000,
		refundSubunits: 250_000,
		netSubunits: 750_000,
		uniqueLearners: 2,
		currency: "KES",
	});
});

test("per-course sales ordering sorts by its aggregate output alias", async () => {
	const source = await readFile(new URL("../src/course-purchases.ts", import.meta.url), "utf8");
	assert.match(source, /ORDER BY gross_subunits DESC, c\.title/);
	assert.doesNotMatch(source, /ORDER BY gross_subunits::numeric/);
});

test("identical Paystack webhook deliveries share the same idempotency key", () => {
	const event = { reference: purchase.paystack_reference, amount: 500000, currency: "KES" };
	assert.equal(paystackWebhookEventKey("charge.success", event), paystackWebhookEventKey("charge.success", { ...event }));
	assert.notEqual(paystackWebhookEventKey("charge.success", event), paystackWebhookEventKey("charge.failed", event));
});

test("course purchase schema prevents duplicate attempts and enrollments", async () => {
	const [purchaseSchema, courseSchema] = await Promise.all([
		readFile(new URL("../migrations/003_course_purchases.sql", import.meta.url), "utf8"),
		readFile(new URL("../migrations/001_courses.sql", import.meta.url), "utf8"),
	]);
	assert.match(purchaseSchema, /UNIQUE \(user_id, idempotency_key\)/);
	assert.match(purchaseSchema, /UNIQUE INDEX IF NOT EXISTS course_purchases_one_pending_per_learner_idx/);
	assert.match(courseSchema, /UNIQUE \(course_id, user_id\)/);
});
