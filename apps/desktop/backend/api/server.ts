import express from "express";
import cors from "cors";
import { createProfile as createProfileService } from "../services/profile.service";
import type { Profile } from "../db/models/profile";
import { getProfile as getProfileService } from "../services/profile.service";
import { updateProfile as updateProfileService } from "../services/profile.service";
import { listProfiles as listProfilesService } from "../services/profile.service";
import { InsertOneResult } from "@semics-tech/mongolite";
import { DocumentWithId } from "@semics-tech/mongolite";
import { UpdateResult } from "@semics-tech/mongolite";

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Create profile endpoint
app.post(
	"/api/profile",
	async (
		req: { body: Profile },
		res: {
			json: (arg0: InsertOneResult) => void;
			status: (arg0: number) => {
				(): any;
				new (): any;
				json: { (arg0: { error: string }): void; new (): any };
			};
		}
	) => {
		try {
			const profile = req.body as Profile;
			const result = await createProfileService(profile);
			res.json(result);
		} catch (error) {
			console.error("Error creating profile:", error);
			res.status(500).json({ error: "Failed to create profile" });
		}
	}
);

// Get profile endpoint
app.get(
	"/api/profile",
	async (
		req: any,
		res: {
			json: (arg0: DocumentWithId | null) => void;
			status: (arg0: number) => {
				(): any;
				new (): any;
				json: { (arg0: { error: string }): void; new (): any };
			};
		}
	) => {
		try {
			const result = await getProfileService();
			res.json(result);
		} catch (error) {
			console.error("Error getting profile:", error);
			res.status(500).json({ error: "Failed to get profile" });
		}
	}
);

// List profiles endpoint
app.get(
	"/api/profiles",
	async (
		req: any,
		res: {
			json: (arg0: Profile[]) => void;
			status: (arg0: number) => {
				(): any;
				new (): any;
				json: { (arg0: { error: string }): void; new (): any };
			};
		}
	) => {
		try {
			const result = await listProfilesService();
			res.json(result);
		} catch (error) {
			console.error("Error listing profiles:", error);
			res.status(500).json({ error: "Failed to list profiles" });
		}
	}
);

// Update profile endpoint
app.put(
	"/api/profile/:id",
	async (
		req: { params: { id: any }; body: Partial<Profile> },
		res: {
			json: (arg0: UpdateResult) => void;
			status: (arg0: number) => {
				(): any;
				new (): any;
				json: { (arg0: { error: string }): void; new (): any };
			};
		}
	) => {
		try {
			const { id } = req.params;
			const updates = req.body as Partial<Profile>;
			const result = await updateProfileService(id, updates);
			res.json(result);
		} catch (error) {
			console.error("Error updating profile:", error);
			res.status(500).json({ error: "Failed to update profile" });
		}
	}
);

app.listen(PORT, () => {
	console.log(`Profile API server running on port ${PORT}`);
});
