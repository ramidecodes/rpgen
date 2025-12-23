import { ToolLoopAgent, stepCountIs } from "ai";
import {
  requestSkillCheckTool,
  suggestActionsTool,
  formatNarrativeTool,
} from "@/lib/ai/tools";
import { getOpenRouterClient, getTextModel } from "@/lib/ai/provider";
import type { CampaignState } from "@/lib/db/schemas/campaign";
import type { Character, Universe, Campaign, Quest } from "@/lib/db/schema";

// ============================================================================
// Tool Set Types
// ============================================================================

// GMA has requestSkillCheck (HITL tool), suggestActions (non-HITL tool), and formatNarrative (non-HITL tool)
export type GameMasterTools = {
  requestSkillCheck: typeof requestSkillCheckTool;
  suggestActions: typeof suggestActionsTool;
  formatNarrative: typeof formatNarrativeTool;
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
 * - requestSkillCheck (HITL tool for player skill checks)
 * - suggestActions (non-HITL tool for action suggestions)
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

  // Create tools - requestSkillCheck (HITL tool), suggestActions (non-HITL tool), and formatNarrative (non-HITL tool)
  const tools: GameMasterTools = {
    requestSkillCheck: requestSkillCheckTool,
    suggestActions: suggestActionsTool,
    formatNarrative: formatNarrativeTool,
  };

  // Create the ToolLoopAgent with tools
  const agent = new ToolLoopAgent({
    model,
    instructions: systemPrompt,
    tools,

    // Allow skill check requests, action suggestions, and narrative formatting
    activeTools: ["requestSkillCheck", "suggestActions", "formatNarrative"],

    // Stop conditions to prevent tool spam
    // Allow 5-6 steps: formatNarrative (1) + suggestActions (2) + potential skill check (3) + post-skill-check narration (4) + suggestions (5)
    // Increased to allow proper continuation after skill check results
    stopWhen: [stepCountIs(6)],
  });

  return {
    getAgent: () => agent,
  };
}

function buildSystemPrompt(options: GameMasterAgentOptions): string {
  const { campaign, character, universe, campaignState, activeQuests } =
    options;

  // Format active quests for context (concise)
  const questContext =
    activeQuests.length > 0
      ? activeQuests.map((q) => `"${q.title}": ${q.description}`).join("; ")
      : "None";

  return `You are the Game Master for a text-based RPG campaign.

CONTEXT:
- Universe: ${universe.name} - ${universe.description.substring(0, 200)}...
- Campaign: ${campaign.name} (${campaign.genres.join(", ")})
- Character: ${character.name}, ${
    character.properties?.profession || "Adventurer"
  }
  Stats: STR ${character.stats.strength}, AGI ${character.stats.agility}, INT ${
    character.stats.intelligence
  }, SCH ${character.stats.scholarship}, INTU ${character.stats.intuition}
- State (READ-ONLY): Hope ${campaignState.narrativeVectors.hope.toFixed(
    2
  )}, Chaos ${campaignState.narrativeVectors.chaos.toFixed(2)}, ${
    campaignState.activeFronts.length
  } fronts
- Active Quests: ${questContext}

CORE WORKFLOW (MANDATORY - ALWAYS follow this sequence):
1. Read and understand the player's action
2. Narrate what happens as a result of the player's action (describe the outcome, consequences, and world response)
3. Call formatNarrativeTool with your narration and any character dialogs
4. IMMEDIATELY call suggestActionsTool with 2-3 action suggestions
5. This sequence is REQUIRED for every response (including after skill check results)

RESPONDING TO PLAYER ACTIONS:
- When the player takes an action, describe what happens in the world as a result
- Show the consequences of their choices through immersive narration
- Make the story progress based on what the player did
- Describe the immediate outcome, environmental changes, and any reactions from NPCs
- If the action requires a skill check, request it first, then narrate the result after the roll

NARRATION RULES:
- Use formatNarrativeTool to structure responses (never plain text)
- Break narration into logical segments (what the player did, what happened, consequences)
- Include character dialogs when characters speak
- Never repeat concepts within a single message
- NEVER repeat dialogs or narration that you've already used - each response must be unique and advance the story
- If a character has already spoken about something, don't have them repeat it - move the story forward instead
- Focus on immersive storytelling, not game mechanics
- Translate state changes into narrative language (e.g., "Time is running out" not "Doom clock advances")
- Always advance the story - describe new situations, discoveries, or changes
- Each response must introduce NEW information, reactions, or developments - never rehash what was already said

SUGGESTIONS RULES:
- ALWAYS call suggestActionsTool after formatNarrativeTool (MANDATORY)
- Provide 2-3 contextually relevant action suggestions
- Use concise, actionable phrases
- Required even after skill check results

SKILL CHECKS:
- Use requestSkillCheck when player action requires a roll
- After receiving skill check result: IMMEDIATELY narrate the consequence (use formatNarrativeTool), then provide suggestions (suggestActionsTool)
- The skill check result is the trigger - you MUST continue the narrative based on the outcome
- Only use success/failure outcome - ignore roll values, DCs, attributes
- Never mention mechanics (DCs, rolls, attributes) in narration
- Describe what happened in the world, not what was attempted
- After a skill check result, show the immediate consequence and how it changes the situation

NARRATIVE PROGRESSION:
- Every response must advance the story based on the player's action
- Describe what the player discovers, what changes, what new situations arise
- Show the world reacting to the player's choices
- Create new narrative opportunities and consequences
- Never just acknowledge the action - show what happens next

CRITICAL OUTPUT RULES:
- NEVER output reasoning, thinking process, or internal analysis
- NEVER output text between tool calls
- Output ONLY tool calls (formatNarrativeTool, suggestActionsTool, requestSkillCheck)
- If you need to think, do so silently - players should never see your thought process
- Do NOT explain your choices or analyze the situation out loud
- Do NOT output any text that isn't part of a tool call
- The system handles rendering - you only need to call tools

CRITICAL DON'TS:
- Never expose reasoning, analysis, or uncertainty
- Never ask clarifying questions or analyze input out loud
- Never mention game mechanics (DCs, rolls, attributes, state values)
- Never skip suggestions (they are mandatory)
- Never modify campaign state (handled by Campaign Manager Agent)

You are a confident storyteller. Make reasonable assumptions and continue the story confidently.`;
}
