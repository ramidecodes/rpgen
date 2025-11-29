"use server";

import { requireAuth } from "@/lib/auth/clerk";
import {
  createUserProfile,
  getUserProfileByClerkId,
  updateUserProfile,
} from "@/lib/db/queries/user-profile";
import type {
  CreateUserProfile,
  UpdateUserProfile,
} from "@/lib/db/schemas/user-profile";

/**
 * Server action to create a user profile
 * Requires authentication - uses current user's Clerk ID
 */
export async function createUserProfileAction(
  data: Omit<CreateUserProfile, "clerkUserId">
) {
  try {
    const user = await requireAuth();

    const profileData: CreateUserProfile = {
      ...data,
      clerkUserId: user.id,
    };

    const profile = await createUserProfile(profileData);
    return { success: true, data: profile };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to create user profile",
    };
  }
}

/**
 * Server action to get the current user's profile
 * Requires authentication
 */
export async function getUserProfileAction() {
  try {
    const user = await requireAuth();
    const profile = await getUserProfileByClerkId(user.id);

    if (!profile) {
      return {
        success: false,
        error: "User profile not found",
        data: null,
      };
    }

    return { success: true, data: profile };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to get user profile",
      data: null,
    };
  }
}

/**
 * Server action to update the current user's profile
 * Requires authentication - uses current user's Clerk ID
 */
export async function updateUserProfileAction(data: UpdateUserProfile) {
  try {
    const user = await requireAuth();

    // Don't allow updating clerkUserId through this action
    const updateData: UpdateUserProfile = { ...data };
    delete updateData.clerkUserId;

    const profile = await updateUserProfile(user.id, updateData);
    return { success: true, data: profile };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to update user profile",
    };
  }
}
