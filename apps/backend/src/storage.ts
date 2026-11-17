import {
	DeleteObjectCommand,
	GetObjectCommand,
	HeadObjectCommand,
	PutObjectCommand,
	S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "node:crypto";
import { extname } from "node:path";
import { config } from "./config.js";

const storageConfig = config.storage;
const storageValues: Array<[string, string | undefined]> = [
	["AWS_ENDPOINT_URL_S3", storageConfig.endpoint],
	["AWS_ACCESS_KEY_ID", storageConfig.accessKeyId],
	["AWS_SECRET_ACCESS_KEY", storageConfig.secretAccessKey],
	["AWS_REGION", storageConfig.region],
	["S3_BUCKET", storageConfig.bucket],
];

export const missingStorageConfig = storageValues
	.filter(([, value]) => !value || value.includes("<generate"))
	.map(([name]) => name);
const hasStorageConfig = missingStorageConfig.length === 0;

export const storageAvailable = hasStorageConfig;

const client = hasStorageConfig
	? new S3Client({
			endpoint: storageConfig.endpoint,
			region: storageConfig.region,
			forcePathStyle: true,
			credentials: {
				accessKeyId: storageConfig.accessKeyId!,
				secretAccessKey: storageConfig.secretAccessKey!,
			},
		})
	: null;

function bucket(): string {
	if (!client || !storageConfig.bucket) {
		throw new Error(`Course asset storage is not configured. Set valid values for: ${missingStorageConfig.join(", ")}.`);
	}
	return storageConfig.bucket;
}

export function makeObjectKey(courseId: string, purpose: string, fileName: string) {
	const suffix = extname(fileName).toLowerCase().replace(/[^.a-z0-9]/g, "").slice(0, 12);
	return `courses/${courseId}/${purpose}/${randomUUID()}${suffix}`;
}

export async function createUploadUrl(key: string, contentType: string) {
	if (!client) throw new Error(`Course asset storage is not configured. Set valid values for: ${missingStorageConfig.join(", ")}.`);
	const command = new PutObjectCommand({
		Bucket: bucket(),
		Key: key,
		ContentType: contentType,
	});
	const uploadUrl = await getSignedUrl(client, command, { expiresIn: 900 });
	return { uploadUrl, headers: { "Content-Type": contentType } };
}

export async function createDownloadUrl(key: string) {
	if (!client) throw new Error(`Course asset storage is not configured. Set valid values for: ${missingStorageConfig.join(", ")}.`);
	return getSignedUrl(
		client,
		new GetObjectCommand({ Bucket: bucket(), Key: key }),
		{ expiresIn: 3600 },
	);
}

export async function verifyUploadedObject(key: string, contentType: string, size: number) {
	if (!client) throw new Error(`Course asset storage is not configured. Set valid values for: ${missingStorageConfig.join(", ")}.`);
	const result = await client.send(new HeadObjectCommand({ Bucket: bucket(), Key: key }));
	if (result.ContentLength !== size || result.ContentType !== contentType) {
		throw new Error("Uploaded file metadata does not match the declared upload.");
	}
}

export async function removeObject(key: string) {
	if (!client) throw new Error(`Course asset storage is not configured. Set valid values for: ${missingStorageConfig.join(", ")}.`);
	await client.send(new DeleteObjectCommand({ Bucket: bucket(), Key: key }));
}
