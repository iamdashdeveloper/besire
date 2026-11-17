import assert from "node:assert/strict";
import { test } from "node:test";
import { freeFeatureKeys, proFeatureKeys, resolveEntitlements } from "../src/entitlements.js";

const billing = {
	paymentMode: null as "manual" | "subscription" | null,
	accessStartsAt: null as Date | null,
	accessExpiresAt: null as Date | null,
	isExpired: false,
	subscriptionStatus: null as string | null,
	nextPaymentAt: null as Date | null,
	cancelAtPeriodEnd: false,
};

test("free entitlements include core work features but never Pro features", () => {
	const resolved = resolveEntitlements("free", [], billing);
	for (const key of freeFeatureKeys) assert.equal(resolved.features[key], true);
	for (const key of proFeatureKeys) assert.equal(resolved.features[key], false);
});

test("active Pro entitlements unlock Pro features while preserving cancellation details", () => {
	const expiresAt = new Date("2026-11-10T00:00:00.000Z");
	const resolved = resolveEntitlements("pro", [], {
		...billing,
		paymentMode: "subscription",
		accessStartsAt: new Date("2026-10-10T00:00:00.000Z"),
		accessExpiresAt: expiresAt,
		subscriptionStatus: "non_renewing",
		cancelAtPeriodEnd: true,
	});
	for (const key of proFeatureKeys) assert.equal(resolved.features[key], true);
	assert.equal(resolved.billing.accessExpiresAt, expiresAt);
	assert.equal(resolved.billing.cancelAtPeriodEnd, true);
	assert.equal(resolved.billing.subscriptionStatus, "non_renewing");
});

test("course entitlements stay course-specific and do not grant Pro", () => {
	const courseIds = ["course-a", "course-b", "course-a"];
	const resolved = resolveEntitlements("free", courseIds, billing);
	assert.deepEqual(resolved.courses.courseIds, ["course-a", "course-b"]);
	for (const key of proFeatureKeys) assert.equal(resolved.features[key], false);
});
