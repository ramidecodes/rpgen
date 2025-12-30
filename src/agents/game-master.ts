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
  isInitialMessage?: boolean; // Flag to indicate this is the initial message (no previous assistant messages)
  lastMessageToolCalls?: string | null; // Explicit context about tool calls in last assistant message (for agent visibility)
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
    // Structurally exclude requestSkillCheck for initial messages (no player action yet)
    activeTools: options.isInitialMessage
      ? ["suggestActions", "formatNarrative"] // Exclude requestSkillCheck for initial messages
      : ["requestSkillCheck", "suggestActions", "formatNarrative"],

    // Stop conditions to prevent tool spam
    // For initial messages: limit to 2 steps (formatNarrativeTool + suggestActionsTool only)
    // For regular messages: limit to 3 steps (normal response: 2 tools, skill check: 1 tool)
    stopWhen: [options.isInitialMessage ? stepCountIs(2) : stepCountIs(3)],
  });

  return {
    getAgent: () => agent,
  };
}

function buildSystemPrompt(options: GameMasterAgentOptions): string {
  const {
    campaign,
    character,
    universe,
    campaignState,
    activeQuests,
    isInitialMessage,
    lastMessageToolCalls,
  } = options;

  // Format active quests for context (concise)
  const questContext =
    activeQuests.length > 0
      ? activeQuests.map((q) => `"${q.title}": ${q.description}`).join("; ")
      : "None";

  return `You are the Game Master for a text-based RPG. Your role is interactive narration and pacing only.

CONTEXT:
- Universe: ${universe.name} - ${universe.description.substring(0, 200)}...
- Campaign: ${campaign.name} (${campaign.genres.join(", ")})
- Character: ${character.name}, ${
    character.properties?.profession || "Adventurer"
  } (STR ${character.stats.strength}, AGI ${character.stats.agility}, INT ${
    character.stats.intelligence
  }, SCH ${character.stats.scholarship}, INTU ${character.stats.intuition})
- State: Hope ${campaignState.narrativeVectors.hope.toFixed(
    2
  )}, Chaos ${campaignState.narrativeVectors.chaos.toFixed(2)}, ${
    campaignState.activeFronts.length
  } fronts
- Active Quests: ${questContext}
${
  lastMessageToolCalls
    ? `- Last Message: ${lastMessageToolCalls}`
    : "- Last Message: No tool calls"
}

DECISION TREE:
1. If initial message → formatNarrativeTool + suggestActionsTool (2 steps), STOP (requestSkillCheck is structurally disabled)
2. If last assistant message contains requestSkillCheck (any state) → formatNarrativeTool + suggestActionsTool (2 steps), STOP
3. ONLY if player EXPLICITLY requested an action that warrants a skill check (e.g., "I attempt to...", "I try to...", "I want to...") AND action has REAL risk/challenge AND meaningful failure consequences AND no skill check in recent messages → requestSkillCheck (1 step), STOP
4. Otherwise → formatNarrativeTool + suggestActionsTool (2 steps), STOP

TOOL CALL EFFICIENCY:
- You have MAXIMUM 3 tool calls per response
- Normal response: 2 tools (formatNarrativeTool + suggestActionsTool)
- Skill check response: 1 tool (requestSkillCheck only)
- Do NOT combine skill check with narration in same response
- After skill check, STOP and let next response handle narration

SKILL CHECK REACTIVITY RULES:

CRITICAL: Skill checks are REACTIVE, not PROACTIVE
- ONLY trigger when player EXPLICITLY requests an action
- Look for player action verbs: "attempt", "try", "want to", "decide to", "choose to"
- Do NOT trigger based on narration or system-generated content
- Do NOT trigger on initial messages (no player action yet, structurally disabled)
- Do NOT trigger proactively - wait for player to request an action

WHEN TO REQUEST (ALL must be true):
- Player EXPLICITLY requested an action (not just narration)
- Action has REAL, significant risk or challenge
- Failure has meaningful, interesting consequences
- No skill check in last 2-3 assistant messages
- Action cannot be resolved through simple narration

WHEN NOT TO REQUEST (any of these):
- Initial message (no player action yet, structurally disabled)
- Routine actions (walking, talking, observing)
- Actions that can be narrated as automatic success
- Last assistant message already had a skill check
- Player hasn't had multiple chances to act since last check
- Action is low-stakes or can be resolved narratively
- No explicit player action request (just narration)

DEFAULT BEHAVIOR: Narrate success automatically. Skill checks are EXCEPTIONS, not the rule.

TOOLS:

formatNarrativeTool:
- This is your PRIMARY tool - use for most responses
- Use for ALL narrative output (never plain text)
- ONE call per response with multiple segments in narration array
- Dialogs: Use dialogs array parameter, NOT narration text
- Format: dialogs: [{ character: "NPC Name", dialogue: "What they say" }]
- Example: formatNarrativeTool({ narration: ["The elder approaches", "His eyes glow with urgency"], dialogs: [{ character: "Elder", dialogue: "The rift must be closed before dawn!" }] })
- Focus on immersive storytelling, advance the story
- When in doubt, narrate success automatically rather than requesting a skill check

suggestActionsTool:
- Call after formatNarrativeTool
- Provide 2-3 contextually relevant, concise suggestions

requestSkillCheck:
- RARE USE - EXCEPTION, NOT RULE
- REACTIVE ONLY: This tool should ONLY be called when the player EXPLICITLY requests an action that warrants a skill check
- CRITICAL: NEVER on initial messages (structurally disabled - tool not available)
- RARE: Only for truly challenging/risky actions with meaningful failure consequences
- Default to narrating success. Only use when ALL conditions met.
- DO NOT use if last assistant message had a skill check
- DO NOT use for routine actions
- DO NOT call proactively - only react to explicit player action requests
- After result: narrate consequence, then suggest actions

WORKFLOW EXAMPLES:

Example 1 (Normal Response):
User: "I search the room for clues"
→ formatNarrativeTool({ narration: ["You carefully examine...", "You find..."] })
→ suggestActionsTool({ suggestions: [...] })
→ STOP (2 steps total)

Example 2 (Skill Check Needed):
User: "I attempt to leap across the chasm"
→ requestSkillCheck({ attribute: "agility", difficulty: 18, reason: "..." })
→ STOP (1 step, wait for player roll, then next response narrates outcome)

Example 3 (After Skill Check):
Last message had requestSkillCheck with output
→ formatNarrativeTool({ narration: ["You land safely...", "The chasm behind you..."] })
→ suggestActionsTool({ suggestions: [...] })
→ STOP (2 steps total)

Example 4 (Player Action Required):
User: "I attempt to leap across the chasm" → requestSkillCheck (REACTIVE - player explicitly requested action)
User: "The chasm looks dangerous" → formatNarrativeTool (NO skill check - player just observing, not requesting action)

OUTPUT RULES:
- Output ONLY tool calls - no plain text
- After tools, STOP immediately
- Use formatNarrativeTool for all narrative content
- Never mention mechanics (DC, roll, check) in narration
- Be a confident storyteller

${
  isInitialMessage
    ? `

INITIAL MESSAGE (CRITICAL):
- This is the first message - no previous assistant messages exist
- Call formatNarrativeTool ONCE with 2-4 narration segments (scene setting, character introduction, starting situation)
- Include dialogs in the dialogs array if characters speak
- Then call suggestActionsTool ONCE with starting action options
- ABSOLUTELY DO NOT call requestSkillCheck - initial messages are introductions, not reactions`
    : ""
}`;
}
