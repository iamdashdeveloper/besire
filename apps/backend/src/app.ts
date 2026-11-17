import Fastify, { type FastifyInstance, type FastifyRequest } from "fastify";
import cors from "@fastify/cors";
import { z } from "zod";
import { pool } from "./db.js";
import { config } from "./config.js";
import { adminId, adminLogin, getSessionCookie, hasAdminSessionCookie, requireAdmin, requireClerkSession, requireClerkUser } from "./auth.js";
import { cancelSubscription, createCheckout, getBillingStatus, processPaystackWebhook, verifyCheckout } from "./billing.js";
import {
	createCoursePurchaseCheckout,
	getCoursePurchaseDetail,
	getCourseSalesOverview,
	listCoursePurchases,
	processCoursePurchaseWebhook,
	verifyCoursePurchase,
} from "./course-purchases.js";
import { verifyPaystackSignature } from "./paystack.js";
import { monthlySubscriptionOption } from "./billing-options.js";
import { loadUserEntitlements } from "./entitlements.js";
import {
	createDownloadUrl,
	createUploadUrl,
	makeObjectKey,
	missingStorageConfig,
	removeObject,
	storageAvailable,
	verifyUploadedObject,
} from "./storage.js";

type IdParams = { id: string };
type CourseParams = { courseId: string };
type ParentParams = { moduleId: string } | { lessonId: string };

const uuidSchema = z.string().uuid();
const titleSchema = z.string().trim().min(1).max(180);
const courseCreateSchema = z.object({
	title: titleSchema.optional().default(""),
	description: z.string().max(6000).optional().default(""),
	price: z.number().int().nonnegative().max(100_000_000).optional().default(0),
	metadata: z.record(z.string(), z.unknown()).optional().default({}),
});
const coursePatchSchema = z.object({
	title: titleSchema.optional(),
	description: z.string().max(6000).optional(),
	price: z.number().int().nonnegative().max(100_000_000).optional(),
	thumbnailAssetId: z.string().uuid().nullable().optional(),
	metadata: z.record(z.string(), z.unknown()).optional(),
}).strict().refine((data) => Object.keys(data).length > 0, "At least one field is required.");
const titlePatchSchema = z.object({ title: titleSchema }).strict();
const blockSchema = z.object({
	type: z.enum(["text", "image", "video"]),
	data: z.record(z.string(), z.string()).optional().default({}),
	assetId: z.string().uuid().optional(),
}).strict().superRefine((data, context) => {
	if (data.type === "text" && data.assetId) {
		context.addIssue({ code: "custom", message: "Text blocks cannot have a file asset." });
	}
	if ((data.type === "image" || data.type === "video") && !data.assetId) {
		context.addIssue({ code: "custom", message: "Image and video blocks require an uploaded asset." });
	}
});
const blockPatchSchema = z.object({
	data: z.record(z.string(), z.string()).optional(),
	assetId: z.string().uuid().optional(),
}).strict().refine((data) => Object.keys(data).length > 0, "At least one field is required.");
const reorderSchema = z.object({ ids: z.array(z.string().uuid()).min(1).max(500) }).strict();
const uploadSchema = z.object({
	courseId: z.string().uuid(),
	fileName: z.string().trim().min(1).max(255),
	contentType: z.string().min(1).max(150),
	size: z.number().int().positive(),
	purpose: z.enum(["thumbnail", "image", "video"]),
}).strict();
const adminLoginSchema = z.object({
	username: z.string().min(1).max(120),
	password: z.string().min(1).max(256),
}).strict();
const profileSchema = z.object({
	personal: z.object({
		fullName: z.string().trim().min(1).max(180),
	}).passthrough(),
	professional: z.record(z.string(), z.unknown()),
	interests: z.record(z.string(), z.unknown()),
	workPreferences: z.record(z.string(), z.unknown()),
}).passthrough();

const courseSummaryQuery = `
	SELECT c.id, c.creator_id, c.creator_name, c.title, c.description, c.price,
	       c.status, c.metadata, c.created_at, c.updated_at,
	       a.id AS thumbnail_id, a.file_name AS thumbnail_file_name,
	       a.content_type AS thumbnail_content_type, a.size_bytes AS thumbnail_size,
	       a.object_key AS thumbnail_object_key, a.uploaded AS thumbnail_uploaded
	FROM courses c
	LEFT JOIN course_assets a ON a.id = c.thumbnail_asset_id
`;

function badRequest(message: string): never {
	const error = new Error(message);
	Object.assign(error, { statusCode: 400 });
	throw error;
}

function notFound(message = "Resource not found."): never {
	const error = new Error(message);
	Object.assign(error, { statusCode: 404 });
	throw error;
}

function forbidden(message = "You do not have access to this resource."): never {
	const error = new Error(message);
	Object.assign(error, { statusCode: 403 });
	throw error;
}

function parse<T>(schema: z.ZodType<T>, input: unknown): T {
	const result = schema.safeParse(input);
	if (!result.success) badRequest(result.error.issues.map((issue) => issue.message).join(" "));
	return result.data;
}

function paramId(request: FastifyRequest<{ Params: IdParams }>) {
	return parse(uuidSchema, request.params.id);
}

function courseParamId(request: FastifyRequest<{ Params: CourseParams }>) {
	return parse(uuidSchema, request.params.courseId);
}

async function ensureCourseOwner(courseId: string, _ownerId: string) {
	const result = await pool.query<{ id: string }>(
		"SELECT id FROM courses WHERE id = $1",
		[courseId],
	);
	if (!result.rowCount) notFound("Course not found.");
}

async function ensureModuleOwner(moduleId: string, _ownerId: string) {
	const result = await pool.query<{ id: string }>(
		`SELECT m.id FROM course_modules m
		 JOIN courses c ON c.id = m.course_id
		 WHERE m.id = $1`,
		[moduleId],
	);
	if (!result.rowCount) notFound("Module not found.");
}

async function ensureLessonOwner(lessonId: string, _ownerId: string) {
	const result = await pool.query<{ id: string }>(
		`SELECT l.id FROM course_lessons l
		 JOIN course_modules m ON m.id = l.module_id
		 JOIN courses c ON c.id = m.course_id
		 WHERE l.id = $1`,
		[lessonId],
	);
	if (!result.rowCount) notFound("Lesson not found.");
}

async function ensureBlockOwner(blockId: string, _ownerId: string) {
	const result = await pool.query<{ id: string }>(
		`SELECT b.id FROM lesson_blocks b
		 JOIN course_lessons l ON l.id = b.lesson_id
		 JOIN course_modules m ON m.id = l.module_id
		 JOIN courses c ON c.id = m.course_id
		 WHERE b.id = $1`,
		[blockId],
	);
	if (!result.rowCount) notFound("Content block not found.");
}

async function removeCourseAsset(assetId: string) {
	const asset = await pool.query<{ object_key: string }>(
		"SELECT object_key FROM course_assets WHERE id = $1",
		[assetId],
	);
	if (!asset.rowCount) return;
	if (storageAvailable) await removeObject(asset.rows[0].object_key);
	const client = await pool.connect();
	try {
		await client.query("BEGIN");
		await client.query("UPDATE courses SET thumbnail_asset_id = NULL WHERE thumbnail_asset_id = $1", [assetId]);
		await client.query("UPDATE lesson_blocks SET asset_id = NULL, updated_at = now() WHERE asset_id = $1", [assetId]);
		await client.query("DELETE FROM course_assets WHERE id = $1", [assetId]);
		await client.query("COMMIT");
	} catch (error) {
		await client.query("ROLLBACK");
		throw error;
	} finally {
		client.release();
	}
}

async function removeAssetIfUnused(assetId: string, _ownerId: string) {
	const result = await pool.query(
		`SELECT a.id FROM course_assets a
		 WHERE a.id = $1
		   AND NOT EXISTS (SELECT 1 FROM courses c WHERE c.thumbnail_asset_id = a.id)
		   AND NOT EXISTS (SELECT 1 FROM lesson_blocks b WHERE b.asset_id = a.id)`,
		[assetId],
	);
	if (result.rowCount) await removeCourseAsset(assetId);
}

async function displayAsset(row: Record<string, unknown> | undefined, prefix: string) {
	if (!row?.[`${prefix}_id`] || !row[`${prefix}_uploaded`]) return null;
	return {
		id: row[`${prefix}_id`],
		fileName: row[`${prefix}_file_name`],
		contentType: row[`${prefix}_content_type`],
		size: Number(row[`${prefix}_size`]),
		url: row[`${prefix}_object_key`]
			? await createDownloadUrl(String(row[`${prefix}_object_key`]))
			: undefined,
	};
}

async function getCourse(courseId: string, ownerId?: string, viewerUserId?: string) {
	const query = ownerId
		? `${courseSummaryQuery} WHERE c.id = $1`
		: `${courseSummaryQuery} WHERE c.id = $1 AND c.status = 'published'`;
	const result = ownerId
		? await pool.query(query, [courseId])
		: await pool.query(query, [courseId]);
	if (!result.rowCount) notFound("Course not found.");

	const row = result.rows[0] as Record<string, unknown>;
	let accessGranted = Number(row.price) === 0 || ownerId === "admin" || row.creator_id === viewerUserId;
	if (Number(row.price) > 0 && !accessGranted) {
		const enrollment = viewerUserId
			? await pool.query(
					"SELECT id FROM course_enrollments WHERE course_id = $1 AND user_id = $2 AND status = 'active'",
					[courseId, viewerUserId],
				)
			: null;
		accessGranted = Boolean(enrollment?.rowCount);
	}

	if (!accessGranted) {
		return {
			id: row.id,
			creatorId: row.creator_id,
			creatorName: row.creator_name,
			title: row.title,
			description: row.description,
			price: row.price,
			status: row.status,
			createdAt: row.created_at,
			updatedAt: row.updated_at,
			thumbnailAsset: await displayAsset(row, "thumbnail"),
			modules: [],
			accessGranted: false,
			requiresPurchase: true,
		}
	}
	const moduleResult = await pool.query(
		"SELECT id, course_id, title, position, created_at, updated_at FROM course_modules WHERE course_id = $1 ORDER BY position",
		[courseId],
	);
	const modules = await Promise.all(moduleResult.rows.map(async (module) => {
		const lessonResult = await pool.query(
			"SELECT id, module_id, title, position, created_at, updated_at FROM course_lessons WHERE module_id = $1 ORDER BY position",
			[module.id],
		);
		const lessons = await Promise.all(lessonResult.rows.map(async (lesson) => {
			const blockResult = await pool.query(
				`SELECT b.id, b.lesson_id, b.type, b.position, b.data, b.created_at, b.updated_at,
				        a.id AS asset_id, a.file_name AS asset_file_name,
				        a.content_type AS asset_content_type, a.size_bytes AS asset_size,
				        a.object_key AS asset_object_key, a.uploaded AS asset_uploaded
				 FROM lesson_blocks b
				 LEFT JOIN course_assets a ON a.id = b.asset_id
				 WHERE b.lesson_id = $1 ORDER BY b.position`,
				[lesson.id],
			);
			const blocks = await Promise.all(blockResult.rows.map(async (block) => ({
				id: block.id,
				lessonId: block.lesson_id,
				type: block.type,
				position: block.position,
				data: block.data,
				createdAt: block.created_at,
				updatedAt: block.updated_at,
				asset: await displayAsset(block as Record<string, unknown>, "asset"),
			})));
			return { ...lesson, blocks };
		}));
		return { ...module, lessons };
	}));
	return {
		id: row.id,
		creatorId: row.creator_id,
		creatorName: row.creator_name,
		title: row.title,
		description: row.description,
		price: row.price,
		status: row.status,
		metadata: row.metadata,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
		thumbnailAsset: await displayAsset(row, "thumbnail"),
		modules,
		accessGranted: true,
		requiresPurchase: false,
	};
}

async function reorder(
	table: "course_modules" | "course_lessons" | "lesson_blocks",
	parentColumn: "course_id" | "module_id" | "lesson_id",
	parentId: string,
	ids: string[],
) {
	const client = await pool.connect();
	try {
		await client.query("BEGIN");
		const current = await client.query<{ id: string; position: number }>(
			`SELECT id, position FROM ${table} WHERE ${parentColumn} = $1 ORDER BY position FOR UPDATE`,
			[parentId],
		);
		const currentIds = current.rows.map((row) => row.id);
		if (ids.length !== currentIds.length || ids.some((id) => !currentIds.includes(id))) {
			badRequest("Reorder IDs must contain every item in this collection exactly once.");
		}
		const offset = Math.max(0, ...current.rows.map((row) => row.position)) + ids.length + 1;
		await client.query(
			`UPDATE ${table} SET position = position + $2, updated_at = now() WHERE ${parentColumn} = $1`,
			[parentId, offset],
		);
		for (const [position, id] of ids.entries()) {
			await client.query(
				`UPDATE ${table} SET position = $2, updated_at = now() WHERE id = $1`,
				[id, position],
			);
		}
		await client.query("COMMIT");
	} catch (error) {
		await client.query("ROLLBACK");
		throw error;
	} finally {
		client.release();
	}
}

function allowedFileType(purpose: "thumbnail" | "image" | "video", contentType: string) {
	if (purpose === "video") return ["video/mp4", "video/webm", "video/quicktime"].includes(contentType);
	return ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"].includes(contentType);
}

async function publicCourseList(viewerUserId?: string) {
	const rows = await pool.query(
		`${courseSummaryQuery} WHERE c.status = 'published' ORDER BY c.updated_at DESC`,
	);
	const enrolledCourses = viewerUserId
		? await pool.query<{ course_id: string }>(
				"SELECT course_id FROM course_enrollments WHERE user_id = $1 AND status = 'active'",
				[viewerUserId],
			)
		: { rows: [] as { course_id: string }[] };
	const enrolled = new Set(enrolledCourses.rows.map((row) => row.course_id));
	return Promise.all(rows.rows.map(async (row) => ({
		id: row.id,
		creatorId: row.creator_id,
		creatorName: row.creator_name,
		title: row.title,
		description: row.description,
		price: row.price,
		status: row.status,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
		thumbnailAsset: await displayAsset(row as Record<string, unknown>, "thumbnail"),
		modules: [],
		accessGranted: Number(row.price) === 0 || enrolled.has(row.id),
	})));
}

export async function buildApp(): Promise<FastifyInstance> {
	const app = Fastify({
		logger: {
			redact: ["req.headers.authorization", "req.headers.cookie"],
		},
		bodyLimit: 1024 * 1024,
	});
	app.removeContentTypeParser("application/json");
	app.addContentTypeParser("application/json", { parseAs: "buffer" }, (request, body, done) => {
		const rawBody = Buffer.isBuffer(body) ? body : Buffer.from(body);
		(request as FastifyRequest & { rawBody?: Buffer }).rawBody = rawBody;
		try {
			done(null, JSON.parse(rawBody.toString("utf8")));
		} catch (error) {
			done(error as Error);
		}
	});
	await app.register(cors, {
		origin: (origin, callback) => {
			if (!origin || config.webOrigin.includes(origin)) callback(null, true);
			else callback(new Error("Origin not allowed"), false);
		},
		allowedHeaders: ["Authorization", "Content-Type", "Idempotency-Key"],
		methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
		credentials: true,
	});

	app.setErrorHandler((error, request, reply) => {
		const statusCode =
			error instanceof Error &&
			"statusCode" in error &&
			typeof error.statusCode === "number"
				? error.statusCode
				: 500;
		if (statusCode >= 500) request.log.error({ err: error }, "Course API request failed");
		reply.code(statusCode).send({
			error: statusCode >= 500
				? "The server could not complete the request."
				: error instanceof Error ? error.message : "The request could not be completed.",
		});
	});

	app.get("/health", async () => ({ status: "ok" }));
	app.get("/api/health", async () => ({ status: "ok" }));
	app.post("/api/admin/login", async (request, reply) => {
		const body = parse(adminLoginSchema, request.body);
		return adminLogin(request, reply, body.username, body.password);
	});
	app.get("/api/admin/session", { preHandler: requireAdmin }, async () => ({ user: "admin" }));
	app.get("/api/me/entitlements", { preHandler: requireClerkUser }, async (request, reply) => {
		if (!request.billingIdentity) return reply.code(401).send({ error: "Sign in is required." });
		return loadUserEntitlements(request.billingIdentity.userId);
	});
	app.get("/api/me/profile", { preHandler: requireClerkSession }, async (request, reply) => {
		const userId = request.clerkUserId;
		if (!userId) return reply.code(401).send({ error: "Sign in is required." });
		const result = await pool.query<{ profile: unknown; updated_at: Date }>(
			"SELECT profile, updated_at FROM desktop_user_profiles WHERE user_id = $1",
			[userId],
		);
		if (!result.rowCount) return { profile: null, updatedAt: null };
		return { profile: result.rows[0].profile, updatedAt: result.rows[0].updated_at };
	});
	app.put("/api/me/profile", { preHandler: requireClerkSession }, async (request, reply) => {
		const userId = request.clerkUserId;
		if (!userId) return reply.code(401).send({ error: "Sign in is required." });
		const profile = parse(profileSchema, request.body);
		const result = await pool.query<{ profile: unknown; updated_at: Date }>(
			`INSERT INTO desktop_user_profiles (user_id, profile)
			 VALUES ($1, $2::jsonb)
			 ON CONFLICT (user_id) DO UPDATE SET profile = EXCLUDED.profile, updated_at = now()
			 RETURNING profile, updated_at`,
			[userId, JSON.stringify(profile)],
		);
		return { profile: result.rows[0].profile, updatedAt: result.rows[0].updated_at };
	});
	app.get("/api/me/courses", { preHandler: requireClerkSession }, async (request, reply) => {
		const userId = request.clerkUserId;
		if (!userId) return reply.code(401).send({ error: "Sign in is required." });
		const rows = await pool.query(
			`SELECT c.id, c.creator_name, c.title, c.description, c.price,
			        c.status, e.created_at AS enrolled_at,
			        a.id AS thumbnail_id, a.file_name AS thumbnail_file_name,
			        a.content_type AS thumbnail_content_type, a.size_bytes AS thumbnail_size,
			        a.object_key AS thumbnail_object_key, a.uploaded AS thumbnail_uploaded
			 FROM course_enrollments e
			 JOIN courses c ON c.id = e.course_id
			 LEFT JOIN course_assets a ON a.id = c.thumbnail_asset_id
			 WHERE e.user_id = $1 AND e.status = 'active' AND c.status = 'published'
			 ORDER BY e.created_at DESC`,
			[userId],
		);
		return Promise.all(rows.rows.map(async (row) => ({
			id: row.id,
			title: row.title,
			description: row.description,
			price: row.price,
			status: row.status,
			creatorName: row.creator_name,
			enrolledAt: row.enrolled_at,
			thumbnailAsset: await displayAsset(row as Record<string, unknown>, "thumbnail"),
		})));
	});
	app.post("/api/admin/logout", async (request, reply) => {
		return reply.header("Set-Cookie", getSessionCookie(request)).code(204).send();
	});
	app.get("/api/billing/options", async () => monthlySubscriptionOption());
	app.post<{ Params: IdParams }>("/api/courses/:id/purchase", { preHandler: requireClerkUser }, async (request, reply) => {
		const courseId = paramId(request);
		const idempotencyHeader = request.headers["idempotency-key"];
		const idempotencyKey = Array.isArray(idempotencyHeader) ? idempotencyHeader[0] : idempotencyHeader;
		if (!idempotencyKey || idempotencyKey.length < 8 || idempotencyKey.length > 120) {
			return reply.code(400).send({ error: "A valid Idempotency-Key header is required." });
		}
		if (!request.billingIdentity) return reply.code(401).send({ error: "Sign in is required." });
		return createCoursePurchaseCheckout(request.billingIdentity, courseId, idempotencyKey);
	});
	app.get("/api/course-purchases/verify", { preHandler: requireClerkUser }, async (request, reply) => {
		const queryParams = request.query as { reference?: string | string[] };
		const reference = Array.isArray(queryParams.reference) ? queryParams.reference[0] : queryParams.reference;
		const query = parse(z.object({ reference: z.string().min(1).max(120) }).strict(), { reference });
		if (!request.billingIdentity) return reply.code(401).send({ error: "Sign in is required." });
		return verifyCoursePurchase(request.billingIdentity, query.reference);
	});
	app.get("/api/admin/course-sales", async (request, reply) => {
		await requireAdmin(request, reply);
		if (reply.sent) return;
		const queryParams = request.query as Record<string, string | undefined>;
		const query = parse(z.object({
			search: z.string().trim().max(160).optional(),
			status: z.enum(["pending", "success", "failed", "partially_refunded", "refunded", "reversed"]).optional(),
			courseId: z.string().uuid().optional(),
			from: z.string().date().optional(),
			to: z.string().date().optional(),
			sort: z.enum(["newest", "oldest", "highest", "lowest"]).default("newest"),
			page: z.coerce.number().int().min(1).default(1),
			limit: z.coerce.number().int().min(1).max(100).default(25),
		}).strict(), queryParams);
		const [overview, page] = await Promise.all([
			getCourseSalesOverview(),
			listCoursePurchases({
				...query,
				from: query.from ? `${query.from}T00:00:00.000Z` : undefined,
				to: query.to ? `${query.to}T00:00:00.000Z` : undefined,
				offset: (query.page - 1) * query.limit,
			}),
		]);
		return { overview, ...page, page: query.page, limit: query.limit };
	});
	app.get<{ Params: IdParams }>("/api/admin/course-sales/:id", async (request, reply) => {
		await requireAdmin(request, reply);
		if (reply.sent) return;
		return getCoursePurchaseDetail(paramId(request));
	});
	app.post("/api/billing/checkout", { preHandler: requireClerkUser }, async (request, reply) => {
		const body = parse(z.object({ mode: z.enum(["manual", "subscription"]) }).strict(), request.body);
		const idempotencyHeader = request.headers["idempotency-key"];
		const idempotencyKey = Array.isArray(idempotencyHeader) ? idempotencyHeader[0] : idempotencyHeader;
		if (!idempotencyKey || idempotencyKey.length < 8 || idempotencyKey.length > 120) {
			return reply.code(400).send({ error: "A valid Idempotency-Key header is required." });
		}
		if (!request.billingIdentity) return reply.code(401).send({ error: "Sign in is required." });
		return createCheckout(request.billingIdentity, body.mode, idempotencyKey);
	});
	app.get("/api/billing/status", { preHandler: requireClerkUser }, async (request, reply) => {
		if (!request.billingIdentity) return reply.code(401).send({ error: "Sign in is required." });
		const status = await getBillingStatus(request.billingIdentity.userId);
		const subscriptionOption = await monthlySubscriptionOption();
		return { ...status, subscriptionAvailable: subscriptionOption.available };
	});
	app.get("/api/billing/checkout/status", { preHandler: requireClerkUser }, async (request, reply) => {
		const queryParams = request.query as { reference?: string | string[] };
		const reference = Array.isArray(queryParams.reference) ? queryParams.reference[0] : queryParams.reference;
		const query = parse(z.object({ reference: z.string().min(1).max(120) }).strict(), { reference });
		if (!request.billingIdentity) return reply.code(401).send({ error: "Sign in is required." });
		return verifyCheckout(request.billingIdentity, query.reference);
	});
	app.post("/api/billing/subscription/cancel", { preHandler: requireClerkUser }, async (request, reply) => {
		if (!request.billingIdentity) return reply.code(401).send({ error: "Sign in is required." });
		return cancelSubscription(request.billingIdentity.userId);
	});
	app.post("/api/paystack/webhook", async (request, reply) => {
		const rawBody = (request as FastifyRequest & { rawBody?: Buffer }).rawBody;
		const signatureHeader = request.headers["x-paystack-signature"];
		const signature = Array.isArray(signatureHeader) ? signatureHeader[0] : signatureHeader;
		if (!rawBody || !verifyPaystackSignature(rawBody, signature)) {
			return reply.code(401).send({ error: "Invalid Paystack signature." });
		}
		const body = parse(z.object({
			event: z.string().min(1).max(100),
			data: z.record(z.string(), z.unknown()),
		}).strict(), request.body);
		const coursePurchase = await processCoursePurchaseWebhook(body.event, body.data);
		if (coursePurchase.handled) return coursePurchase;
		return processPaystackWebhook(body.event, body.data);
	});
	app.get("/api/courses", async (request, reply) => {
		const query = request.query as { manage?: string; mine?: string };
		if (query.manage !== "true" && query.mine !== "true") {
			let viewerUserId: string | undefined;
			if (request.headers.authorization) {
				await requireClerkSession(request, reply);
				if (reply.sent) return;
				viewerUserId = request.clerkUserId;
			}
			return publicCourseList(viewerUserId);
		}
		await requireAdmin(request, reply);
		if (reply.sent) return;
		const rows = await pool.query(
			`${courseSummaryQuery} ORDER BY c.updated_at DESC`,
		);
		return Promise.all(rows.rows.map(async (row) => ({
			id: row.id,
			creatorId: row.creator_id,
			creatorName: row.creator_name,
			title: row.title,
			description: row.description,
			price: row.price,
			status: row.status,
			createdAt: row.created_at,
			updatedAt: row.updated_at,
			thumbnailAsset: await displayAsset(row as Record<string, unknown>, "thumbnail"),
			modules: [],
		})));
	});

	app.post("/api/courses", { preHandler: requireAdmin }, async (request) => {
		const body = parse(courseCreateSchema, request.body);
		const ownerId = adminId();
		const claims = (request as FastifyRequest & { claims?: Record<string, unknown> }).claims;
		const creatorName = typeof claims?.name === "string" ? claims.name : null;
		const result = await pool.query<{ id: string }>(
			`INSERT INTO courses (creator_id, creator_name, title, description, price, metadata)
			 VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
			[ownerId, creatorName, body.title, body.description, body.price, JSON.stringify(body.metadata)],
		);
		return getCourse(result.rows[0].id, ownerId);
	});

	app.get<{ Params: IdParams }>("/api/courses/:id", async (request, reply) => {
		let ownerId: string | undefined;
		let viewerUserId: string | undefined;
		if (hasAdminSessionCookie(request)) {
			await requireAdmin(request, reply);
			if (reply.sent) return;
			ownerId = adminId();
		} else if (request.headers.authorization) {
			await requireClerkSession(request, reply);
			if (reply.sent) return;
			viewerUserId = request.clerkUserId;
		}
		return getCourse(paramId(request), ownerId, viewerUserId);
	});

	app.patch<{ Params: IdParams }>("/api/courses/:id", { preHandler: requireAdmin }, async (request) => {
		const id = paramId(request);
		const ownerId = adminId();
		const body = parse(coursePatchSchema, request.body);
		await ensureCourseOwner(id, ownerId);
		if (body.thumbnailAssetId) {
			const asset = await pool.query(
				"SELECT id FROM course_assets WHERE id = $1 AND course_id = $2 AND purpose = 'thumbnail' AND uploaded = true",
				[body.thumbnailAssetId, id],
			);
			if (!asset.rowCount) badRequest("Thumbnail asset is not an uploaded asset for this course.");
		}
		const fields: string[] = [];
		const values: unknown[] = [id];
		const add = (column: string, value: unknown) => {
			values.push(value);
			fields.push(`${column} = $${values.length}`);
		};
		if (body.title !== undefined) add("title", body.title);
		if (body.description !== undefined) add("description", body.description);
		if (body.price !== undefined) add("price", body.price);
		if (body.thumbnailAssetId !== undefined) add("thumbnail_asset_id", body.thumbnailAssetId);
		if (body.metadata !== undefined) add("metadata", JSON.stringify(body.metadata));
		await pool.query(
			`UPDATE courses SET ${fields.join(", ")}, updated_at = now() WHERE id = $1`,
			values,
		);
		return getCourse(id, ownerId);
	});

	app.delete<{ Params: IdParams }>("/api/courses/:id", { preHandler: requireAdmin }, async (request, reply) => {
		const id = paramId(request);
		const ownerId = adminId();
		await ensureCourseOwner(id, ownerId);
		const sales = await pool.query(
			"SELECT id FROM course_purchases WHERE course_id = $1 LIMIT 1",
			[id],
		);
		if (sales.rowCount) {
			const error = new Error("This course has purchase records and cannot be deleted. Unpublish it to remove it from the catalogue.");
			Object.assign(error, { statusCode: 409 });
			throw error;
		}
		const assets = await pool.query<{ id: string }>(
			"SELECT id FROM course_assets WHERE course_id = $1",
			[id],
		);
		for (const asset of assets.rows) await removeCourseAsset(asset.id);
		await pool.query("DELETE FROM courses WHERE id = $1", [id]);
		return reply.code(204).send();
	});

	app.post<{ Params: IdParams }>("/api/courses/:id/publish", { preHandler: requireAdmin }, async (request) => {
		const id = paramId(request);
		const ownerId = adminId();
		await ensureCourseOwner(id, ownerId);
		const course = await pool.query<{ title: string; description: string }>(
			"SELECT title, description FROM courses WHERE id = $1",
			[id],
		);
		const content = await pool.query<{ module_count: number; lesson_count: number; usable_block_count: number }>(
			`SELECT COUNT(DISTINCT m.id)::int AS module_count,
			        COUNT(DISTINCT l.id)::int AS lesson_count,
			        COUNT(DISTINCT b.id) FILTER (
			          WHERE (b.type = 'text' AND length(trim(coalesce(b.data->>'text', ''))) > 0)
			             OR (b.type IN ('image', 'video') AND a.uploaded = true)
			        )::int AS usable_block_count
			 FROM course_modules m
			 LEFT JOIN course_lessons l ON l.module_id = m.id
			 LEFT JOIN lesson_blocks b ON b.lesson_id = l.id
			 LEFT JOIN course_assets a ON a.id = b.asset_id
			 WHERE m.course_id = $1`,
			[id],
		);
		const counts = content.rows[0];
		const errors = [];
		if (!course.rows[0].title.trim()) errors.push("Add a course title.");
		if (!course.rows[0].description.trim()) errors.push("Add a course description.");
		if (counts.module_count < 1 || counts.lesson_count < 1) errors.push("Add at least one module and one lesson.");
		if (counts.usable_block_count < 1) errors.push("Add at least one text block with content or one uploaded media block.");
		if (errors.length) badRequest(errors.join(" "));
		await pool.query("UPDATE courses SET status = 'published', updated_at = now() WHERE id = $1", [id]);
		return getCourse(id, ownerId);
	});

	app.post<{ Params: CourseParams }>("/api/courses/:courseId/modules", { preHandler: requireAdmin }, async (request) => {
		const courseId = courseParamId(request);
		await ensureCourseOwner(courseId, adminId());
		const body = parse(z.object({ title: titleSchema }).strict(), request.body);
		const result = await pool.query<{ id: string }>(
			`INSERT INTO course_modules (course_id, title, position)
			 SELECT $1, $2, coalesce(max(position), -1) + 1 FROM course_modules WHERE course_id = $1
			 RETURNING id`,
			[courseId, body.title],
		);
		return { id: result.rows[0].id, courseId, title: body.title };
	});

	app.put<{ Params: CourseParams }>("/api/courses/:courseId/modules/reorder", { preHandler: requireAdmin }, async (request) => {
		const courseId = courseParamId(request);
		await ensureCourseOwner(courseId, adminId());
		const { ids } = parse(reorderSchema, request.body);
		await reorder("course_modules", "course_id", courseId, ids);
		return { ok: true };
	});

	app.patch<{ Params: IdParams }>("/api/modules/:id", { preHandler: requireAdmin }, async (request) => {
		const id = paramId(request);
		await ensureModuleOwner(id, adminId());
		const { title } = parse(titlePatchSchema, request.body);
		await pool.query("UPDATE course_modules SET title = $2, updated_at = now() WHERE id = $1", [id, title]);
		return { id, title };
	});

	app.delete<{ Params: IdParams }>("/api/modules/:id", { preHandler: requireAdmin }, async (request, reply) => {
		const id = paramId(request);
		const ownerId = adminId();
		await ensureModuleOwner(id, ownerId);
		const assets = await pool.query<{ asset_id: string }>(
			`SELECT DISTINCT b.asset_id FROM lesson_blocks b
			 JOIN course_lessons l ON l.id = b.lesson_id
			 WHERE l.module_id = $1 AND b.asset_id IS NOT NULL`,
			[id],
		);
		await pool.query("DELETE FROM course_modules WHERE id = $1", [id]);
		for (const asset of assets.rows) await removeAssetIfUnused(asset.asset_id, ownerId);
		return reply.code(204).send();
	});

	app.post<{ Params: IdParams }>("/api/modules/:id/lessons", { preHandler: requireAdmin }, async (request) => {
		const moduleId = paramId(request);
		await ensureModuleOwner(moduleId, adminId());
		const { title } = parse(z.object({ title: titleSchema }).strict(), request.body);
		const result = await pool.query<{ id: string }>(
			`INSERT INTO course_lessons (module_id, title, position)
			 SELECT $1, $2, coalesce(max(position), -1) + 1 FROM course_lessons WHERE module_id = $1
			 RETURNING id`,
			[moduleId, title],
		);
		return { id: result.rows[0].id, moduleId, title, blocks: [] };
	});

	app.put<{ Params: IdParams }>("/api/modules/:id/lessons/reorder", { preHandler: requireAdmin }, async (request) => {
		const moduleId = paramId(request);
		await ensureModuleOwner(moduleId, adminId());
		const { ids } = parse(reorderSchema, request.body);
		await reorder("course_lessons", "module_id", moduleId, ids);
		return { ok: true };
	});

	app.patch<{ Params: IdParams }>("/api/lessons/:id", { preHandler: requireAdmin }, async (request) => {
		const id = paramId(request);
		await ensureLessonOwner(id, adminId());
		const { title } = parse(titlePatchSchema, request.body);
		await pool.query("UPDATE course_lessons SET title = $2, updated_at = now() WHERE id = $1", [id, title]);
		return { id, title };
	});

	app.delete<{ Params: IdParams }>("/api/lessons/:id", { preHandler: requireAdmin }, async (request, reply) => {
		const id = paramId(request);
		const ownerId = adminId();
		await ensureLessonOwner(id, ownerId);
		const assets = await pool.query<{ asset_id: string }>(
			"SELECT asset_id FROM lesson_blocks WHERE lesson_id = $1 AND asset_id IS NOT NULL",
			[id],
		);
		await pool.query("DELETE FROM course_lessons WHERE id = $1", [id]);
		for (const asset of assets.rows) await removeAssetIfUnused(asset.asset_id, ownerId);
		return reply.code(204).send();
	});

	app.post<{ Params: IdParams }>("/api/lessons/:id/blocks", { preHandler: requireAdmin }, async (request) => {
		const lessonId = paramId(request);
		await ensureLessonOwner(lessonId, adminId());
		const body = parse(blockSchema, request.body);
		if (body.assetId) {
			const asset = await pool.query(
				`SELECT a.id FROM course_assets a
				 JOIN course_lessons l ON l.id = $2
				 JOIN course_modules m ON m.id = l.module_id
				 WHERE a.id = $1 AND a.course_id = m.course_id
				   AND a.uploaded = true AND a.purpose = $3`,
				[body.assetId, lessonId, body.type],
			);
			if (!asset.rowCount) badRequest("Asset is not available for this lesson.");
		}
		const result = await pool.query<{ id: string }>(
			`INSERT INTO lesson_blocks (lesson_id, type, data, asset_id, position)
			 SELECT $1, $2, $3, $4, coalesce(max(position), -1) + 1
			 FROM lesson_blocks WHERE lesson_id = $1 RETURNING id`,
			[lessonId, body.type, JSON.stringify(body.data), body.assetId ?? null],
		);
		return { id: result.rows[0].id, lessonId, type: body.type, position: 0, data: body.data, assetId: body.assetId ?? null };
	});

	app.put<{ Params: IdParams }>("/api/lessons/:id/blocks/reorder", { preHandler: requireAdmin }, async (request) => {
		const lessonId = paramId(request);
		await ensureLessonOwner(lessonId, adminId());
		const { ids } = parse(reorderSchema, request.body);
		await reorder("lesson_blocks", "lesson_id", lessonId, ids);
		return { ok: true };
	});

	app.patch<{ Params: IdParams }>("/api/blocks/:id", { preHandler: requireAdmin }, async (request) => {
		const id = paramId(request);
		await ensureBlockOwner(id, adminId());
		const body = parse(blockPatchSchema, request.body);
		if (body.assetId) {
			const asset = await pool.query(
				`SELECT a.id FROM course_assets a
				 JOIN lesson_blocks b ON b.id = $2
				 JOIN course_lessons l ON l.id = b.lesson_id
				 JOIN course_modules m ON m.id = l.module_id
				 WHERE a.id = $1 AND a.course_id = m.course_id
				   AND a.uploaded = true
				   AND a.purpose = CASE WHEN b.type = 'image' THEN 'image'
				                        WHEN b.type = 'video' THEN 'video' ELSE '' END`,
				[body.assetId, id],
			);
			if (!asset.rowCount) badRequest("Asset is not available for this block.");
		}
		const fields: string[] = [];
		const values: unknown[] = [id];
		if (body.data !== undefined) {
			values.push(JSON.stringify(body.data));
			fields.push(`data = $${values.length}`);
		}
		if (body.assetId !== undefined) {
			values.push(body.assetId);
			fields.push(`asset_id = $${values.length}`);
		}
		await pool.query(
			`UPDATE lesson_blocks SET ${fields.join(", ")}, updated_at = now() WHERE id = $1`,
			values,
		);
		return { id, ok: true };
	});

	app.delete<{ Params: IdParams }>("/api/blocks/:id", { preHandler: requireAdmin }, async (request, reply) => {
		const id = paramId(request);
		const ownerId = adminId();
		await ensureBlockOwner(id, ownerId);
		const result = await pool.query<{ asset_id: string | null }>(
			"SELECT asset_id FROM lesson_blocks WHERE id = $1",
			[id],
		);
		await pool.query("DELETE FROM lesson_blocks WHERE id = $1", [id]);
		if (result.rows[0]?.asset_id) await removeAssetIfUnused(result.rows[0].asset_id, ownerId);
		return reply.code(204).send();
	});

	app.post("/api/assets/upload-url", { preHandler: requireAdmin }, async (request) => {
		if (!storageAvailable) {
			const error = new Error(
				`Course asset uploads are unavailable. Configure valid values for: ${missingStorageConfig.join(", ")} in apps/backend/.env, then restart the backend.`,
			);
			Object.assign(error, { statusCode: 503 });
			throw error;
		}
		const body = parse(uploadSchema, request.body);
		const ownerId = adminId();
		await ensureCourseOwner(body.courseId, ownerId);
		if (!allowedFileType(body.purpose, body.contentType)) badRequest("Unsupported file type.");
		const maxSize = body.purpose === "video" ? config.maxVideoBytes : config.maxImageBytes;
		if (body.size > maxSize) badRequest(`File exceeds the ${Math.floor(maxSize / 1024 / 1024)} MB limit.`);
		const objectKey = makeObjectKey(body.courseId, body.purpose, body.fileName);
		const result = await pool.query<{ id: string }>(
			`INSERT INTO course_assets
			   (course_id, uploader_id, purpose, object_key, file_name, content_type, size_bytes)
			 VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
			[body.courseId, ownerId, body.purpose, objectKey, body.fileName, body.contentType, body.size],
		);
		const upload = await createUploadUrl(objectKey, body.contentType);
		return { assetId: result.rows[0].id, ...upload };
	});

	app.post<{ Params: IdParams }>("/api/assets/:id/complete", { preHandler: requireAdmin }, async (request) => {
		const id = paramId(request);
		const result = await pool.query<{
			object_key: string;
			content_type: string;
			size_bytes: string;
			file_name: string;
			purpose: string;
		}>(
			"SELECT object_key, content_type, size_bytes, file_name, purpose FROM course_assets WHERE id = $1",
			[id],
		);
		if (!result.rowCount) notFound("Upload not found.");
		const asset = result.rows[0];
		await verifyUploadedObject(asset.object_key, asset.content_type, Number(asset.size_bytes));
		await pool.query("UPDATE course_assets SET uploaded = true WHERE id = $1", [id]);
		return {
			id,
			fileName: asset.file_name,
			contentType: asset.content_type,
			size: Number(asset.size_bytes),
			purpose: asset.purpose,
		};
	});

	app.delete<{ Params: IdParams }>("/api/assets/:id", { preHandler: requireAdmin }, async (request, reply) => {
		const id = paramId(request);
		const asset = await pool.query("SELECT id FROM course_assets WHERE id = $1", [id]);
		if (!asset.rowCount) notFound("Asset not found.");
		await removeCourseAsset(id);
		return reply.code(204).send();
	});

	return app;
}
