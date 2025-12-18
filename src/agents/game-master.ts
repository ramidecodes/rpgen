import { ToolLoopAgent, stepCountIs } from "ai";
import { requestSkillCheckTool } from "@/lib/ai/tools";
import { getOpenRouterClient, getTextModel } from "@/lib/ai/provider";
import type { CampaignState } from "@/lib/db/schemas/campaign";
import type { Character, Universe, Campaign, Quest } from "@/lib/db/schema";

// ============================================================================
// Tool Set Types
// ============================================================================

// GMA only has requestSkillCheck tool (HITL tool for player interactions)
export type GameMasterTools = {
  requestSkillCheck: typeof requestSkillCheckTool;
};

// ============================================================================
// Types
// ============================================================================

export type GameMasterAgentOptions = {
  runId: string;
  campaign: Campaign;
  character: Character;
  universe: Universe;
  campaignState: CampaignState;
  activeQuests: Quest[]; // Read-only quest context for narrative awareness
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
};

// ============================================================================
// Game Master Agent (GMA) - Interactive Agent
// ============================================================================

/**
 * Creates a Game Master Agent (GMA) - Interactive agent that handles user-facing chat interactions.
 *
 * Responsibilities:
 * - Narration and pacing ONLY
 * - Issuing HITL skill checks (requestSkillCheck tool)
 * - NO state mutations (all state management handled by CMA)
 *
 * Key Design:
 * - Strict separation of concerns: GMA narrates, CMA manages state
 * - Fast, responsive player interactions without state mutation overhead
 * - Read-only access to quests and state for narrative context only
 *
 * Uses ToolLoopAgent with:
 * - Single tool: requestSkillCheck (HITL tool for player skill checks)
 * - No state-mutating tools (removed for performance and clarity)
 * - stopWhen conditions to prevent tool spam
 */
export function createGameMasterAgent(
  options: GameMasterAgentOptions
): GameMasterAgent {
  const openrouter = getOpenRouterClient();
  const model = openrouter.chat(getTextModel("base"));

  // Build system prompt with comprehensive context (read-only)
  const systemPrompt = buildSystemPrompt(options);

  // Create tools - ONLY requestSkillCheck (HITL tool)
  const tools: GameMasterTools = {
    requestSkillCheck: requestSkillCheckTool,
  };

  // Create the ToolLoopAgent with single tool
  const agent = new ToolLoopAgent({
    model,
    instructions: systemPrompt,
    tools,

    // Only allow HITL skill check requests
    activeTools: ["requestSkillCheck"],

    // Stop conditions to prevent tool spam
    stopWhen: [
      // Stop after reasonable tool cycles (5 max)
      stepCountIs(5),
    ],
  });

  return {
    getAgent: () => agent,
  };
}

function buildSystemPrompt(options: GameMasterAgentOptions): string {
  const { campaign, character, universe, campaignState, activeQuests } =
    options;

  // Format active quests for context
  const questContext =
    activeQuests.length > 0
      ? activeQuests
          .map(
            (q) =>
              `- "${q.title}": ${q.description} (${q.clues.length} clues, ${q.logs.length} logs)`
          )
          .join("\n")
      : "No active quests";

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
- Current State (READ-ONLY for narrative context - you CANNOT modify this):
  - Active Fronts: ${JSON.stringify(campaignState.activeFronts)}
  - Narrative Vectors: Hope=${campaignState.narrativeVectors.hope.toFixed(
    2
  )}, Chaos=${campaignState.narrativeVectors.chaos.toFixed(2)}
  - Knowledge Graph: ${campaignState.knowledgeGraph.nodes.length} nodes, ${
    campaignState.knowledgeGraph.edges.length
  } edges
  - Current Context: ${campaignState.currentContext || "Beginning of campaign"}

ACTIVE QUESTS (READ-ONLY for narrative context):
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
1. You are a storyteller and narrator. Your ONLY job is to narrate the game world and handle player interactions.
2. You CANNOT modify campaign state (quests, fronts, vectors, relationships). That is handled by the Campaign Manager Agent (CMA) in the background.
3. When a player action requires a skill check, use the requestSkillCheck tool with the appropriate attribute and difficulty.
4. Use quest and state information to inform your narration, but focus on immersive storytelling.
5. Keep narrative engaging and responsive to player choices.
6. Do NOT mention technical state details in your narration (e.g., "The doom clock advances", "Hope increases by 0.2").
7. Instead, describe the narrative consequences: "Time is running out", "A sense of hope fills the air", "A new objective presents itself".

NARRATION RULES:
- Focus on immersive, descriptive storytelling that makes the player feel the consequences, not see the mechanics.
- Use quest and state information to inform your narration, but translate it into narrative language.
- Reference active quests naturally in your narration when relevant.
- Never break character or mention game mechanics directly.

CRITICAL: REASONING SUPPRESSION
- NEVER share your internal reasoning, analysis, or uncertainty with the player.
- NEVER ask clarifying questions or analyze ambiguous player input out loud.
- NEVER expose your decision-making process (e.g., "What is 'nearest thread'? In context, perhaps...", "Likely 'thread' means...", "Action: Gather equipment (probably straightforward, no check)").
- When player input is unclear or ambiguous, make reasonable narrative assumptions based on context and continue the story confidently.
- You are a confident storyteller, not an uncertain assistant. Always narrate as if you understand the player's intent perfectly.

EXAMPLES:
BAD (DO NOT DO THIS):
- "Player action: 'I gather my equipment and search for the nearest thread'. What is 'nearest thread'? In context, perhaps 'thread' refers to a trail..."
- "Action: Gather equipment (probably straightforward, no check), search for nearest thread (tracking/searching, perhaps Intuition or Agility)..."
- "To be consistent, request check. Gather equipment: Narrative. Then search..."

GOOD (DO THIS INSTEAD):
- "You gather your equipment and begin searching for the nearest trail, your keen eyes scanning the undergrowth for signs of the shadow prey's passage..."
- "You collect your gear and set out, tracking the faint traces left behind by your quarry through the eldritch glades..."

IMPORTANT: 
- For skill checks, use requestSkillCheck tool. Do NOT execute it yourself - wait for the player to roll the dice.
- You have NO state-mutating tools. All state management is handled by the Campaign Manager Agent (CMA) in the background.`;
}
