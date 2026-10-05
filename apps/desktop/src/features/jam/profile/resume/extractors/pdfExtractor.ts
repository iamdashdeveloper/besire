export async function extractPdf(file: File): Promise<string> {
	const arrayBuffer = await file.arrayBuffer();
	const uint8Array = new Uint8Array(arrayBuffer);

	let result: { text: string };

	if (typeof window !== "undefined") {
		// Browser ESM build - PDFParse is a class
		const { PDFParse } = await import("pdf-parse");

		// Configure the pdf.js worker for browser PDF parsing.
		// The worker file is served from the app's public directory.
		PDFParse.setWorker("/pdf.worker.mjs");

		const parser = new PDFParse({ data: uint8Array });
		result = await parser.getText();
	} else {
		// Node.js CJS build - pdf-parse is a function
		const pdfParse = require("pdf-parse");
		result = await pdfParse(uint8Array);
	}

	if (!result.text || result.text.trim().length === 0) {
		throw new Error("PDF contains no extractable text. The document may be scanned or image-based.");
	}
	return result.text;
}