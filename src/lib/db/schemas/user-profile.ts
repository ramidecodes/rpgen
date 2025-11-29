import { z } from "zod";

export const createUserProfileSchema = z.object({
  clerkUserId: z.string().min(1).max(255),
  username: z.string().max(100).optional(),
});

export const updateUserProfileSchema = z.object({
  clerkUserId: z.string().min(1).max(255).optional(),
  username: z.string().max(100).optional(),
});

// Inferred TypeScript types from Zod schemas
export type CreateUserProfile = z.infer<typeof createUserProfileSchema>;
export type UpdateUserProfile = z.infer<typeof updateUserProfileSchema>;
