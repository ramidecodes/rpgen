"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import {
  runs,
  characters,
  campaigns,
  universes,
  messages,
} from "@/lib/db/schema";
import { getUserProfileByClerkId } from "@/lib/db/queries/user-profile";
import { eq, desc } from "drizzle-orm";
import { streamText, stepCountIs } from "ai";
import type { CampaignState, KnowledgeGraph } from "@/lib/db/schemas/campaign";
import { z } from "zod";
import { getOpenRouterClient, getTextModel } from "@/lib/ai/provider";
import { getQuestsByRunId } from "@/lib/db/queries/quests";

const openrouter = getOpenRouterClient();
const MODEL_NAME = getTextModel("base");

const continueGameSchema = z.object({
  runId: z.uuid(),
  userMessage: z.string().min(1),
  toolResults: z
    .array(
      z.object({
        toolCallId: z.string(),
        result: z.unknown(),
      })
    )
    .optional(),
});

export async function continueGame(input: z.infer<typeof continueGameSchema>) {
  const { userId: clerkUserId } = await auth();

  if (!clerkUserId) {
    throw new Error("Unauthorized");
  }

  const userProfile = await getUserProfileByClerkId(clerkUserId);
  if (!userProfile) {
    throw new Error("User profile not found");
  }

  const validatedInput = continueGameSchema.parse(input);

  // Fetch run with related data
  const [runData] = await db
    .select({
      run: runs,
      character: characters,
      campaign: campaigns,
      universe: universes,
    })
    .from(runs)
    .innerJoin(characters, eq(runs.characterId, characters.id))
    .innerJoin(campaigns, eq(runs.campaignId, campaigns.id))
    .innerJoin(universes, eq(campaigns.universeId, universes.id))
    .where(eq(runs.id, validatedInput.runId))
    .limit(1);

  if (!runData) {
    throw new Error("Run not found");
  }

  const { run, character, campaign, universe } = runData;

  // Verify ownership
  if (run.userId !== userProfile.id) {
    throw new Error("Unauthorized");
  }

  // Load recent messages (last 50 for context)
  const recentMessages = await db
    .select()
    .from(messages)
    .where(eq(messages.runId, run.id))
    .orderBy(desc(messages.createdAt))
    .limit(50);

  // Reverse chronological message history for AI SDK
  // Filter out "data" role messages as they're not valid for ModelMessage
  const messageHistory = recentMessages
    .reverse()
    .filter((msg) => msg.role !== "data")
    .map((msg) => ({
      role: msg.role as "system" | "user" | "assistant" | "tool",
      content: msg.content as string | unknown[],
    }));

  // Query quests separately
  const allQuests = await getQuestsByRunId(run.id);

  // Build campaignState from separate columns
  const EMPTY_KNOWLEDGE_GRAPH: KnowledgeGraph = { nodes: [], edges: [] };
  const rawKnowledgeGraph =
    (run.relationships as KnowledgeGraph | null) ?? EMPTY_KNOWLEDGE_GRAPH;

  const campaignState: CampaignState = {
    activeFronts: run.activeFronts || [],
    narrativeVectors: run.narrativeVectors || { hope: 0.5, chaos: 0.5 },
    knowledgeGraph: rawKnowledgeGraph,
    currentContext: run.currentContext || null,
  };

  // Build system prompt with context
  const questContext =
    allQuests.length > 0
      ? allQuests
          .map(
            (q) =>
              `- "${q.title}": ${q.description} (${q.status}, ${q.clues.length} clues)`
          )
          .join("\n")
      : "No quests";

  const systemPrompt = `You are the Game Master Agent (GMA) for a text-based RPG campaign.

UNIVERSE CONTEXT:
- Name: ${universe.name}
- Description: ${universe.description}
- History: ${universe.history.substring(0, 500)}...
- Ontology: ${JSON.stringify(universe.ontology)}
- Factions: ${JSON.stringify(universe.factions || [])}

CAMPAIGN CONTEXT:
- Name: ${campaign.name}
- Genres: ${campaign.genres.join(", ")}
- Current State:
  - Active Fronts: ${JSON.stringify(campaignState.activeFronts)}
  - Narrative Vectors: Hope=${campaignState.narrativeVectors.hope.toFixed(
    2
  )}, Chaos=${campaignState.narrativeVectors.chaos.toFixed(2)}
  - Knowledge Graph: ${campaignState.knowledgeGraph.nodes.length} nodes, ${
    campaignState.knowledgeGraph.edges.length
  } edges
  - Current Context: ${campaignState.currentContext || "Beginning of campaign"}

QUESTS:
${questContext}

CHARACTER CONTEXT:
- Name: ${character.name}
- Profession: ${character.properties?.profession || "Unknown"}
- Stats:
  - Strength: ${character.stats.strength}
  - Agility: ${character.stats.agility}
  - Intelligence: ${character.stats.intelligence}
  - Scholarship: ${character.stats.scholarship}
  - Intuition: ${character.stats.intuition}
- Backstory: ${
    character.properties?.backstory?.substring(0, 300) ||
    "No backstory provided"
  }...

GAME MASTER INSTRUCTIONS:
1. You are a storyteller and narrator. Focus on immersive storytelling.
2. When a player action requires a skill check, use the requestSkillCheck tool with the appropriate attribute and difficulty.
3. Keep narrative engaging and responsive to player choices.
4. Reference quests naturally in your narration when relevant.

IMPORTANT: For skill checks, use requestSkillCheck tool. Do NOT execute it yourself - wait for the player to roll the dice.`;

  // Note: This action is deprecated in favor of the chat API route
  // Keeping for backward compatibility but tools are not used here

  // Prepare messages array for AI SDK
  // Don't type explicitly - let TypeScript infer, then assert when passing to streamText
  const aiMessages = [
    { role: "system" as const, content: systemPrompt },
    ...messageHistory,
  ];

  // Add user message if provided
  if (validatedInput.userMessage) {
    aiMessages.push({
      role: "user" as const,
      content: validatedInput.userMessage,
    });
  }

  // Add tool results if provided (from HITL flow)
  if (validatedInput.toolResults && validatedInput.toolResults.length > 0) {
    for (const toolResult of validatedInput.toolResults) {
      aiMessages.push({
        role: "tool" as const,
        content: [
          {
            type: "tool-result" as const,
            toolCallId: toolResult.toolCallId,
            result: toolResult.result,
          },
        ],
      });
    }
  }

  // Stream text without tools (this action is deprecated)
  // The chat API route handles tool execution properly
  const result = streamText({
    model: openrouter.chat(MODEL_NAME),
    messages: aiMessages as never,
    stopWhen: stepCountIs(5),
    onFinish: async ({ text }) => {
      // Save assistant message
      await db.insert(messages).values({
        runId: run.id,
        role: "assistant",
        content: text || [],
      });

      // Save user message if it was a new one
      if (validatedInput.userMessage) {
        await db.insert(messages).values({
          runId: run.id,
          role: "user",
          content: validatedInput.userMessage,
        });
      }
    },
  });

  return result;
}

/**
 * Fetch run state for client-side polling
 * Returns state from separate columns and quests from quests table
 */
export async function getRunStateAction(runId: string): Promise<{
  success: boolean;
  state?: CampaignState;
  quests?: Array<{
    id: string;
    title: string;
    status: string;
    description: string;
    clues: string[];
    logs: string[];
  }>;
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

    const [run] = await db
      .select({
        relationships: runs.relationships,
        activeFronts: runs.activeFronts,
        narrativeVectors: runs.narrativeVectors,
        currentContext: runs.currentContext,
        userId: runs.userId,
      })
      .from(runs)
      .where(eq(runs.id, runId))
      .limit(1);

    if (!run) {
      return { success: false, error: "Run not found" };
    }

    // Verify ownership
    if (run.userId !== userProfile.id) {
      return { success: false, error: "Unauthorized" };
    }

    // Build CampaignState from separate columns
    const EMPTY_KNOWLEDGE_GRAPH: KnowledgeGraph = { nodes: [], edges: [] };
    const rawKnowledgeGraph =
      (run.relationships as KnowledgeGraph | null) ?? EMPTY_KNOWLEDGE_GRAPH;

    const state: CampaignState = {
      activeFronts: run.activeFronts || [],
      narrativeVectors: run.narrativeVectors || { hope: 0.5, chaos: 0.5 },
      knowledgeGraph: rawKnowledgeGraph,
      currentContext: run.currentContext || null,
    };

    // Query quests separately
    const questsList = await getQuestsByRunId(runId);

    return {
      success: true,
      state,
      quests: questsList.map((q) => ({
        id: q.id,
        title: q.title,
        status: q.status,
        description: q.description,
        clues: q.clues,
        logs: q.logs,
      })),
    };
  } catch (error) {
    console.error("[getRunStateAction] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
