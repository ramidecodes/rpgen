"use server";

import { db } from "@/lib/db";
import { campaigns, universes, runs } from "@/lib/db/schema";
import { getUserProfileByClerkId } from "@/lib/db/queries/user-profile";
import { auth } from "@clerk/nextjs/server";
import { desc, eq, sql } from "drizzle-orm";
import { getPublicUrl } from "@/lib/storage/r2";

export async function getUserCampaignsAction() {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) return { success: false, error: "Unauthorized" };

    const userProfile = await getUserProfileByClerkId(clerkUserId);
    if (!userProfile)
      return { success: false, error: "User profile not found" };

    // Get campaigns with universe info and count of active runs
    const userCampaigns = await db
      .select({
        id: campaigns.id,
        name: campaigns.name,
        description: campaigns.description,
        coverImage: campaigns.coverImage,
        genres: campaigns.genres,
        universeName: universes.name,
        updatedAt: campaigns.updatedAt,
        activeRunsCount: sql<number>`(
          SELECT COUNT(*)::int
          FROM ${runs}
          WHERE ${runs.campaignId} = ${campaigns.id}
          AND ${runs.userId} = ${userProfile.id}
          AND ${runs.status} = 'active'
        )`,
      })
      .from(campaigns)
      .innerJoin(universes, eq(campaigns.universeId, universes.id))
      .where(eq(campaigns.userId, userProfile.id))
      .orderBy(desc(campaigns.updatedAt));

    // Resolve image URLs if needed
    const mappedCampaigns = await Promise.all(
      userCampaigns.map(async (campaign) => {
        if (campaign.coverImage && !campaign.coverImage.startsWith("http")) {
          campaign.coverImage = await getPublicUrl(campaign.coverImage);
        }
        return campaign;
      })
    );

    return { success: true, campaigns: mappedCampaigns };
  } catch (error) {
    console.error("Failed to fetch campaigns:", error);
    return { success: false, error: "Failed to load campaigns" };
  }
}
