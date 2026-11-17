import { buildApp } from "./app.js";
import { pool, migrate } from "./db.js";
import { config } from "./config.js";

async function start() {
	await migrate();
	const app = await buildApp();

	const shutdown = async (signal: string) => {
		app.log.info({ signal }, "Shutting down course API");
		await app.close();
		await pool.end();
		process.exit(0);
	};

	process.once("SIGINT", () => void shutdown("SIGINT"));
	process.once("SIGTERM", () => void shutdown("SIGTERM"));

	await app.listen({ host: "0.0.0.0", port: config.port });
	app.log.info({ port: config.port }, "Course API listening");
}

start().catch((error: unknown) => {
	console.error("Course API failed to start. Check backend configuration and database connectivity.");
	if (error instanceof Error) console.error(error.message);
	process.exitCode = 1;
});
