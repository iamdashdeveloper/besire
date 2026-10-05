import type mammoth from "mammoth";

let mammothModule: typeof mammoth | null = null;

async function getMammoth(): Promise<typeof mammoth> {
	if (mammothModule) return mammothModule;
	if (typeof window !== "undefined") {
		mammothModule = await import("mammoth");
	} else {
		mammothModule = require("mammoth");
	}
	return mammothModule as typeof mammoth;
}

export async function extractDocx(file: File): Promise<string> {
	const module = (await getMammoth())!;
	const arrayBuffer = await file.arrayBuffer();
	const result = await module.extractRawText({ arrayBuffer });
	if (result.messages.length > 0) {
		const errors = result.messages.filter((m) => m.type === "error");
		if (errors.length > 0) {
			throw new Error(`DOCX extraction failed: ${errors.map((e) => e.message).join(", ")}`);
		}
	}
	return result.value;
}