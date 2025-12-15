"use server";

import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { runs, campaigns, characters, universes } from "@/lib/db/schema";
import { createRunSchema, type CreateRunInput } from "@/lib/db/schemas/run";
import { generateCampaignState } from "@/lib/ai/campaign-generator";
import { getUserProfileByClerkId } from "@/lib/db/queries/user-profile";
import { eq } from "drizzle-orm";
import { deleteFolder } from "@/lib/storage/r2";

export async function createRun(data: CreateRunInput) {
  const { userId: clerkUserId } = await auth();

  if (!clerkUserId) {
    throw new Error("Unauthorized");
  }

  // Get internal user profile
  const userProfile = await getUserProfileByClerkId(clerkUserId);
  if (!userProfile) {
    throw new Error("User profile not found");
  }

  // Validate input
  const validatedData = createRunSchema.parse(data);

  // Fetch Campaign and Universe
  const [campaignData] = await db
    .select({
      campaign: campaigns,
      universe: universes,
    })
    .from(campaigns)
    .innerJoin(universes, eq(campaigns.universeId, universes.id))
    .where(eq(campaigns.id, validatedData.campaignId))
    .limit(1);

  if (!campaignData) {
    throw new Error("Campaign not found");
  }

  const { campaign, universe } = campaignData;

  // Verify campaign ownership or public access
  if (campaign.userId !== userProfile.id && !campaign.isPublic) {
    throw new Error("Campaign not found or unauthorized");
  }

  // Fetch Character
  const [character] = await db
    .select()
    .from(characters)
    .where(eq(characters.id, validatedData.characterId))
    .limit(1);

  if (!character) {
    throw new Error("Character not found");
  }

  // Verify character ownership
  if (character.userId !== userProfile.id) {
    throw new Error("Character not found or unauthorized");
  }

  // Verify character belongs to the same universe as the campaign
  if (character.universeId !== campaign.universeId) {
    throw new Error(
      "Character must belong to the same universe as the campaign"
    );
  }

  // Generate initial state tailored to the character
  const initialState = await generateCampaignState(
    universe,
    campaign.genres,
    character
  );

  // Create Run
  const [newRun] = await db
    .insert(runs)
    .values({
      userId: userProfile.id,
      campaignId: campaign.id,
      characterId: character.id,
      state: initialState,
      status: "active",
    })
    .returning();

  redirect(`/runs/${newRun.id}`);
}

export async function deleteRun(runId: string) {
  const { userId: clerkUserId } = await auth();

  if (!clerkUserId) {
    return { success: false, error: "Unauthorized" };
  }

  // Get internal user profile
  const userProfile = await getUserProfileByClerkId(clerkUserId);
  if (!userProfile) {
    return { success: false, error: "User profile not found" };
  }

  // Verify run exists and user owns it
  const [run] = await db.select().from(runs).where(eq(runs.id, runId)).limit(1);

  if (!run) {
    return { success: false, error: "Run not found" };
  }

  if (run.userId !== userProfile.id) {
    return { success: false, error: "Unauthorized" };
  }

  // Delete entire run folder from R2 if it exists
  const runFolderPrefix = `${userProfile.id}/runs/${runId}/`;
  try {
    await deleteFolder(runFolderPrefix);
  } catch (error) {
    // Log error but don't fail deletion
    console.error("Error deleting run folder from R2:", error);
  }

  // Delete run from database (messages and scenes cascade automatically via schema)
  await db.delete(runs).where(eq(runs.id, runId));

  return { success: true };
}
