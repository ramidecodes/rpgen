"use server";

import { auth } from "@clerk/nextjs/server";
import { getUserProfileByClerkId } from "@/lib/db/queries/user-profile";
import { getQuestsByRunId } from "@/lib/db/queries/quests";
import { db } from "@/lib/db";
import { runs } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

/**
 * Get all quests for a run (server action for client access)
 */
export async function getQuestsAction(runId: string) {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return { success: false, error: "Unauthorized" };
    }

    const userProfile = await getUserProfileByClerkId(clerkUserId);
    if (!userProfile) {
      return { success: false, error: "User profile not found" };
    }

    // Verify run exists and user owns it
    const [run] = await db
      .select({ userId: runs.userId })
      .from(runs)
      .where(eq(runs.id, runId))
      .limit(1);

    if (!run) {
      return { success: false, error: "Run not found" };
    }

    if (run.userId !== userProfile.id) {
      return { success: false, error: "Unauthorized" };
    }

    const quests = await getQuestsByRunId(runId);

    return {
      success: true,
      quests: quests.map((q) => ({
        id: q.id,
        title: q.title,
        status: q.status,
        description: q.description,
        clues: q.clues,
        logs: q.logs,
        createdAt: q.createdAt,
        updatedAt: q.updatedAt,
      })),
    };
  } catch (error) {
    console.error("[getQuestsAction] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
