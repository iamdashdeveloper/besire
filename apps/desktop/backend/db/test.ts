import { connectDatabase } from "./client";
import { profiles } from "./collections";

async function main() {
	await connectDatabase();

	await profiles.insertOne({
		name: "Polly",
		headline: "GIS & Remote Sensing",
		skills: ["GIS", "Remote Sensing", "React", "TypeScript"]
	});

	const profile = await profiles.findOne({
		name: "Polly"
	});

	console.log("Profile:", profile);
}

main().catch(console.error);
