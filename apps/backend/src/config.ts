import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
	DATABASE_URL: z.string().url().optional(),
	DATABASE_URL_POOLED: z.string().url().optional(),
	AWS_ENDPOINT_URL_S3: z.string().url().optional(),
	AWS_ACCESS_KEY_ID: z.string().optional(),
	AWS_SECRET_ACCESS_KEY: z.string().optional(),
	AWS_REGION: z.string().optional(),
	S3_BUCKET: z.string().optional(),
	COURSE_ADMIN_USERNAME: z.string().default("admin"),
	COURSE_ADMIN_PASSWORD: z.string().default("besire"),
	CLERK_SECRET_KEY: z.string().min(1).optional(),
	CLERK_AUTHORIZED_PARTIES: z.string().optional(),
	PAYSTACK_SECRET_KEY: z.string().min(1).optional(),
	PAYSTACK_MONTHLY_PLAN_CODE: z.string().min(1).optional(),
	BILLING_TOKEN_ENCRYPTION_KEY: z.string().min(32).optional(),
	WEB_APP_URL: z.string().url().default("http://localhost:5173"),
	PORT: z.coerce.number().int().positive().default(3001),
	WEB_ORIGIN: z.string().default("http://localhost:5173,http://127.0.0.1:5173,http://localhost:1420,http://127.0.0.1:1420,tauri://localhost,http://tauri.localhost"),
	MAX_IMAGE_BYTES: z.coerce.number().positive().default(15 * 1024 * 1024),
	MAX_VIDEO_BYTES: z.coerce.number().positive().default(500 * 1024 * 1024),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
	throw new Error(`Invalid backend environment configuration: ${parsed.error.issues.map((issue) => issue.path.join(".")).join(", ")}`);
}

const env = parsed.data;
const databaseUrl = env.DATABASE_URL_POOLED ?? env.DATABASE_URL;
if (!databaseUrl) {
	throw new Error("Missing required backend environment variable: DATABASE_URL or DATABASE_URL_POOLED");
}

export const config = {
	databaseUrl,
	port: env.PORT,
	webOrigin: env.WEB_ORIGIN.split(",").map((origin) => origin.trim()),
	adminUsername: env.COURSE_ADMIN_USERNAME,
	adminPassword: env.COURSE_ADMIN_PASSWORD,
	clerkSecretKey: env.CLERK_SECRET_KEY,
	clerkAuthorizedParties: (env.CLERK_AUTHORIZED_PARTIES ?? `${env.WEB_ORIGIN},tauri://localhost,http://tauri.localhost`).split(",").map((origin) => origin.trim()).filter(Boolean),
	paystackSecretKey: env.PAYSTACK_SECRET_KEY,
	paystackMonthlyPlanCode: env.PAYSTACK_MONTHLY_PLAN_CODE,
	billingTokenEncryptionKey: env.BILLING_TOKEN_ENCRYPTION_KEY,
	webAppUrl: env.WEB_APP_URL,
	maxImageBytes: env.MAX_IMAGE_BYTES,
	maxVideoBytes: env.MAX_VIDEO_BYTES,
	storage: {
		endpoint: env.AWS_ENDPOINT_URL_S3,
		accessKeyId: env.AWS_ACCESS_KEY_ID,
		secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
		region: env.AWS_REGION,
		bucket: env.S3_BUCKET,
	},
};
