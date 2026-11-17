import { MongoLite } from "@semics-tech/mongolite";
import { mkdirSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const defaultDataDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../data");
export const dataDirectory = path.resolve(process.env.BESIRE_DATA_DIR || defaultDataDirectory);
const dbPath = path.join(dataDirectory, "besire.sqlite");

mkdirSync(dataDirectory, { recursive: true });

export const db = new MongoLite(dbPath);

export async function connectDatabase() {
	await mkdir(dataDirectory, { recursive: true });
	await db.connect();
	console.log("Besire database connected");
}
