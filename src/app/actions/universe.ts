"use server";

import { db } from "@/lib/db";
import { characters, universes } from "@/lib/db/schema";
import { createUniverseInputSchema } from "@/lib/db/schemas/universe";
import { generateUniverse } from "@/lib/ai/universe-generator";
import { generateUniverseImage } from "@/lib/ai/image-generator";
import { uploadImage, getPublicUrl } from "@/lib/storage/r2";
import { ensureUserProfile } from "@/lib/db/utils/user-profile";
import { revalidatePath } from "next/cache";
import { desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { randomUUID } from "node:crypto";

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
    const { ontology, additionalPrompts, isPublic } =
      createUniverseInputSchema.parse(input);

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
    let query = db.select().from(universes).where(eq(universes.isPublic, true));

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
    let isOwner = false;
    try {
      const userProfile = await ensureUserProfile();
      if (userProfile && universe.userId === userProfile.id) {
        isOwner = true;
      }
    } catch (e) {
      // Ignore auth error for public check
    }

    if (!universe.isPublic && !isOwner) {
      // If not public and not owner, it's unauthorized
      // But we already tried getting userProfile above.
      // If getUniverseAction is called server-side, we might have context.
      // Let's just return what we have if public, or error.
      return { success: false, error: "Unauthorized" };
    }

    // 3. Resolve image URL
    if (universe.coverImage && !universe.coverImage.startsWith("http")) {
      universe.coverImage = await getPublicUrl(universe.coverImage);
    }

    // 4. Fetch Associated Characters (Public info only)
    // We only show characters that belong to this universe.
    // If the user is the owner of the universe, maybe show all?
    // Or just show public characters? For now, let's show all characters created in this universe
    // But we might want to filter by privacy later. Assuming characters in public universes are visible or at least listed.

    const universeCharacters = await db
      .select({
        id: characters.id,
        name: characters.name,
        profession: characters.properties, // We need profession from JSON
        imageUrl: characters.properties, // We need imageUrl from JSON
        userId: characters.userId,
      })
      .from(characters)
      .where(eq(characters.universeId, id))
      .orderBy(desc(characters.createdAt))
      .limit(10); // Limit to 10 for now

    // Process characters to extract fields safely and resolve images
    const processedCharacters = await Promise.all(
      universeCharacters.map(async (char) => {
        // @ts-expect-error - Drizzle JSON typing is tricky here without explicit mapping, accessing properties directly
        const props = char.profession as any;
        let imageUrl = props?.imageUrl;

        if (imageUrl && !imageUrl.startsWith("http")) {
          imageUrl = await getPublicUrl(imageUrl);
        }

        return {
          id: char.id,
          name: char.name,
          profession: props?.profession || "Unknown",
          imageUrl: imageUrl,
          userId: char.userId,
        };
      })
    );

    return { success: true, universe, characters: processedCharacters };
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
