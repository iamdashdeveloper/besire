import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { jwtVerify, SignJWT } from "jose";
import { createClerkClient, verifyToken } from "@clerk/backend";
import type { FastifyReply, FastifyRequest } from "fastify";
import { config } from "./config.js";

export interface BillingIdentity {
	userId: string;
	email: string;
}

export interface ClerkIdentity {
	userId: string;
}

declare module "fastify" {
	interface FastifyRequest {
		billingIdentity?: BillingIdentity;
		clerkIdentity?: ClerkIdentity;
		clerkUserId?: string;
	}
}

const sessionKey = randomBytes(32);
const sessionCookie = "besire_course_admin";

const loginFailures = new Map<
	string,
	{ count: number; windowStartedAt: number; blockedUntil: number }
>();
const maxLoginAttempts = 8;
const loginWindowMs = 15 * 60 * 1000;
const loginBlockMs = 15 * 60 * 1000;

function constantTimeEquals(actual: string, expected: string) {
	const actualDigest = createHmac("sha256", sessionKey).update(actual).digest();
	const expectedDigest = createHmac("sha256", sessionKey).update(expected).digest();
	return timingSafeEqual(actualDigest, expectedDigest);
}

function readCookie(request: FastifyRequest, name: string) {
	const header = request.headers.cookie;
	if (!header) return null;
	for (const part of header.split(";")) {
		const separator = part.indexOf("=");
		if (separator < 0 || part.slice(0, separator).trim() !== name) continue;
		return decodeURIComponent(part.slice(separator + 1).trim());
	}
	return null;
}

export function hasAdminSessionCookie(request: FastifyRequest) {
	return request.headers.cookie
		?.split(";")
		.some((part) => part.trim().startsWith(`${sessionCookie}=`)) ?? false;
}

export function getSessionCookie(request: FastifyRequest) {
	const secure = request.headers["x-forwarded-proto"] === "https" || request.protocol === "https";
	const sameSite = secure ? "None" : "Strict";
	return `${sessionCookie}=; Path=/api; HttpOnly; SameSite=${sameSite}; Max-Age=0${secure ? "; Secure" : ""}`;
}

export async function adminLogin(
	request: FastifyRequest,
	reply: FastifyReply,
	username: string,
	password: string,
) {
	const now = Date.now();
	const address = request.ip;
	const attempts = loginFailures.get(address);
	if (attempts && attempts.blockedUntil > now) {
		await reply.code(429).send({ error: "Too many sign-in attempts. Wait 15 minutes and try again." });
		return;
	}
	if (attempts && now - attempts.windowStartedAt >= loginWindowMs) {
		loginFailures.delete(address);
	}

	const valid =
		constantTimeEquals(username, config.adminUsername) &&
		constantTimeEquals(password, config.adminPassword);
	if (!valid) {
		const current = loginFailures.get(address);
		const sameWindow = current && now - current.windowStartedAt < loginWindowMs;
		const count = sameWindow ? current.count + 1 : 1;
		loginFailures.set(address, {
			count,
			windowStartedAt: sameWindow ? current.windowStartedAt : now,
			blockedUntil: count >= maxLoginAttempts ? now + loginBlockMs : now,
		});
		await reply.code(401).send({ error: "Incorrect administrator username or password." });
		return;
	}

	loginFailures.delete(address);
	const token = await new SignJWT({ role: "course_admin" })
		.setProtectedHeader({ alg: "HS256" })
		.setSubject("admin")
		.setIssuedAt()
		.setExpirationTime("8h")
		.sign(sessionKey);
	const secure = request.headers["x-forwarded-proto"] === "https" || request.protocol === "https";
	const sameSite = secure ? "None" : "Strict";
	reply.header(
		"Set-Cookie",
		`${sessionCookie}=${encodeURIComponent(token)}; Path=/api; HttpOnly; SameSite=${sameSite}; Max-Age=${8 * 60 * 60}${secure ? "; Secure" : ""}`,
	);
	return reply.send({ user: "admin" });
}

export async function requireAdmin(
	request: FastifyRequest,
	reply: FastifyReply,
): Promise<void> {
	const token = readCookie(request, sessionCookie);
	if (!token) {
		await reply.code(401).send({ error: "Administrator sign-in required." });
		return;
	}
	try {
		const { payload } = await jwtVerify(token, sessionKey, {
			algorithms: ["HS256"],
		});
		if (payload.sub !== "admin" || payload.role !== "course_admin") {
			await reply.code(401).send({ error: "Administrator session is invalid." });
		}
	} catch {
		await reply.code(401).send({ error: "Administrator session is invalid or expired." });
	}
}

export function adminId() {
	return "admin";
}

export async function resolveClerkIdentity(
	authorization: string | undefined,
	verify: (token: string) => Promise<{ sub?: string }>,
	loadUser: (userId: string) => Promise<{ email: string | null }>,
): Promise<BillingIdentity | null> {
	const match = authorization?.match(/^Bearer\s+(\S+)$/i);
	if (!match) return null;

	try {
		const claims = await verify(match[1]);
		if (!claims.sub) return null;
		const user = await loadUser(claims.sub);
		if (!user.email) return null;
		return { userId: claims.sub, email: user.email };
	} catch {
		return null;
	}
}

export async function requireClerkUser(
	request: FastifyRequest,
	reply: FastifyReply,
): Promise<void> {
	await requireClerkSession(request, reply);
	if (reply.sent || !request.clerkUserId) return;

	try {
		const clerk = createClerkClient({ secretKey: config.clerkSecretKey! });
		const user = await clerk.users.getUser(request.clerkUserId);
		const primaryEmail = user.emailAddresses.find((address) => address.id === user.primaryEmailAddressId);
		const email = primaryEmail?.verification?.status === "verified"
			? primaryEmail.emailAddress
			: null;
		if (!email) {
			await reply.code(403).send({ error: "A verified primary email address is required for billing." });
			return;
		}
		request.billingIdentity = { userId: request.clerkUserId, email };
	} catch (error) {
		request.log.error({ err: error }, "Could not retrieve the verified Clerk user");
		await reply.code(503).send({ error: "Could not verify your account right now. Please try again." });
	}
}

export async function requireClerkSession(
	request: FastifyRequest,
	reply: FastifyReply,
): Promise<void> {
	const match = request.headers.authorization?.match(/^Bearer\s+(\S+)$/i);
	if (!match) {
		await reply.code(401).send({ error: "Sign in is required." });
		return;
	}
	if (!config.clerkSecretKey) {
		await reply.code(503).send({ error: "Clerk authentication is not configured on the API." });
		return;
	}

	try {
		const claims = await verifyToken(match[1], {
			secretKey: config.clerkSecretKey,
			authorizedParties: config.clerkAuthorizedParties,
		});
		if (typeof claims.sub !== "string" || !claims.sub) {
			await reply.code(401).send({ error: "The Clerk session token is invalid." });
			return;
		}
		request.clerkUserId = claims.sub;
		request.clerkIdentity = { userId: claims.sub };
	} catch {
		await reply.code(401).send({ error: "The Clerk session token is invalid or expired." });
		return;
	}
}
