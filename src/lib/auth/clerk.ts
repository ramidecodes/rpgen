import { auth, currentUser } from "@clerk/nextjs/server"

/**
 * Get the current authenticated user
 * @returns The current user object or null if not authenticated
 */
export async function getCurrentUser() {
  const user = await currentUser()
  return user
}

/**
 * Require authentication - throws error if user is not authenticated
 * @returns The authenticated user
 * @throws Error if user is not authenticated
 */
export async function requireAuth() {
  const { userId } = await auth()

  if (!userId) {
    throw new Error("Unauthorized: Authentication required")
  }

  const user = await currentUser()

  if (!user) {
    throw new Error("Unauthorized: User not found")
  }

  return user
}
