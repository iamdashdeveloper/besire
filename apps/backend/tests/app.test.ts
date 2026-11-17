import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../src/app.js";
import { missingStorageConfig, storageAvailable } from "../src/storage.js";

let app: FastifyInstance;

before(async () => {
	app = await buildApp();
});

after(async () => {
	await app.close();
});

test("health endpoint reports the API is ready", async () => {
	const response = await app.inject({ method: "GET", url: "/api/health" });
	assert.equal(response.statusCode, 200);
	assert.deepEqual(response.json(), { status: "ok" });
});

test("desktop development origin is allowed by the API CORS preflight", async () => {
	const response = await app.inject({
		method: "OPTIONS",
		url: "/api/me/entitlements",
		headers: {
			origin: "http://localhost:1420",
			"access-control-request-method": "GET",
			"access-control-request-headers": "authorization",
		},
	});
	assert.equal(response.statusCode, 204);
	assert.equal(response.headers["access-control-allow-origin"], "http://localhost:1420");
	assert.match(String(response.headers["access-control-allow-headers"]), /authorization/i);
});

test("course writes require the administrator session", async () => {
	const response = await app.inject({
		method: "POST",
		url: "/api/courses",
		payload: { title: "Not authenticated" },
	});
	assert.equal(response.statusCode, 401);
	assert.equal(response.json().error, "Administrator sign-in required.");
});

test("billing endpoints require a Clerk bearer session", async () => {
	const checkout = await app.inject({
		method: "POST",
		url: "/api/billing/checkout",
		headers: { "idempotency-key": "checkout-test-key" },
		payload: { mode: "manual" },
	});
	assert.equal(checkout.statusCode, 401);
	assert.equal(checkout.json().error, "Sign in is required.");

	const status = await app.inject({ method: "GET", url: "/api/billing/status" });
	assert.equal(status.statusCode, 401);
});

test("the verified entitlement endpoint requires a Clerk bearer session", async () => {
	const response = await app.inject({ method: "GET", url: "/api/me/entitlements" });
	assert.equal(response.statusCode, 401);
	assert.equal(response.json().error, "Sign in is required.");
});

test("desktop account profile endpoints require a Clerk bearer session", async () => {
	const read = await app.inject({ method: "GET", url: "/api/me/profile" });
	assert.equal(read.statusCode, 401);
	assert.equal(read.json().error, "Sign in is required.");

	const write = await app.inject({
		method: "PUT",
		url: "/api/me/profile",
		payload: { personal: { fullName: "Unauthenticated" } },
	});
	assert.equal(write.statusCode, 401);
	assert.equal(write.json().error, "Sign in is required.");
});

test("course purchase and verification endpoints require a Clerk bearer session", async () => {
	const checkout = await app.inject({
		method: "POST",
		url: "/api/courses/ac5b50c1-3d20-47c8-b574-7e95796a0001/purchase",
		headers: { "idempotency-key": "course-purchase-test" },
		payload: {},
	});
	assert.equal(checkout.statusCode, 401);
	assert.equal(checkout.json().error, "Sign in is required.");

	const verification = await app.inject({
		method: "GET",
		url: "/api/course-purchases/verify?reference=course-reference-1",
	});
	assert.equal(verification.statusCode, 401);
});

test("course sales reporting requires the administrator session", async () => {
	const response = await app.inject({ method: "GET", url: "/api/admin/course-sales" });
	assert.equal(response.statusCode, 401);
	assert.equal(response.json().error, "Administrator sign-in required.");
});

test("Paystack webhook rejects an absent signature before processing", async () => {
	const response = await app.inject({
		method: "POST",
		url: "/api/paystack/webhook",
		payload: { event: "charge.success", data: { reference: "unverified" } },
	});
	assert.equal(response.statusCode, 401);
	assert.equal(response.json().error, "Invalid Paystack signature.");
});

test("administrator login sets an HTTP-only session cookie", async () => {
	const invalid = await app.inject({
		method: "POST",
		url: "/api/admin/login",
		payload: { username: "not-admin", password: "not-the-password" },
	});
	assert.equal(invalid.statusCode, 401);

	const login = await app.inject({
		method: "POST",
		url: "/api/admin/login",
		payload: { username: "admin", password: "besire" },
	});
	assert.equal(login.statusCode, 200);
	const setCookie = login.headers["set-cookie"];
	assert.equal(typeof setCookie, "string");
	assert.match(String(setCookie), /HttpOnly/);
	assert.match(String(setCookie), /SameSite=Strict/);
	const cookie = String(setCookie).split(";")[0];

	const session = await app.inject({
		method: "GET",
		url: "/api/admin/session",
		headers: { cookie },
	});
	assert.equal(session.statusCode, 200);
	assert.deepEqual(session.json(), { user: "admin" });

	const logout = await app.inject({
		method: "POST",
		url: "/api/admin/logout",
		headers: { cookie },
	});
	assert.equal(logout.statusCode, 204);
});

test("course IDs are validated before database access", async () => {
	const response = await app.inject({
		method: "GET",
		url: "/api/courses/not-a-uuid",
	});
	assert.equal(response.statusCode, 400);
});

test("storage configuration detects missing and placeholder credentials without exposing values", () => {
	if (!storageAvailable) {
		assert.ok(missingStorageConfig.includes("AWS_ACCESS_KEY_ID"));
		assert.ok(missingStorageConfig.includes("AWS_SECRET_ACCESS_KEY"));
	}
	assert.ok(missingStorageConfig.every((name) => /^[A-Z0-9_]+$/.test(name)));
});
