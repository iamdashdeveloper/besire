import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";
const host = process.env.TAURI_DEV_HOST;
const port = Number(process.env.VITE_DEV_PORT || 1420);

// https://vite.dev/config/
export default defineConfig(async ({ mode }) => {
	const env = loadEnv(mode, process.cwd(), "");
	if (mode === "production" && !env.VITE_API_URL) {
		throw new Error("VITE_API_URL must be set when building the desktop app.");
	}

	return {
	plugins: [react(), tailwindcss()],

	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./src")
		}
	},

	// Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
	//
	// 1. prevent Vite from obscuring rust errors
	clearScreen: false,
	// 2. tauri expects a fixed port, fail if that port is not available
	server: {
		port,
		strictPort: true,
		host: host || false,
		hmr:
			host ?
				{
					protocol: "ws",
					host,
					port: 1421
				}
			:	undefined,
		watch: {
			// 3. tell Vite to ignore watching `src-tauri`
			ignored: ["**/src-tauri/**"]
		}
	}
	};
});
