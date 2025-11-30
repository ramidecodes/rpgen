"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { campaigns, universes } from "@/lib/db/schema";
import {
  createCampaignSchema,
  type CreateCampaignInput,
} from "@/lib/db/schemas/campaign";
import { generateCampaignCover } from "@/lib/ai/image-generator";
import { uploadImage } from "@/lib/storage/r2";
import { getUserProfileByClerkId } from "@/lib/db/queries/user-profile";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { randomUUID } from "node:crypto";

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

  redirect(`/campaign/${newCampaign.id}`);
}

// Deprecated: Use createRun instead
export async function startCampaign(campaignId: string, characterId: string) {
  // Redirect to createRun for backward compatibility
  const { createRun } = await import("./run");
  return createRun({ campaignId, characterId });
}
