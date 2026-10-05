import { extractDocx } from "./extractors/docxExtractor";
import { extractPdf } from "./extractors/pdfExtractor";

export type SupportedFileType = "docx" | "pdf";

export interface ExtractionResult {
	text: string;
	fileType: SupportedFileType;
	fileName: string;
}

export class UnsupportedFileTypeError extends Error {
	constructor(fileType: string) {
		super(`Unsupported file type: ${fileType}. Supported types: .docx, .pdf`);
		this.name = "UnsupportedFileTypeError";
	}
}

export class ExtractionError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "ExtractionError";
	}
}

function getFileExtension(fileName: string): string {
	return fileName.toLowerCase().split(".").pop() || "";
}

function isSupportedFileType(ext: string): ext is SupportedFileType {
	return ext === "docx" || ext === "pdf";
}

export async function extractResumeText(file: File): Promise<ExtractionResult> {
	const ext = getFileExtension(file.name);

	if (!isSupportedFileType(ext)) {
		throw new UnsupportedFileTypeError(ext || "unknown");
	}

	let text: string;

	try {
		if (ext === "docx") {
			text = await extractDocx(file);
		} else {
			text = await extractPdf(file);
		}
	} catch (error) {
		if (error instanceof UnsupportedFileTypeError) {
			throw error;
		}
		throw new ExtractionError(`Failed to extract text from ${ext.toUpperCase()}: ${(error as Error).message}`);
	}

	const normalizedText = text
		.replace(/\r\n/g, "\n")
		.replace(/\r/g, "\n")
		.replace(/\n{3,}/g, "\n\n")
		.trim();

	if (!normalizedText) {
		throw new ExtractionError("Extracted text is empty");
	}

	return {
		text: normalizedText,
		fileType: ext,
		fileName: file.name,
	};
}