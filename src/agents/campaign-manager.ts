import { ToolLoopAgent, stepCountIs } from "ai";
import { createGameMasterTools } from "@/lib/ai/tools";
import { getOpenRouterClient, getTextModel } from "@/lib/ai/provider";
import type { CampaignState } from "@/lib/db/schemas/campaign";
import type { Character, Universe, Campaign } from "@/lib/db/schema";
import type { UIMessage } from "@/types/ui-message";
import { isTextUIPart } from "@/types/ui-message";

// ============================================================================
// Tool Set Types
// ============================================================================

export type GameMasterTools = ReturnType<typeof createGameMasterTools>;

export type CampaignManagerTools = Omit<GameMasterTools, "requestSkillCheck">;

// ============================================================================
// Types
// ============================================================================

export type CampaignManagerAgentOptions = {
  runId: string;
  campaign: Campaign;
  character: Character;
  universe: Universe;
  campaignState: CampaignState;
  recentMessages: UIMessage[]; // Recent messages in UIMessage format
};

export type CampaignManagerAgent = {
  getAgent: () => ToolLoopAgent<never, CampaignManagerTools, never>;
  getCampaignState: () => CampaignState;
  hasStateChanged: (originalState: CampaignState) => boolean;
  getOriginalState: () => CampaignState; // Return the original state copy for comparison
};

// ============================================================================
// Campaign Manager Agent (CMA) - Background State Agent
// ============================================================================

/**
 * Creates a Campaign Manager Agent (CMA) - Background agent for deterministic state reconciliation.
 *
 * Responsibilities:
 * - Reconcile/persist campaign state using deterministic logic
 * - Process recent transcript without user-facing narration
 * - Handle state mutations without HITL interactions
 * - Emit structured logs/telemetry for observability
 *
 * Key differences from GMA:
 * - No HITL tools (requestSkillCheck disabled)
 * - Only state-mutating tools enabled
 * - No user-facing streaming output
 * - Deterministic processing for state consistency
 */
export function createCampaignManagerAgent(
  options: CampaignManagerAgentOptions
): CampaignManagerAgent {
  const { campaignState } = options;

  // Create deep copy of original state for comparison
  const originalStateCopy: CampaignState = JSON.parse(
    JSON.stringify(campaignState)
  );

  const openrouter = getOpenRouterClient();
  const model = openrouter.chat(getTextModel("reasoning"));

  // Build system prompt for background processing
  const systemPrompt = buildSystemPrompt(options);

  // Create tools with state context (exclude HITL tools)
  const allTools = createGameMasterTools(campaignState);
  const stateMutationTools: CampaignManagerTools = {
    updateNarrativeVector: allTools.updateNarrativeVector,
    manageRelationship: allTools.manageRelationship,
    advanceFront: allTools.advanceFront,
    createQuest: allTools.createQuest,
    logEvent: allTools.logEvent,
  };

  // Create the ToolLoopAgent for background processing
  const agent = new ToolLoopAgent({
    model,
    instructions: systemPrompt,
    tools: stateMutationTools,

    // Only allow state-mutating tools (no HITL)
    activeTools: [
      "updateNarrativeVector",
      "manageRelationship",
      "advanceFront",
      "createQuest",
      "logEvent",
    ],

    // Stop conditions for background processing
    stopWhen: [
      // Stop after reasonable tool cycles (3 max for background processing)
      stepCountIs(3),
    ],
  });

  return {
    getAgent: () => agent,
    getCampaignState: () => campaignState,
    hasStateChanged: (originalState: CampaignState) =>
      JSON.stringify(campaignState) !== JSON.stringify(originalState),
    getOriginalState: () => originalStateCopy,
  };
}

function buildSystemPrompt(options: CampaignManagerAgentOptions): string {
  const { campaign, character, universe, campaignState } = options;

  return `You are the Campaign Manager Agent (CMA) - a background state reconciliation system.

UNIVERSE CONTEXT:
- Name: ${universe.name}
- Description: ${universe.description}
- Ontology: ${JSON.stringify(universe.ontology)}

CAMPAIGN CONTEXT:
- Name: ${campaign.name}
- Current State:
  - Active Fronts: ${JSON.stringify(campaignState.activeFronts)}
  - Narrative Vectors: Hope=${campaignState.narrativeVectors.hope.toFixed(
    2
  )}, Chaos=${campaignState.narrativeVectors.chaos.toFixed(2)}
  - Quest Threads: ${campaignState.questThreads.length} active

CHARACTER CONTEXT:
- Name: ${character.name}
- Stats: STR=${character.stats.strength}, AGI=${character.stats.agility}, INT=${
    character.stats.intelligence
  }, SCH=${character.stats.scholarship}, INTU=${character.stats.intuition}

BACKGROUND PROCESSING INSTRUCTIONS:
1. You are NOT an interactive Game Master. Do not produce narration or chat text.
2. Analyze the recent transcript for state changes that need reconciliation.
3. Use deterministic logic to update campaign state based on established patterns.
4. Advance Fronts that have been ignored or need progression.
5. Update narrative vectors based on overall campaign momentum.
6. Create quests for emerging story threads.
7. Log significant events that impact the world state.
8. Do NOT use requestSkillCheck - this is handled by the interactive GMA.
9. Focus on state consistency and world evolution, not player interaction.

OUTPUT: Only use tools to mutate state. No text responses or narration.`;
}

/**
 * Extract text from UIMessage parts for CMA processing
 * Returns CoreMessage format with text content extracted from text parts only
 */
export function extractTextFromUIMessages(
  messages: UIMessage[],
  maxMessages = 20
): Array<{ role: "system" | "user" | "assistant"; content: string }> {
  return messages
    .slice(-maxMessages)
    .filter((msg) => {
      // Only include system, user, assistant messages
      return (
        msg.role === "system" || msg.role === "user" || msg.role === "assistant"
      );
    })
    .map((msg) => {
      // Extract text from text parts only
      const textParts: string[] = [];
      if (Array.isArray(msg.parts)) {
        for (const part of msg.parts) {
          if (isTextUIPart(part)) {
            const text = part.text.trim();
            if (text.length > 0) {
              textParts.push(text);
            }
          }
        }
      }

      return {
        role: msg.role as "system" | "user" | "assistant",
        content: textParts.join(" ").trim() || "", // Join text parts, fallback to empty string
      };
    })
    .filter((msg) => msg.content.length > 0); // Remove empty messages
}
