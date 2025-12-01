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
import { streamText } from "ai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { createGameMasterTools } from "@/lib/ai/tools";
import type { CampaignState } from "@/lib/db/schemas/campaign";
import { z } from "zod";

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

const MODEL_NAME = "x-ai/grok-4.1-fast:free";

const continueGameSchema = z.object({
  runId: z.string().uuid(),
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
  const messageHistory = recentMessages.reverse().map((msg) => ({
    role: msg.role as "system" | "user" | "assistant" | "tool" | "data",
    content: msg.content as string | unknown[],
  }));

  // Build system prompt with context
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
  - Active Fronts: ${JSON.stringify(run.state.activeFronts)}
  - Narrative Vectors: Hope=${run.state.narrativeVectors.hope.toFixed(2)}, Chaos=${run.state.narrativeVectors.chaos.toFixed(2)}
  - Quest Threads: ${run.state.questThreads.length} active
  - Knowledge Graph: ${run.state.knowledgeGraph.nodes.length} nodes, ${run.state.knowledgeGraph.edges.length} edges
  - Current Context: ${run.state.currentContext || "Beginning of campaign"}

CHARACTER CONTEXT:
- Name: ${character.name}
- Profession: ${character.properties?.profession || "Unknown"}
- Stats:
  - Strength: ${character.stats.strength}
  - Agility: ${character.stats.agility}
  - Intelligence: ${character.stats.intelligence}
  - Scholarship: ${character.stats.scholarship}
  - Intuition: ${character.stats.intuition}
- Backstory: ${character.properties?.backstory?.substring(0, 300) || "No backstory provided"}...

GAME MASTER INSTRUCTIONS:
1. You are a living world simulator. Use tools to update the campaign state dynamically.
2. Check Active Fronts every turn. If the player ignores a Front, advance it by 1 step.
3. When a player action requires a skill check, use the requestSkillCheck tool with the appropriate attribute and difficulty.
4. After tool execution, narrate the consequences naturally, incorporating state changes into your description.
5. Keep narrative engaging and responsive to player choices.
6. Use maxSteps: 5 to allow multi-step reasoning (Reason -> Act -> Narrate).

IMPORTANT: For skill checks, use requestSkillCheck tool. Do NOT execute it yourself - wait for the player to roll the dice.`;

  // Create mutable state copy for tool execution
  const campaignState: CampaignState = JSON.parse(JSON.stringify(run.state));

  // Create tools with state context
  const toolsWithState = createGameMasterTools(campaignState);

  // Prepare messages array for AI SDK
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

  // Stream text with tools
  const result = streamText({
    model: openrouter.chat(MODEL_NAME),
    messages: aiMessages,
    tools: toolsWithState,
    maxSteps: 5,
    onFinish: async ({ text, toolCalls, toolResults }) => {
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

      // Update campaign state if world mutation tools were executed
      let stateUpdated = false;
      if (toolCalls && toolResults) {
        for (const toolCall of toolCalls) {
          // Skip HITL tools (they don't modify state directly)
          if (toolCall.toolName === "requestSkillCheck") {
            continue;
          }
          stateUpdated = true;
        }
      }

      // Persist updated state if tools modified it
      if (stateUpdated) {
        await db
          .update(runs)
          .set({
            state: campaignState,
            updatedAt: new Date(),
          })
          .where(eq(runs.id, run.id));
      }
    },
  });

  return result;
}
