import { eq } from "drizzle-orm"
import { db } from "../index"
import { userProfiles } from "../schema"
import type { UserProfileUpdate } from "../schema"
import {
	createUserProfileSchema,
	updateUserProfileSchema,
	type CreateUserProfile,
	type UpdateUserProfile,
} from "../schemas/user-profile"

/**
 * Create a new user profile with Zod validation
 * @param data - User profile data to create
 * @returns The created user profile
 * @throws Error if validation fails or duplicate Clerk user ID exists
 */
export async function createUserProfile(
	data: CreateUserProfile,
): Promise<typeof userProfiles.$inferSelect> {
	// Validate input with Zod
	const validatedData = createUserProfileSchema.parse(data)

	try {
		const [profile] = await db
			.insert(userProfiles)
			.values({
				clerkUserId: validatedData.clerkUserId,
				username: validatedData.username ?? null,
			})
			.returning()

		return profile
	} catch (error) {
		// Handle duplicate Clerk user ID error
		if (
			error instanceof Error &&
			error.message.includes("unique constraint")
		) {
			throw new Error(
				`User profile with Clerk ID ${validatedData.clerkUserId} already exists`,
			)
		}
		throw error
	}
}

/**
 * Get user profile by Clerk user ID
 * @param clerkUserId - Clerk user ID to search for
 * @returns User profile or null if not found
 */
export async function getUserProfileByClerkId(
	clerkUserId: string,
): Promise<(typeof userProfiles.$inferSelect) | null> {
	const [profile] = await db
		.select()
		.from(userProfiles)
		.where(eq(userProfiles.clerkUserId, clerkUserId))
		.limit(1)

	return profile ?? null
}

/**
 * Update user profile with Zod validation
 * @param clerkUserId - Clerk user ID of the profile to update
 * @param data - User profile data to update
 * @returns The updated user profile
 * @throws Error if validation fails or profile not found
 */
export async function updateUserProfile(
	clerkUserId: string,
	data: UpdateUserProfile,
): Promise<typeof userProfiles.$inferSelect> {
	// Validate input with Zod
	const validatedData = updateUserProfileSchema.parse(data)

	// Auto-update updated_at timestamp
	const updateData: UserProfileUpdate = {
		...validatedData,
		updatedAt: new Date(),
	}

	const [updatedProfile] = await db
		.update(userProfiles)
		.set(updateData)
		.where(eq(userProfiles.clerkUserId, clerkUserId))
		.returning()

	if (!updatedProfile) {
		throw new Error(`User profile with Clerk ID ${clerkUserId} not found`)
	}

	return updatedProfile
}

/**
 * Delete user profile (hard delete)
 * @param clerkUserId - Clerk user ID of the profile to delete
 * @returns The deleted user profile
 * @throws Error if profile not found
 */
export async function deleteUserProfile(
	clerkUserId: string,
): Promise<typeof userProfiles.$inferSelect> {
	const [deletedProfile] = await db
		.delete(userProfiles)
		.where(eq(userProfiles.clerkUserId, clerkUserId))
		.returning()

	if (!deletedProfile) {
		throw new Error(`User profile with Clerk ID ${clerkUserId} not found`)
	}

	return deletedProfile
}

