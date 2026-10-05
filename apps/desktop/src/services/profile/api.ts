import type { Profile } from "../../../backend/api/index";

export async function createProfile(profile: Profile): Promise<{ _id: string }> {
  const response = await fetch("http://localhost:3001/api/profile", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(profile),
  });

  if (!response.ok) {
    throw new Error(`Failed to create profile: ${response.statusText}`);
  }

  return response.json();
}

export async function getProfile(): Promise<Profile | null> {
  const response = await fetch("http://localhost:3001/api/profile");

  if (!response.ok) {
    throw new Error(`Failed to get profile: ${response.statusText}`);
  }

  const result = await response.json();
  return result;
}

export async function listProfiles(): Promise<Profile[]> {
  const response = await fetch("http://localhost:3001/api/profiles");

  if (!response.ok) {
    throw new Error(`Failed to list profiles: ${response.statusText}`);
  }

  const result = await response.json();
  return result;
}

export async function updateProfile(id: string, updates: Partial<Profile>): Promise<{ _id: string }> {
  const response = await fetch(`http://localhost:3001/api/profile/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(updates),
  });

  if (!response.ok) {
    throw new Error(`Failed to update profile: ${response.statusText}`);
  }

  return response.json();
}