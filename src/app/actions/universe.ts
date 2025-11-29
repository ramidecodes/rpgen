"use server";

import { db } from "@/lib/db";
import { universes } from "@/lib/db/schema";
import { createUniverseInputSchema } from "@/lib/db/schemas/universe";
import { generateUniverse } from "@/lib/ai/universe-generator";
import { generateUniverseImage } from "@/lib/ai/image-generator";
import { uploadImage, getPublicUrl } from "@/lib/storage/r2";
import { ensureUserProfile } from "@/lib/db/utils/user-profile";
import { revalidatePath } from "next/cache";
import { desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { randomUUID } from "crypto";

export async function createUniverseAction(
  input: z.infer<typeof createUniverseInputSchema>
) {
  try {
    // 1. Authenticate & Get User
    const userProfile = await ensureUserProfile();
    if (!userProfile) {
      throw new Error("Unauthorized");
    }

    // 2. Validate Input
    const { ontology, additionalPrompts, isPublic } = createUniverseInputSchema.parse(input);

    // 3. Generate Universe Content (AI)
    const generatedData = await generateUniverse(ontology, additionalPrompts);

    // 4. Generate Universe Cover Image (AI)
    const imageBuffer = await generateUniverseImage(
      generatedData.visualDescription
    );

    // 5. Upload Image to R2
    // Structure: {userId}/{entityType}/{entityId}/{filename}
    const universeId = randomUUID();
    const imageKey = `${userProfile.id}/universes/${universeId}/cover.webp`;
    
    const { key } = await uploadImage(imageBuffer, imageKey, "image/webp");

    // 6. Save to Database
    // We store the KEY in the database, not the full URL, to allow for domain changes
    // and proper access control resolution later.
    const [newUniverse] = await db
      .insert(universes)
      .values({
        id: universeId,
        userId: userProfile.id,
        name: generatedData.name,
        description: generatedData.description,
        history: generatedData.history,
        ontology: ontology,
        factions: generatedData.factions,
        locations: generatedData.locations,
        coverImage: key, // Store key!
        isPublic: isPublic,
      })
      .returning();

    revalidatePath("/universe");
    return { success: true, universe: newUniverse };
  } catch (error) {
    console.error("Create universe action failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Helper to resolve image URLs for a list of universes
 */
async function mapUniversesWithImages(universesList: any[]) {
  return Promise.all(
    universesList.map(async (u) => {
      if (u.coverImage && !u.coverImage.startsWith("http")) {
        // It's a key, resolve it
        return { ...u, coverImage: await getPublicUrl(u.coverImage) };
      }
      return u;
    })
  );
}

export async function getPublicUniversesAction(filters?: {
  sort?: "recent" | "popular";
}) {
  try {
    let query = db
      .select()
      .from(universes)
      .where(eq(universes.isPublic, true));

    // Apply sorting
    if (filters?.sort === "popular") {
      query = query.orderBy(desc(universes.likesCount));
    } else {
      // Default to recent
      query = query.orderBy(desc(universes.createdAt));
    }

    const results = await query.limit(20); // Pagination can be added later

    const universesWithUrls = await mapUniversesWithImages(results);
    return { success: true, universes: universesWithUrls };
  } catch (error) {
    console.error("Failed to fetch public universes:", error);
    return { success: false, error: "Failed to load universes" };
  }
}

export async function getUserUniversesAction() {
  try {
    const userProfile = await ensureUserProfile();
    if (!userProfile) return { success: false, error: "Unauthorized" };

    const results = await db
      .select()
      .from(universes)
      .where(eq(universes.userId, userProfile.id))
      .orderBy(desc(universes.createdAt));

    const universesWithUrls = await mapUniversesWithImages(results);
    return { success: true, universes: universesWithUrls };
  } catch (error) {
    console.error("Failed to fetch user universes:", error);
    return { success: false, error: "Failed to load universes" };
  }
}

export async function getStarterUniversesAction() {
  try {
    const results = await db
      .select()
      .from(universes)
      .where(eq(universes.isPremade, true))
      .orderBy(desc(universes.createdAt));

    const universesWithUrls = await mapUniversesWithImages(results);
    return { success: true, universes: universesWithUrls };
  } catch (error) {
    console.error("Failed to fetch starter universes:", error);
    return { success: false, error: "Failed to load starter universes" };
  }
}

export async function getUniverseAction(id: string) {
  try {
    // 1. Fetch universe
    const [universe] = await db
      .select()
      .from(universes)
      .where(eq(universes.id, id));

    if (!universe) {
      return { success: false, error: "Universe not found" };
    }

    // 2. Check authorization
    if (!universe.isPublic) {
      try {
        const userProfile = await ensureUserProfile();
        // If logged in, check ownership
        // Note: userId might be null for system templates, but those should be public or isPremade
        if (universe.userId !== userProfile.id) {
          return { success: false, error: "Unauthorized" };
        }
      } catch (e) {
        // ensureUserProfile throws if not authenticated
        return { success: false, error: "Unauthorized" };
      }
    }

    // 3. Resolve image URL
    if (universe.coverImage && !universe.coverImage.startsWith("http")) {
      universe.coverImage = await getPublicUrl(universe.coverImage);
    }

    return { success: true, universe };
  } catch (error) {
    console.error("Failed to get universe:", error);
    return { success: false, error: "Failed to load universe" };
  }
}

// Simple like toggle (increment only for now as we don't have a join table for user_likes yet)
// In a real app, we'd check if the user already liked it to prevent spam, but adhering to the current schema.
export async function likeUniverseAction(universeId: string) {
  try {
    const userProfile = await ensureUserProfile();
    if (!userProfile) return { success: false, error: "Unauthorized" };

    // Increment likes count
    const [updatedUniverse] = await db
      .update(universes)
      .set({
        likesCount: sql`${universes.likesCount} + 1`,
      })
      .where(eq(universes.id, universeId))
      .returning();

    revalidatePath("/universe");
    return { success: true, likesCount: updatedUniverse.likesCount };
  } catch (error) {
    console.error("Failed to like universe:", error);
    return { success: false, error: "Failed to like universe" };
  }
}
