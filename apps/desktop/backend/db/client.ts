import { MongoLite } from "@semics-tech/mongolite";
import path from "node:path";

const dbPath = path.join(process.cwd(), "data", "besire.sqlite");

export const db = new MongoLite(dbPath);

export async function connectDatabase() {
	await db.connect();
	console.log("Besire database connected");
}
