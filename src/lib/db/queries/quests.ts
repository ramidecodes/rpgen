import { db } from "@/lib/db";
import { quests } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import type { Quest, NewQuest } from "@/lib/db/schema";

/**
 * Get all quests for a run
 */
export async function getQuestsByRunId(runId: string): Promise<Quest[]> {
  return await db
    .select()
    .from(quests)
    .where(eq(quests.runId, runId))
    .orderBy(desc(quests.createdAt));
}

/**
 * Get only active quests for a run
 */
export async function getActiveQuestsByRunId(runId: string): Promise<Quest[]> {
  return await db
    .select()
    .from(quests)
    .where(and(eq(quests.runId, runId), eq(quests.status, "active")))
    .orderBy(desc(quests.createdAt));
}

/**
 * Get a single quest by ID
 */
export async function getQuestById(questId: string): Promise<Quest | null> {
  const [quest] = await db
    .select()
    .from(quests)
    .where(eq(quests.id, questId))
    .limit(1);
  return quest || null;
}

/**
 * Create a new quest
 */
export async function createQuest(data: NewQuest): Promise<Quest> {
  const [newQuest] = await db.insert(quests).values(data).returning();
  if (!newQuest) {
    throw new Error("Failed to create quest");
  }
  return newQuest;
}

/**
 * Update quest status
 */
export async function updateQuestStatus(
  questId: string,
  status: "active" | "completed" | "failed" | "dormant"
): Promise<Quest> {
  const [updatedQuest] = await db
    .update(quests)
    .set({
      status,
      updatedAt: new Date(),
    })
    .where(eq(quests.id, questId))
    .returning();
  if (!updatedQuest) {
    throw new Error("Quest not found");
  }
  return updatedQuest;
}

/**
 * Update quest logs array
 */
export async function updateQuestLogs(
  questId: string,
  logs: string[]
): Promise<Quest> {
  const [updatedQuest] = await db
    .update(quests)
    .set({
      logs,
      updatedAt: new Date(),
    })
    .where(eq(quests.id, questId))
    .returning();
  if (!updatedQuest) {
    throw new Error("Quest not found");
  }
  return updatedQuest;
}

/**
 * Update quest clues array
 */
export async function updateQuestClues(
  questId: string,
  clues: string[]
): Promise<Quest> {
  const [updatedQuest] = await db
    .update(quests)
    .set({
      clues,
      updatedAt: new Date(),
    })
    .where(eq(quests.id, questId))
    .returning();
  if (!updatedQuest) {
    throw new Error("Quest not found");
  }
  return updatedQuest;
}

/**
 * Update quest with multiple fields atomically
 */
export async function updateQuest(
  questId: string,
  updates: {
    status?: "active" | "completed" | "failed" | "dormant";
    logs?: string[];
    clues?: string[];
  }
): Promise<Quest> {
  const updateData: {
    status?: "active" | "completed" | "failed" | "dormant";
    logs?: string[];
    clues?: string[];
    updatedAt: Date;
  } = {
    updatedAt: new Date(),
  };

  if (updates.status !== undefined) {
    updateData.status = updates.status;
  }
  if (updates.logs !== undefined) {
    updateData.logs = updates.logs;
  }
  if (updates.clues !== undefined) {
    updateData.clues = updates.clues;
  }

  const [updatedQuest] = await db
    .update(quests)
    .set(updateData)
    .where(eq(quests.id, questId))
    .returning();
  if (!updatedQuest) {
    throw new Error("Quest not found");
  }
  return updatedQuest;
}

