import { ToolLoopAgent, stepCountIs } from "ai";
import { createGameMasterTools } from "@/lib/ai/tools";
import { getOpenRouterClient, getTextModel } from "@/lib/ai/provider";
import type { CampaignState } from "@/lib/db/schemas/campaign";
import type { Character, Universe, Campaign } from "@/lib/db/schema";

// ============================================================================
// Tool Set Types
// ============================================================================

export type GameMasterTools = ReturnType<typeof createGameMasterTools>;

export type CampaignManagerTools = Omit<GameMasterTools, "requestSkillCheck">;

// ============================================================================
// Types
// ============================================================================

export type GameMasterAgentOptions = {
  runId: string;
  campaign: Campaign;
  character: Character;
  universe: Universe;
  campaignState: CampaignState;
  runIdContext?: string; // Additional context from run
};

export type CallOptions = {
  runId: string;
  campaignId: string;
  characterId: string;
  universeId: string;
  campaignState: CampaignState;
};

export type GameMasterAgent = {
  getAgent: () => ToolLoopAgent<never, GameMasterTools, never>;
  getCampaignState: () => CampaignState;
  hasStateChanged: (originalState: CampaignState) => boolean;
};

// ============================================================================
// Game Master Agent (GMA) - Interactive Agent
// ============================================================================

/**
 * Creates a Game Master Agent (GMA) - Interactive agent that handles user-facing chat interactions.
 *
 * Responsibilities:
 * - Narration and pacing
 * - Issuing HITL skill checks (requestSkillCheck tool)
 * - Proposing world updates through state-mutating tools
 * - Managing conversation flow with tool loop control
 *
 * Uses ToolLoopAgent with:
 * - Phased tool access (HITL first, then narration/world-tools)
 * - stopWhen conditions to prevent tool spam
 * - prepareStep for message context management
 */
export function createGameMasterAgent(
  options: GameMasterAgentOptions
): GameMasterAgent {
  const { campaignState } = options;
  const openrouter = getOpenRouterClient();
  const model = openrouter.chat(getTextModel("base"));

  // Build system prompt with comprehensive context
  const systemPrompt = buildSystemPrompt(options);

  // Create tools with state context
  const tools = createGameMasterTools(campaignState);

  // Create the ToolLoopAgent with phased tool control
  const agent = new ToolLoopAgent({
    model,
    instructions: systemPrompt,
    tools,

    // Phase 1: Allow HITL skill check requests first
    activeTools: ["requestSkillCheck"],

    // Stop conditions to prevent tool spam
    stopWhen: [
      // Stop after reasonable tool cycles (5 max)
      stepCountIs(5),
    ],

    // Prepare each step with context management
    prepareStep: ({ messages }) => {
      // Phase tool access based on step context
      const lastMessage = messages[messages.length - 1];

      if (lastMessage?.role === "tool") {
        // After tool execution, allow world-state tools for response
        return {
          activeTools: [
            "updateNarrativeVector",
            "manageRelationship",
            "advanceFront",
            "createQuest",
            "logEvent",
          ],
        };
      }

      // Default: Allow HITL checks
      return {
        activeTools: ["requestSkillCheck"],
      };
    },
  });

  return {
    getAgent: () => agent,
    getCampaignState: () => campaignState,
    hasStateChanged: (originalState: CampaignState) =>
      JSON.stringify(campaignState) !== JSON.stringify(originalState),
  };
}

function buildSystemPrompt(options: GameMasterAgentOptions): string {
  const { campaign, character, universe, campaignState } = options;

  return `You are the Game Master Agent (GMA) for a text-based RPG campaign.

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
  - Quest Threads: ${campaignState.questThreads.length} active
  - Knowledge Graph: ${campaignState.knowledgeGraph.nodes.length} nodes, ${
    campaignState.knowledgeGraph.edges.length
  } edges
  - Current Context: ${campaignState.currentContext || "Beginning of campaign"}

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
1. You are a living world simulator. Use tools to update the campaign state dynamically.
2. Check Active Fronts every turn. If the player ignores a Front, advance it by 1 step.
3. When a player action requires a skill check, use the requestSkillCheck tool with the appropriate attribute and difficulty.
4. After tool execution, narrate the consequences naturally, incorporating state changes into your description.
5. Keep narrative engaging and responsive to player choices.
6. You can perform multi-step reasoning (Reason -> Act -> Narrate) when needed to handle complex situations.

IMPORTANT: For skill checks, use requestSkillCheck tool. Do NOT execute it yourself - wait for the player to roll the dice.`;
}
