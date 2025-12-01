"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { campaigns, universes } from "@/lib/db/schema";
import {
  createCampaignSchema,
  type CreateCampaignInput,
} from "@/lib/db/schemas/campaign";
import { generateCampaignCover } from "@/lib/ai/image-generator";
import { uploadImage, deleteFile, deleteFolder } from "@/lib/storage/r2";
import { getUserProfileByClerkId } from "@/lib/db/queries/user-profile";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { randomUUID } from "node:crypto";
import { runs } from "@/lib/db/schema";

export async function createCampaign(data: CreateCampaignInput) {
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
  const validatedData = createCampaignSchema.parse(data);

  if (!validatedData.universeId) {
    throw new Error("Universe ID is required");
  }

  // Fetch Universe
  const [universe] = await db
    .select()
    .from(universes)
    .where(eq(universes.id, validatedData.universeId))
    .limit(1);

  if (!universe) {
    throw new Error("Universe not found");
  }

  // Generate Cover Image
  const imagePrompt = `${validatedData.name} - ${validatedData.genres.join(
    ", "
  )} RPG Campaign. ${universe.name} setting. ${universe.ontology.timeframe}, ${
    universe.ontology.magicLevel
  }. Cinematic composition.`;

  const imageBuffer = await generateCampaignCover(imagePrompt);

  // Generate campaign ID first to use in storage path
  const campaignId = randomUUID();

  // Upload Cover Image
  // Structure: {userId}/campaigns/{campaignId}/cover.webp
  const imageKey = `${userProfile.id}/campaigns/${campaignId}/cover.webp`;
  const { key } = await uploadImage(imageBuffer, imageKey, "image/webp");

  // Save to DB (no state generation - campaigns are templates)
  // We store the KEY in the database, not the full URL, to allow for domain changes
  // and proper access control resolution later.
  const [newCampaign] = await db
    .insert(campaigns)
    .values({
      id: campaignId,
      userId: userProfile.id,
      universeId: universe.id,
      name: validatedData.name,
      description:
        validatedData.description ??
        `A ${validatedData.genres.join("/")} journey in ${universe.name}.`,
      coverImage: key, // Store key!
      genres: validatedData.genres,
      isPublic: validatedData.isPublic,
    })
    .returning();

  redirect(`/campaigns/${newCampaign.id}`);
}

export async function deleteCampaign(campaignId: string) {
  const { userId: clerkUserId } = await auth();

  if (!clerkUserId) {
    return { success: false, error: "Unauthorized" };
  }

  // Get internal user profile
  const userProfile = await getUserProfileByClerkId(clerkUserId);
  if (!userProfile) {
    return { success: false, error: "User profile not found" };
  }

  // Verify campaign exists and user owns it
  const [campaign] = await db
    .select()
    .from(campaigns)
    .where(eq(campaigns.id, campaignId))
    .limit(1);

  if (!campaign) {
    return { success: false, error: "Campaign not found" };
  }

  if (campaign.userId !== userProfile.id) {
    return { success: false, error: "Unauthorized" };
  }

  // Cascade delete all associated runs first (messages cascade automatically)
  await db.delete(runs).where(eq(runs.campaignId, campaignId));

  // Delete campaign cover image from R2 if it exists
  if (campaign.coverImage) {
    await deleteFile(campaign.coverImage);
  }

  // Delete entire campaign folder from R2
  const campaignFolderPrefix = `${userProfile.id}/campaigns/${campaignId}`;
  await deleteFolder(campaignFolderPrefix);

  // Delete campaign from database
  await db.delete(campaigns).where(eq(campaigns.id, campaignId));

  return { success: true };
}
