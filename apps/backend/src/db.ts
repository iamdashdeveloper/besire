import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { config } from "./config.js";

export const pool = new pg.Pool({
	connectionString: config.databaseUrl,
	max: 12,
	ssl: { rejectUnauthorized: true },
});

export async function migrate() {
	for (const name of ["001_courses.sql", "002_billing.sql", "003_course_purchases.sql", "004_desktop_profiles.sql"]) {
		const migrationPath = fileURLToPath(new URL(`../migrations/${name}`, import.meta.url));
		const sql = await readFile(migrationPath, "utf8");
		await pool.query(sql);
	}
}
