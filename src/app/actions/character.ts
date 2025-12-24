"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { characters, universes, runs } from "@/lib/db/schema";
import { createCharacterSchema } from "@/lib/db/schemas/character";
import { generateCharacterBackstory } from "@/lib/ai/character-generator";
import { ensureUserProfile } from "@/lib/db/utils/user-profile";
import { getUserProfileByClerkId } from "@/lib/db/queries/user-profile";
import { revalidatePath } from "next/cache";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { getPublicUrl, uploadImage, deleteFolder } from "@/lib/storage/r2";
import { generateCharacterPortrait } from "@/lib/ai/image-generator";

export async function createCharacterAction(
  input: z.infer<typeof createCharacterSchema>
) {
  try {
    // 1. Authenticate & Get User
    const userProfile = await ensureUserProfile();
    if (!userProfile) {
      throw new Error("Unauthorized");
    }

    // 2. Validate Input
    const {
      universeId,
      name,
      profession,
      stats,
      backstoryPrompt,
      factionName,
    } = createCharacterSchema.parse(input);

    // 3. Fetch Universe Context
    const [universe] = await db
      .select()
      .from(universes)
      .where(eq(universes.id, universeId));

    if (!universe) {
      throw new Error("Universe not found");
    }

    // 4. Generate Backstory (AI)
    // We generate this server-side to ensure consistency and integrity
    const generatedData = await generateCharacterBackstory(
      universe,
      name,
      profession,
      stats,
      backstoryPrompt
    );

    // 5. Generate Character Portrait (AI)
    let imageKey: string | undefined;
    if (generatedData.appearance) {
      try {
        const imageBuffer = await generateCharacterPortrait(
          generatedData.appearance
        );
        const characterId = randomUUID(); // We need ID for key, though character is not inserted yet
        // Key structure: {userId}/characters/{characterId}/portrait.webp
        // But we don't have characterId yet... wait we can generate it first.

        // Let's regenerate UUID for the character so we can use it in the key
        // Actually, we can just generate a random one for the character insertion too
        const newCharacterId = characterId; // Using the one we generated above

        const key = `${userProfile.id}/characters/${newCharacterId}/portrait.webp`;
        const uploadResult = await uploadImage(imageBuffer, key, "image/webp");
        imageKey = uploadResult.key;
      } catch (error) {
        console.error("Failed to generate character portrait:", error);
        // Don't fail the whole character creation if image fails
      }
    }

    // 6. Save to Database
    // Better to use the SAME ID if we uploaded image with it.
    // Wait, in step 5 I generated characterId but didn't use it for DB yet.
    // Let's fix step 5 logic.

    const characterIdToUse = randomUUID();

    // Re-do image generation logic with correct ID
    if (generatedData.appearance) {
      try {
        const imageBuffer = await generateCharacterPortrait(
          generatedData.appearance
        );
        const key = `${userProfile.id}/characters/${characterIdToUse}/portrait.webp`;
        const uploadResult = await uploadImage(imageBuffer, key, "image/webp");
        imageKey = uploadResult.key;
      } catch (e) {
        console.error("Image gen failed", e);
      }
    }

    const [newCharacter] = await db
      .insert(characters)
      .values({
        id: characterIdToUse,
        userId: userProfile.id,
        universeId: universe.id,
        name: name,
        stats: stats,
        properties: {
          profession: profession,
          backstory: generatedData.backstory,
          personalityTraits: generatedData.personalityTraits,
          appearance: generatedData.appearance,
          origin: "Unknown", // Could be added to schema if needed
          factionName: factionName,
          imageUrl: imageKey,
        },
      })
      .returning();

    // Resolve character image URL if needed
    if (
      newCharacter.properties?.imageUrl &&
      !newCharacter.properties.imageUrl.startsWith("http")
    ) {
      newCharacter.properties.imageUrl = await getPublicUrl(
        newCharacter.properties.imageUrl
      );
    }

    revalidatePath(`/universes/${universeId}`);
    revalidatePath("/profile");
    return { success: true, character: newCharacter };
  } catch (error) {
    console.error("Create character action failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function updateCharacterAction(
  characterId: string,
  data: {
    name: string;
    profession: string;
    factionName?: string;
    appearance?: string;
    backstory?: string;
    personalityTraits?: string[];
  }
) {
  try {
    const userProfile = await ensureUserProfile();
    if (!userProfile) throw new Error("Unauthorized");

    // Verify ownership
    const [existing] = await db
      .select()
      .from(characters)
      .where(eq(characters.id, characterId));

    if (!existing || existing.userId !== userProfile.id) {
      throw new Error("Unauthorized or character not found");
    }

    // Update
    const [updated] = await db
      .update(characters)
      .set({
        name: data.name,
        properties: {
          ...existing.properties,
          profession: data.profession,
          factionName: data.factionName,
          appearance: data.appearance,
          backstory: data.backstory,
          personalityTraits: data.personalityTraits,
        },
        updatedAt: new Date(),
      })
      .where(eq(characters.id, characterId))
      .returning();

    // Resolve character image URL if needed
    if (
      updated.properties?.imageUrl &&
      !updated.properties.imageUrl.startsWith("http")
    ) {
      updated.properties.imageUrl = await getPublicUrl(
        updated.properties.imageUrl
      );
    }

    revalidatePath(`/characters/${characterId}`);
    revalidatePath("/profile");
    return { success: true, character: updated };
  } catch (error) {
    console.error("Update character failed:", error);
    return { success: false, error: "Failed to update character" };
  }
}

export async function regenerateCharacterPortraitAction(characterId: string) {
  try {
    const userProfile = await ensureUserProfile();
    if (!userProfile) throw new Error("Unauthorized");

    const [character] = await db
      .select()
      .from(characters)
      .where(eq(characters.id, characterId));

    if (!character || character.userId !== userProfile.id) {
      throw new Error("Unauthorized");
    }

    if (!character.properties) {
      throw new Error("Character properties not found");
    }

    const appearance = character.properties.appearance;
    if (!appearance) {
      throw new Error(
        "No appearance description available to generate portrait"
      );
    }

    // Generate new image
    const imageBuffer = await generateCharacterPortrait(appearance);

    // Upload to R2 (overwrite or new key? R2 overwrite is fine if key is same, but let's use timestamp to bust cache if needed)
    // Actually R2 keys are usually immutable in CDN caches, better to maybe append a timestamp or random string
    // Or just keep simple key and rely on client side cache busting
    const key = `${
      userProfile.id
    }/characters/${characterId}/portrait-${Date.now()}.webp`;
    const uploadResult = await uploadImage(imageBuffer, key, "image/webp");

    // Update DB
    await db
      .update(characters)
      .set({
        properties: {
          ...character.properties,
          imageUrl: uploadResult.key,
        },
        updatedAt: new Date(),
      })
      .where(eq(characters.id, characterId));

    revalidatePath(`/characters/${characterId}`);
    return { success: true, imageUrl: await getPublicUrl(uploadResult.key) };
  } catch (error) {
    console.error("Regenerate portrait failed:", error);
    return { success: false, error: "Failed to regenerate portrait" };
  }
}

export async function getUserCharactersAction() {
  try {
    const userProfile = await ensureUserProfile();
    if (!userProfile) return { success: false, error: "Unauthorized" };

    // Join with universe to get universe name
    const results = await db
      .select({
        character: characters,
        universeName: universes.name,
        universeImage: universes.coverImage,
      })
      .from(characters)
      .innerJoin(universes, eq(characters.universeId, universes.id))
      .where(eq(characters.userId, userProfile.id))
      .orderBy(desc(characters.createdAt));

    // Map results to resolve image URLs
    const mappedResults = await Promise.all(
      results.map(async (item) => {
        const char = item.character;
        if (
          char.properties?.imageUrl &&
          !char.properties.imageUrl.startsWith("http")
        ) {
          char.properties.imageUrl = await getPublicUrl(
            char.properties.imageUrl
          );
        }
        return item;
      })
    );

    return { success: true, characters: mappedResults };
  } catch (error) {
    console.error("Failed to fetch user characters:", error);
    return { success: false, error: "Failed to load characters" };
  }
}

export async function getCharacterAction(id: string) {
  try {
    const userProfile = await ensureUserProfile();
    if (!userProfile) return { success: false, error: "Unauthorized" };

    // Join to get universe details as well
    const [result] = await db
      .select({
        character: characters,
        universe: universes,
      })
      .from(characters)
      .innerJoin(universes, eq(characters.universeId, universes.id))
      .where(eq(characters.id, id));

    if (!result) {
      return { success: false, error: "Character not found" };
    }

    if (result.character.userId !== userProfile.id) {
      return { success: false, error: "Unauthorized" };
    }

    // Resolve universe image if needed
    if (
      result.universe.coverImage &&
      !result.universe.coverImage.startsWith("http")
    ) {
      result.universe.coverImage = await getPublicUrl(
        result.universe.coverImage
      );
    }

    // Resolve character image
    if (
      result.character.properties?.imageUrl &&
      !result.character.properties.imageUrl.startsWith("http")
    ) {
      result.character.properties.imageUrl = await getPublicUrl(
        result.character.properties.imageUrl
      );
    }

    return {
      success: true,
      character: result.character,
      universe: result.universe,
    };
  } catch (error) {
    console.error("Failed to fetch character:", error);
    return { success: false, error: "Failed to load character" };
  }
}

export async function deleteCharacter(characterId: string) {
  const { userId: clerkUserId } = await auth();

  if (!clerkUserId) {
    return { success: false, error: "Unauthorized" };
  }

  // Get internal user profile
  const userProfile = await getUserProfileByClerkId(clerkUserId);
  if (!userProfile) {
    return { success: false, error: "User profile not found" };
  }

  // Verify character exists and user owns it
  const [character] = await db
    .select()
    .from(characters)
    .where(eq(characters.id, characterId))
    .limit(1);

  if (!character) {
    return { success: false, error: "Character not found" };
  }

  if (character.userId !== userProfile.id) {
    return { success: false, error: "Unauthorized" };
  }

  // Cascade delete all associated runs first (runs will cascade delete messages, scenes, quests, etc.)
  await db.delete(runs).where(eq(runs.characterId, characterId));

  // Delete entire character folder from R2 if it exists
  const characterFolderPrefix = `${userProfile.id}/characters/${characterId}/`;
  try {
    await deleteFolder(characterFolderPrefix);
  } catch (error) {
    // Log error but don't fail deletion
    console.error("Error deleting character folder from R2:", error);
  }

  // Delete character from database
  await db.delete(characters).where(eq(characters.id, characterId));

  revalidatePath("/characters");
  revalidatePath("/profile");

  return { success: true };
}
