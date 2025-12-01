"use server";

import { db } from "@/lib/db";
import { runs, campaigns, characters, universes } from "@/lib/db/schema";
import { getUserProfileByClerkId } from "@/lib/db/queries/user-profile";
import { auth } from "@clerk/nextjs/server";
import { desc, eq } from "drizzle-orm";
import { getPublicUrl } from "@/lib/storage/r2";

export async function getUserRunsAction() {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) return { success: false, error: "Unauthorized" };

    const userProfile = await getUserProfileByClerkId(clerkUserId);
    if (!userProfile)
      return { success: false, error: "User profile not found" };

    // Get runs with campaign, character, and universe info
    const userRuns = await db
      .select({
        id: runs.id,
        status: runs.status,
        createdAt: runs.createdAt,
        updatedAt: runs.updatedAt,
        campaignName: campaigns.name,
        campaignDescription: campaigns.description,
        campaignCoverImage: campaigns.coverImage,
        campaignGenres: campaigns.genres,
        characterName: characters.name,
        characterProfession: characters.properties,
        universeName: universes.name,
      })
      .from(runs)
      .innerJoin(campaigns, eq(runs.campaignId, campaigns.id))
      .innerJoin(characters, eq(runs.characterId, characters.id))
      .innerJoin(universes, eq(campaigns.universeId, universes.id))
      .where(eq(runs.userId, userProfile.id))
      .orderBy(desc(runs.updatedAt));

    // Resolve image URLs if needed
    const mappedRuns = await Promise.all(
      userRuns.map(async (run) => {
        let coverImageUrl = run.campaignCoverImage;
        if (coverImageUrl && !coverImageUrl.startsWith("http")) {
          coverImageUrl = await getPublicUrl(coverImageUrl);
        }
        return {
          ...run,
          campaignCoverImage: coverImageUrl,
          characterProfession: run.characterProfession?.profession || "Unknown",
        };
      })
    );

    return { success: true, runs: mappedRuns };
  } catch (error) {
    console.error("Failed to fetch runs:", error);
    return { success: false, error: "Failed to load runs" };
  }
}
