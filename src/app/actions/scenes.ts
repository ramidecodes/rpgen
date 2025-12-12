"use server";

import { db } from "@/lib/db";
import {
  scenes,
  runs,
  campaigns,
  characters,
  universes,
} from "@/lib/db/schema";
import { getUserProfileByClerkId } from "@/lib/db/queries/user-profile";
import { auth } from "@clerk/nextjs/server";
import { eq, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getPublicUrl } from "@/lib/storage/r2";
import type { Scene } from "@/lib/db/schema";

/**
 * Get the current scene for a specific run
 */
export async function getCurrentSceneAction(runId: string): Promise<{
  scene: Scene | null;
  error?: string;
}> {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return { scene: null, error: "Unauthorized" };
    }

    const userProfile = await getUserProfileByClerkId(clerkUserId);
    if (!userProfile) {
      return { scene: null, error: "User profile not found" };
    }

    // Get run and verify ownership
    const [runData] = await db
      .select({
        run: runs,
        scene: {
          id: scenes.id,
          runId: scenes.runId,
          sceneType: scenes.sceneType,
          imageUrl: scenes.imageUrl,
          generationPrompt: scenes.generationPrompt,
          narrativeContext: scenes.narrativeContext,
          previousSceneId: scenes.previousSceneId,
          createdAt: scenes.createdAt,
        },
      })
      .from(runs)
      .leftJoin(scenes, eq(runs.currentSceneId, scenes.id))
      .where(eq(runs.id, runId))
      .limit(1);

    if (!runData) {
      return { scene: null, error: "Run not found" };
    }

    if (runData.run.userId !== userProfile.id) {
      return { scene: null, error: "Unauthorized" };
    }

    // Convert R2 key to URL if needed (for backward compatibility with Replicate URLs)
    let scene = runData.scene;
    if (scene?.imageUrl && !scene.imageUrl.startsWith("http")) {
      scene = {
        ...scene,
        imageUrl: await getPublicUrl(scene.imageUrl),
      };
    }

    return { scene };
  } catch (error) {
    console.error("Error fetching current scene:", error);
    return {
      scene: null,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get all scenes for a specific run (for history/gallery)
 */
export async function getRunScenesAction(runId: string): Promise<{
  scenes: Scene[];
  error?: string;
}> {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return { scenes: [], error: "Unauthorized" };
    }

    const userProfile = await getUserProfileByClerkId(clerkUserId);
    if (!userProfile) {
      return { scenes: [], error: "User profile not found" };
    }

    // Verify run ownership
    const [runData] = await db
      .select()
      .from(runs)
      .where(eq(runs.id, runId))
      .limit(1);

    if (!runData) {
      return { scenes: [], error: "Run not found" };
    }

    if (runData.userId !== userProfile.id) {
      return { scenes: [], error: "Unauthorized" };
    }

    // Get all scenes for the run, ordered by creation date (newest first)
    const runScenes = await db
      .select({
        id: scenes.id,
        runId: scenes.runId,
        sceneType: scenes.sceneType,
        imageUrl: scenes.imageUrl,
        generationPrompt: scenes.generationPrompt,
        narrativeContext: scenes.narrativeContext,
        previousSceneId: scenes.previousSceneId,
        createdAt: scenes.createdAt,
      })
      .from(scenes)
      .where(eq(scenes.runId, runId))
      .orderBy(desc(scenes.createdAt));

    // Convert R2 keys to URLs for all scenes (for backward compatibility with Replicate URLs)
    const scenesWithUrls = await Promise.all(
      runScenes.map(async (scene) => {
        if (scene.imageUrl && !scene.imageUrl.startsWith("http")) {
          return {
            ...scene,
            imageUrl: await getPublicUrl(scene.imageUrl),
          };
        }
        return scene;
      })
    );

    return { scenes: scenesWithUrls };
  } catch (error) {
    console.error("Error fetching run scenes:", error);
    return {
      scenes: [],
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Manually trigger scene generation for a run (for testing/debugging)
 * This bypasses the automatic agent and directly triggers generation
 */
export async function triggerSceneGenerationAction(
  runId: string,
  narrativeContext?: string
): Promise<{
  success: boolean;
  sceneId?: string;
  error?: string;
}> {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return { success: false, error: "Unauthorized" };
    }

    const userProfile = await getUserProfileByClerkId(clerkUserId);
    if (!userProfile) {
      return { success: false, error: "User profile not found" };
    }

    // Get run with campaign, character, and universe details
    const [runData] = await db
      .select({
        run: runs,
        campaign: campaigns,
        character: characters,
        universe: universes,
      })
      .from(runs)
      .innerJoin(campaigns, eq(runs.campaignId, campaigns.id))
      .innerJoin(characters, eq(runs.characterId, characters.id))
      .innerJoin(universes, eq(campaigns.universeId, universes.id))
      .where(eq(runs.id, runId))
      .limit(1);

    if (!runData) {
      return { success: false, error: "Run not found" };
    }

    if (runData.run.userId !== userProfile.id) {
      return { success: false, error: "Unauthorized" };
    }

    // Import the visual engine agent and trigger generation
    const { createVisualEngineAgent } = await import("@/agents/visual-engine");

    // Create a minimal agent with the provided context
    const _agent = createVisualEngineAgent({
      runId,
      campaign: runData.campaign,
      character: runData.character,
      universe: runData.universe,
      campaignState: runData.run.state,
      currentScene: null,
      recentMessages: [],
      characterAction: narrativeContext || "Manual scene generation requested",
    });

    // For manual triggering, we'll directly call the image generation logic
    // This is a simplified version - in production you'd want more sophisticated logic
    const { generateImage, createScenePrompt } = await import(
      "@/lib/ai/scene-generator"
    );
    const { uploadImage } = await import("@/lib/storage/r2");
    const { randomUUID } = await import("node:crypto");

    const prompt =
      narrativeContext || "Generate a scene for this fantasy RPG campaign";
    const enhancedPrompt = createScenePrompt(prompt);

    try {
      // Generate scene ID first for use in R2 path
      const sceneId = randomUUID();
      const userId = runData.run.userId;

      // Generate the image from Replicate
      const replicateImageUrl = await generateImage(enhancedPrompt);

      // Ensure we have a valid URL string
      if (typeof replicateImageUrl !== "string" || !replicateImageUrl) {
        throw new Error(
          `Invalid image URL from Replicate: ${typeof replicateImageUrl}`
        );
      }

      // Download image from Replicate URL
      const imageResponse = await fetch(replicateImageUrl);
      if (!imageResponse.ok) {
        throw new Error(
          `Failed to download image from Replicate: ${imageResponse.status} ${imageResponse.statusText}`
        );
      }

      const arrayBuffer = await imageResponse.arrayBuffer();
      const imageBuffer = Buffer.from(arrayBuffer);

      // Construct R2 storage key: <user-id>/runs/<run-id>/scenes/<scene-id>.webp
      const r2Key = `${userId}/runs/${runId}/scenes/${sceneId}.webp`;

      // Upload image to R2
      const { key: storedKey } = await uploadImage(
        imageBuffer,
        r2Key,
        "image/webp"
      );

      // Create scene record in database with R2 key (not URL)
      const newSceneResult = await db
        .insert(scenes)
        .values({
          id: sceneId, // Use the pre-generated ID
          runId,
          sceneType: "environment",
          imageUrl: storedKey, // Store R2 key, not URL
          generationPrompt: enhancedPrompt,
          narrativeContext: narrativeContext || "Manual scene generation",
          previousSceneId: runData.run.currentSceneId || null,
        })
        .returning();

      const newScene = Array.isArray(newSceneResult)
        ? newSceneResult[0]
        : newSceneResult;
      if (!newScene) {
        throw new Error("Failed to create scene record");
      }

      // Update run's current scene
      await db
        .update(runs)
        .set({ currentSceneId: newScene.id })
        .where(eq(runs.id, runId));

      revalidatePath(`/runs/${runId}/play`);
      return { success: true, sceneId: newScene.id };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Scene generation failed",
      };
    }
  } catch (error) {
    console.error("Error triggering scene generation:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
