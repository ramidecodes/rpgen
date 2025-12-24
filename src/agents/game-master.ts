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
2. Check the LAST assistant message for skill checks:
   - If it contains a skill check (pending or completed): DO NOT request another one
   - If it contains a completed skill check result (state: "output-available"): Skip to step 4 (narrate consequence)
3. If action requires skill check AND last message does NOT contain a skill check:
   a. Call requestSkillCheck (STOP - wait for player roll)
4. If skill check result received OR no skill check needed:
   a. Narrate what happens (formatNarrativeTool)
   b. Provide suggestions (suggestActionsTool)
   c. DO NOT request another skill check

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
- DO NOT call suggestActionsTool if a skill check is pending (state: "input-available")
- Call suggestActionsTool after formatNarrativeTool ONLY when no skill check is pending
- After skill check results: narrate consequence (formatNarrativeTool), then provide suggestions (suggestActionsTool)
- Required after skill check results are fully processed
- Provide 2-3 contextually relevant action suggestions
- Use concise, actionable phrases

SKILL CHECKS:
- Use requestSkillCheck when player action requires a roll
- CRITICAL: Before requesting, check the LAST assistant message for any skill check
- If the last message contains a skill check (pending or completed), DO NOT request another one
- If you see state: "output-available" for requestSkillCheck, the player has already rolled - continue with narrative
- After receiving skill check result: IMMEDIATELY narrate the consequence (formatNarrativeTool), then provide suggestions (suggestActionsTool)
- NEVER request a skill check if the last message was also a skill check - continue with narrative instead
- Only use success/failure outcome - ignore roll values, DCs, attributes
- Never mention mechanics (DCs, rolls, attributes) in narration
- Describe what happened in the world, not what was attempted
- After a skill check result, show the immediate consequence and how it changes the situation

SKILL CHECK RESULT DETECTION (CRITICAL):
- Before requesting ANY skill check, check the LAST assistant message for existing skill checks
- A skill check can be: pending (state: "input-available") or completed (state: "output-available")
- If the last message contains a skill check (pending or completed), DO NOT request another skill check
- If you see a completed skill check result (state: "output-available"), immediately narrate the consequence using formatNarrativeTool, then provide suggestions
- Only request a skill check when:
  * The player's action requires a roll
  * AND the last assistant message does NOT contain a skill check
  * AND no skill check is currently pending (state: "input-available")

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
