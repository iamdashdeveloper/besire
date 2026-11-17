// @ts-nocheck
import express from "express";
import cors from "cors";
import { randomUUID } from "node:crypto";
import { mkdir, rm, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { connectDatabase, dataDirectory } from "../db/client";
import type { Profile, ProfileDocument } from "../db/models/profile";
import { defaultResumeData, isResumeData, type ResumeData } from "../db/models/resume";
import {
	addProfileDocument,
	createProfile,
	deleteProfile,
	getProfile,
	listProfiles,
	removeProfileDocument,
	updateProfile
} from "../services/profile.service";
import {
	createResume,
	deleteResume,
	getResume,
	listResumes,
	updateResume
} from "../services/resume.service";

const app = express();
const port = Number(process.env.PROFILE_PORT || 3002);
const documentDirectory = path.join(dataDirectory, "profile-documents");
const allowedOrigins = new Set([
	"http://localhost:1420",
	"http://127.0.0.1:1420",
	"http://tauri.localhost",
	"tauri://localhost"
]);
const documentTypes = {
	".pdf": "application/pdf",
	".docx":
		"application/vnd.openxmlformats-officedocument.wordprocessingml.document"
} as const;

app.use(
	cors({
		origin(origin, callback) {
			if (!origin || allowedOrigins.has(origin)) callback(null, true);
			else
				callback(
					new Error("Origin is not allowed to access local profile storage.")
				);
		}
	})
);
app.use(express.json({ limit: "10mb" }));

function isSafeId(value: string) {
	return /^[a-zA-Z0-9_-]{1,128}$/.test(value);
}

function normalizeProfile(value: unknown): Profile | null {
	if (!value || typeof value !== "object" || Array.isArray(value)) return null;
	const profile = value as Partial<Profile>;
	if (typeof profile.name !== "string" || !profile.name.trim()) return null;
	if (
		!profile.personal ||
		!profile.professional ||
		!profile.interests ||
		!profile.workPreferences
	)
		return null;
	return {
		...profile,
		name: profile.name.trim(),
		documents: Array.isArray(profile.documents) ? profile.documents : []
	} as Profile;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return !!value && typeof value === "object" && !Array.isArray(value);
}

function normalizeResumeData(value: unknown): ResumeData | null {
	return isResumeData(value) ? value : null;
}

function normalizeResumeInput(value: unknown): {
	name?: string;
	data: ResumeData;
} | null {
	if (!isRecord(value)) return null;
	const data = value.data === undefined
		? structuredClone(defaultResumeData)
		: normalizeResumeData(value.data);
	if (!data) return null;
	if (value.name !== undefined && typeof value.name !== "string") return null;
	return {
		...(typeof value.name === "string" ? { name: value.name } : {}),
		data
	};
}

function sendServerError(
	response: express.Response,
	error: unknown,
	message: string
) {
	console.error(message, error);
	response.status(500).json({ error: message });
}

app.get("/api/resumes", async (_request, response) => {
	try {
		response.json(await listResumes());
	} catch (error) {
		sendServerError(response, error, "Could not load resumes.");
	}
});

app.post("/api/resumes", async (request, response) => {
	const input = normalizeResumeInput(request.body);
	if (!input)
		return response.status(400).json({
			error: "Resume data must include valid Reactive Resume data."
		});
	try {
		return response.status(201).json(await createResume(input));
	} catch (error) {
		return sendServerError(response, error, "Could not create resume.");
	}
});

app.post("/api/resumes/import", async (request, response) => {
	const body = request.body;
	const importedData =
		isRecord(body) && "data" in body ? normalizeResumeData(body.data) : normalizeResumeData(body);
	if (!importedData)
		return response.status(400).json({
			error: "Import must be a Reactive Resume JSON document or a document containing its data."
		});
	const name =
		isRecord(body) && typeof body.name === "string" ? body.name : undefined;
	try {
		return response.status(201).json(await createResume({ name, data: importedData }));
	} catch (error) {
		return sendServerError(response, error, "Could not import resume.");
	}
});

app.get("/api/resumes/:resumeId", async (request, response) => {
	const { resumeId } = request.params;
	if (!isSafeId(resumeId))
		return response.status(400).json({ error: "Invalid resume ID." });
	try {
		const resume = await getResume(resumeId);
		if (!resume) return response.status(404).json({ error: "Resume not found." });
		return response.json(resume);
	} catch (error) {
		return sendServerError(response, error, "Could not load resume.");
	}
});

app.get("/api/resumes/:resumeId/export", async (request, response) => {
	const { resumeId } = request.params;
	if (!isSafeId(resumeId))
		return response.status(400).json({ error: "Invalid resume ID." });
	try {
		const resume = await getResume(resumeId);
		if (!resume) return response.status(404).json({ error: "Resume not found." });
		const fileName = `${resume.name || "resume"}.json`.replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_");
		return response
			.type("application/json")
			.attachment(fileName)
			.send(JSON.stringify(resume.data, null, 2));
	} catch (error) {
		return sendServerError(response, error, "Could not export resume.");
	}
});

app.put("/api/resumes/:resumeId", async (request, response) => {
	const { resumeId } = request.params;
	if (!isSafeId(resumeId))
		return response.status(400).json({ error: "Invalid resume ID." });
	if (!isRecord(request.body))
		return response.status(400).json({ error: "Resume update must be an object." });
	const updates: { name?: string; data?: ResumeData } = {};
	if (request.body.name !== undefined) {
		if (typeof request.body.name !== "string")
			return response.status(400).json({ error: "Resume name must be text." });
		updates.name = request.body.name;
	}
	if (request.body.data !== undefined) {
		const data = normalizeResumeData(request.body.data);
		if (!data)
			return response.status(400).json({ error: "Resume data is not valid Reactive Resume data." });
		updates.data = data;
	}
	if (Object.keys(updates).length === 0)
		return response.status(400).json({ error: "Provide resume name or data to update." });
	try {
		const updated = await updateResume(resumeId, updates);
		if (!updated) return response.status(404).json({ error: "Resume not found." });
		return response.json(updated);
	} catch (error) {
		return sendServerError(response, error, "Could not update resume.");
	}
});

app.delete("/api/resumes/:resumeId", async (request, response) => {
	const { resumeId } = request.params;
	if (!isSafeId(resumeId))
		return response.status(400).json({ error: "Invalid resume ID." });
	try {
		const removed = await deleteResume(resumeId);
		if (!removed) return response.status(404).json({ error: "Resume not found." });
		return response.status(204).end();
	} catch (error) {
		return sendServerError(response, error, "Could not delete resume.");
	}
});

app.get("/api/profiles", async (_request, response) => {
	try {
		response.json(await listProfiles());
	} catch (error) {
		sendServerError(response, error, "Could not load profiles.");
	}
});

app.post("/api/profiles", async (request, response) => {
	const profile = normalizeProfile(request.body);
	if (!profile)
		return response
			.status(400)
			.json({ error: "A profile name and profile details are required." });
	try {
		response.status(201).json(await createProfile(profile));
	} catch (error) {
		sendServerError(response, error, "Could not create profile.");
	}
});

app.get("/api/profiles/:profileId", async (request, response) => {
	const { profileId } = request.params;
	if (!isSafeId(profileId))
		return response.status(400).json({ error: "Invalid profile ID." });
	try {
		const profile = await getProfile(profileId);
		if (!profile)
			return response.status(404).json({ error: "Profile not found." });
		return response.json(profile);
	} catch (error) {
		return sendServerError(response, error, "Could not load profile.");
	}
});

app.put("/api/profiles/:profileId", async (request, response) => {
	const { profileId } = request.params;
	if (!isSafeId(profileId))
		return response.status(400).json({ error: "Invalid profile ID." });
	const profile = normalizeProfile(request.body);
	if (!profile)
		return response
			.status(400)
			.json({ error: "A profile name and profile details are required." });
	try {
		const updated = await updateProfile(profileId, profile);
		if (!updated)
			return response.status(404).json({ error: "Profile not found." });
		return response.json(updated);
	} catch (error) {
		return sendServerError(response, error, "Could not update profile.");
	}
});

app.delete("/api/profiles/:profileId", async (request, response) => {
	const { profileId } = request.params;
	if (!isSafeId(profileId))
		return response.status(400).json({ error: "Invalid profile ID." });
	try {
		const removed = await deleteProfile(profileId);
		if (!removed)
			return response.status(404).json({ error: "Profile not found." });
		await rm(path.join(documentDirectory, profileId), {
			recursive: true,
			force: true
		});
		return response.status(204).end();
	} catch (error) {
		return sendServerError(
			response,
			error,
			"Could not delete profile and its local files."
		);
	}
});

app.post(
	"/api/profiles/:profileId/documents",
	express.raw({ type: () => true, limit: "20mb" }),
	async (request, response) => {
		const { profileId } = request.params;
		if (!isSafeId(profileId))
			return response.status(400).json({ error: "Invalid profile ID." });
		const profile = await getProfile(profileId).catch((error) => {
			sendServerError(response, error, "Could not load profile.");
			return null;
		});
		if (!profile) {
			if (!response.headersSent)
				response.status(404).json({ error: "Profile not found." });
			return;
		}

		const body = request.body;
		if (!Buffer.isBuffer(body) || body.length === 0) {
			return response
				.status(400)
				.json({ error: "Choose a non-empty PDF or DOCX file." });
		}
		const kind = request.query.kind;
		if (kind !== "resume" && kind !== "cv") {
			return response
				.status(400)
				.json({ error: "Document type must be resume or cv." });
		}
		const name =
			typeof request.query.name === "string" ?
				path.basename(request.query.name).trim()
			:	"";
		const extension = path
			.extname(name)
			.toLowerCase() as keyof typeof documentTypes;
		const contentType = documentTypes[extension];
		if (!name || !contentType)
			return response
				.status(400)
				.json({ error: "Only PDF and DOCX documents are supported." });

		const document: ProfileDocument = {
			_id: randomUUID(),
			name,
			kind,
			contentType,
			sizeBytes: body.length,
			createdAt: new Date().toISOString()
		};
		const profileDocumentDirectory = path.join(documentDirectory, profileId);
		const filePath = path.join(
			profileDocumentDirectory,
			`${document._id}${extension}`
		);
		try {
			await mkdir(profileDocumentDirectory, { recursive: true });
			await writeFile(filePath, body, { flag: "wx" });
			const updated = await addProfileDocument(profileId, document);
			if (!updated) {
				await unlink(filePath);
				return response.status(404).json({ error: "Profile not found." });
			}
			return response.status(201).json({ profile: updated, document });
		} catch (error) {
			try {
				await unlink(filePath);
			} catch (cleanupError) {
				console.error(
					"Could not clean up an incomplete profile document upload.",
					cleanupError
				);
			}
			return sendServerError(
				response,
				error,
				"Could not save the document to this profile."
			);
		}
	}
);

app.get(
	"/api/profiles/:profileId/documents/:documentId/download",
	async (request, response) => {
		const { profileId, documentId } = request.params;
		if (!isSafeId(profileId) || !isSafeId(documentId))
			return response.status(400).json({ error: "Invalid document address." });
		try {
			const profile = await getProfile(profileId);
			const document = profile?.documents?.find(
				(item) => item._id === documentId
			);
			if (!profile || !document)
				return response.status(404).json({ error: "Document not found." });
			const extension = path
				.extname(document.name)
				.toLowerCase() as keyof typeof documentTypes;
			const filePath = path.join(
				documentDirectory,
				profileId,
				`${documentId}${extension}`
			);
			return response.download(filePath, document.name, (error) => {
				if (error && !response.headersSent)
					response.status(404).json({ error: "Document file not found." });
			});
		} catch (error) {
			return sendServerError(response, error, "Could not open the document.");
		}
	}
);

app.delete(
	"/api/profiles/:profileId/documents/:documentId",
	async (request, response) => {
		const { profileId, documentId } = request.params;
		if (!isSafeId(profileId) || !isSafeId(documentId))
			return response.status(400).json({ error: "Invalid document address." });
		try {
			const result = await removeProfileDocument(profileId, documentId);
			if (!result)
				return response
					.status(404)
					.json({ error: "Profile or document not found." });
			const extension = path
				.extname(result.document.name)
				.toLowerCase() as keyof typeof documentTypes;
			await unlink(
				path.join(documentDirectory, profileId, `${documentId}${extension}`)
			).catch((error: NodeJS.ErrnoException) => {
				if (error.code !== "ENOENT") throw error;
			});
			return response.json(result.profile);
		} catch (error) {
			return sendServerError(response, error, "Could not remove the document.");
		}
	}
);

async function start() {
	await connectDatabase();
	app.listen(port, "127.0.0.1", () => {
		console.log(`Local profile API listening at http://127.0.0.1:${port}`);
	});
}

start().catch((error: unknown) => {
	console.error("Local profile API failed to start.", error);
	process.exitCode = 1;
});
