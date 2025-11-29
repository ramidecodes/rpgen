import { getCurrentUser } from "@/lib/auth/clerk";
import {
  createUserProfile,
  getUserProfileByClerkId,
} from "../queries/user-profile";

/**
 * Ensure a user profile exists for the current authenticated user.
 * This is an idempotent operation that checks if a profile exists,
 * and creates one if it doesn't. Handles race conditions gracefully.
 *
 * @returns The user profile (existing or newly created)
 * @throws Error if user is not authenticated or profile creation fails
 */
export async function ensureUserProfile() {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("User must be authenticated to ensure profile");
  }

  // Check if profile already exists
  const existingProfile = await getUserProfileByClerkId(user.id);

  if (existingProfile) {
    return existingProfile;
  }

  // Profile doesn't exist, create it
  // Handle race condition: if another request creates the profile
  // between our check and creation, catch the duplicate error
  try {
    const newProfile = await createUserProfile({
      clerkUserId: user.id,
      username: user.username ?? undefined,
    });
    return newProfile;
  } catch (error) {
    // If profile was created by another request, fetch it
    if (error instanceof Error && error.message.includes("already exists")) {
      const profile = await getUserProfileByClerkId(user.id);
      if (profile) {
        return profile;
      }
    }
    // Re-throw if it's a different error
    throw error;
  }
}
