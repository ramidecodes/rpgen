import { ToolLoopAgent, stepCountIs } from "ai";
import { createGameMasterTools } from "@/lib/ai/tools";
import { getOpenRouterClient, getTextModel } from "@/lib/ai/provider";
import type { CampaignState } from "@/lib/db/schemas/campaign";
import type { Character, Universe, Campaign, Quest } from "@/lib/db/schema";
import type { UIMessage } from "@/types/ui-message";
import { isTextUIPart } from "@/types/ui-message";

// ============================================================================
// Tool Set Types
// ============================================================================

export type GameMasterTools = ReturnType<typeof createGameMasterTools>;

// CMA has all state-mutating tools (no HITL tools, no UI-facing tools)
export type CampaignManagerTools = Omit<
  GameMasterTools,
  "requestSkillCheck" | "suggestActions" | "formatNarrative"
>;

// ============================================================================
// Types
// ============================================================================

export type CampaignManagerAgentOptions = {
  runId: string;
  campaign: Campaign;
  character: Character;
  universe: Universe;
  campaignState: CampaignState;
  activeQuests: Quest[]; // Active quests for state management context
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
 * Creates a Campaign Manager Agent (CMA) - Background agent for complete state management.
 *
 * Responsibilities:
 * - Complete state management responsibility (ALL state mutations)
 * - Reconcile/persist campaign state using deterministic logic
 * - Process recent transcript without user-facing narration
 * - Handle state mutations without HITL interactions
 * - Manage quests, fronts, narrative vectors, and relationships
 *
 * Key differences from GMA:
 * - No HITL tools (requestSkillCheck disabled)
 * - ALL state-mutating tools enabled (quests, fronts, vectors, relationships)
 * - No user-facing streaming output
 * - Deterministic processing for state consistency
 * - Sole state manager (GMA does NOT modify state)
 */
export function createCampaignManagerAgent(
  options: CampaignManagerAgentOptions
): CampaignManagerAgent {
  const { campaignState, runId } = options;

  // Create deep copy of original state for comparison
  const originalStateCopy: CampaignState = JSON.parse(
    JSON.stringify(campaignState)
  );

  const openrouter = getOpenRouterClient();
  const model = openrouter.chat(getTextModel("reasoning"));

  // Build system prompt for background processing
  const systemPrompt = buildSystemPrompt(options);

  // Create tools with state context and runId (exclude HITL tools)
  // runId is required for quest tools to access database
  const allTools = createGameMasterTools(campaignState, runId);
  const stateMutationTools: CampaignManagerTools = {
    updateNarrativeVector: allTools.updateNarrativeVector,
    manageRelationship: allTools.manageRelationship,
    advanceFront: allTools.advanceFront,
    createQuest: allTools.createQuest,
    updateQuest: allTools.updateQuest,
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
      "updateQuest",
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
  const { campaign, character, universe, campaignState, activeQuests } =
    options;

  // Format active quests for context
  const questContext =
    activeQuests.length > 0
      ? activeQuests
          .map(
            (q) =>
              `- "${q.title}" (ID: ${q.id}): ${q.description} - ${q.clues.length} clues, ${q.logs.length} logs`
          )
          .join("\n")
      : "No active quests";

  return `You are the Campaign Manager Agent (CMA) - the SOLE state management system for this campaign.

UNIVERSE CONTEXT:
- Name: ${universe.name}
- Description: ${universe.description}
- Ontology: ${JSON.stringify(universe.ontology)}

CAMPAIGN CONTEXT:
- Name: ${campaign.name}
- Current State (you manage ALL of this):
  - Active Fronts: ${JSON.stringify(campaignState.activeFronts)}
  - Narrative Vectors: Hope=${campaignState.narrativeVectors.hope.toFixed(
    2
  )}, Chaos=${campaignState.narrativeVectors.chaos.toFixed(2)}
  - Knowledge Graph: ${campaignState.knowledgeGraph.nodes.length} nodes, ${
    campaignState.knowledgeGraph.edges.length
  } edges
  - Current Context: ${campaignState.currentContext || "Beginning of campaign"}

ACTIVE QUESTS (you manage these):
${questContext}

CHARACTER CONTEXT:
- Name: ${character.name}
- Stats: STR=${character.stats.strength}, AGI=${character.stats.agility}, INT=${
    character.stats.intelligence
  }, SCH=${character.stats.scholarship}, INTU=${character.stats.intuition}

STATE MANAGEMENT INSTRUCTIONS:
1. You are NOT an interactive Game Master. Do NOT produce narration or chat text.
2. You are the SOLE state manager - GMA does NOT modify state, only you do.
3. Analyze the recent transcript for state changes that need reconciliation.
4. Use deterministic logic to update campaign state based on established patterns.
5. When player actions relate to active quests, use updateQuest with addLog parameter.
6. When new information is discovered, use updateQuest with addClue parameter.
7. When quests are completed or failed, use updateQuest with status parameter (can combine with addLog for final entry).
8. Prefer single updateQuest calls that update multiple fields (status + log + clue) when appropriate.
9. Advance Fronts that have been ignored or need progression.
10. Update narrative vectors based on overall campaign momentum.
11. Create quests for emerging story threads.
12. Manage relationships in the knowledge graph.
13. Do NOT use requestSkillCheck - this is handled by the interactive GMA.
14. Focus on state consistency and world evolution, not player interaction.

TOOL USAGE EXAMPLES:
- Player completes objective: updateQuest(questId, { status: "completed", addLog: "Objective completed successfully" })
- Player discovers clue: updateQuest(questId, { addClue: "Found mysterious note in the library" })
- Player makes progress: updateQuest(questId, { addLog: "Reached the ancient temple", logType: "progress" })
- Multiple updates: updateQuest(questId, { status: "completed", addLog: "Quest finished", addClue: "Final clue discovered" })

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
