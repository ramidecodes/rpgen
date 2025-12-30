import { tool } from "ai";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import type { CampaignState } from "@/lib/db/schemas/campaign";
import type { Scene } from "@/lib/db/schema";
import {
  createQuest as createQuestQuery,
  updateQuest as updateQuestQuery,
  getQuestById,
} from "@/lib/db/queries/quests";

// --- Interactive Tools (HITL - Client triggers) ---

export const requestSkillCheckTool = tool({
  description:
    "RARE USE - EXCEPTION, NOT RULE. REACTIVE ONLY: This tool should ONLY be called when the player EXPLICITLY requests an action that warrants a skill check. Request a skill check from the player. This pauses the narrative until the player rolls the dice. Default to narrating success. Only use when ALL conditions met. CRITICAL PROHIBITIONS (check these FIRST before calling): 1) NEVER call this tool on initial/introductory messages (structurally disabled - tool not available). 2) NEVER call this tool if the last assistant message contains ANY skill check (input-available OR output-available) - check the message history before calling. 3) DO NOT use for routine actions (walking, talking, simple observations, basic interactions). 4) Only use for actions with REAL risk/challenge (combat, dangerous climbs, complex lockpicking, risky stealth, difficult negotiations under pressure). 5) Skill checks are REACTIVE to player actions, not proactive requests - ONLY call when player EXPLICITLY requests an action (e.g., 'I attempt to...', 'I try to...'). Do NOT call proactively - only react to explicit player action requests. After a skill check result, narrate the consequence - do NOT request another skill check. When in doubt, narrate success automatically rather than requesting a check.",
  inputSchema: z.object({
    attribute: z
      .enum(["strength", "agility", "intelligence", "scholarship", "intuition"])
      .describe("The character attribute to check"),
    difficulty: z
      .number()
      .int()
      .min(1)
      .max(30)
      .describe("The difficulty class (DC) for the check"),
    reason: z.string().describe("Why this skill check is needed"),
  }),
  // No execute function - this is a HITL tool that requires client-side handling
} as const);

export const suggestActionsTool = tool({
  description:
    "Provide 2-3 contextually relevant action suggestions for the player. MANDATORY: Always call this tool immediately after formatNarrativeTool. Suggestions should be concise, actionable phrases that make narrative sense given the current situation. Required even after skill check results.",
  inputSchema: z.object({
    suggestions: z
      .array(z.string())
      .min(2)
      .max(3)
      .describe(
        "Array of 2-3 suggested actions for the player. Each suggestion should be a concise, actionable phrase (e.g., 'Search the room for clues', 'Ask the merchant about the artifact', 'Attempt to pick the lock'). Suggestions should be contextually relevant to the current narrative moment."
      ),
  }),
  execute: async ({ suggestions }: { suggestions: string[] }) => {
    // Tool executes immediately and returns suggestions
    // These will be included in the assistant message parts for client-side rendering
    return {
      success: true,
      suggestions,
      message: `Generated ${suggestions.length} action suggestions`,
    };
  },
} as const);

export const formatNarrativeTool = tool({
  description:
    'This is your PRIMARY tool - use for most responses. Format narrative content with clear separation between GM narration and character dialogs. Use this to structure your response for optimal readability. ALWAYS use this tool to format your narrative responses - do NOT output plain text narration. DIALOG FORMAT: When characters speak, use the dialogs array parameter with format: dialogs: [{ character: "Character Name", dialogue: "What they say" }]. Do NOT put dialog text in the narration array. Example: formatNarrativeTool({ narration: ["The elder approaches"], dialogs: [{ character: "Elder", dialogue: "The rift must be closed!" }] }). When in doubt, narrate success automatically rather than requesting a skill check.',
  inputSchema: z.object({
    narration: z
      .array(z.string())
      .min(1)
      .describe(
        "Array of narration segments (GM descriptions, scene setting, action descriptions, etc.). Break narration into logical segments for better readability. Do NOT include character dialogue here - use the dialogs parameter instead."
      ),
    dialogs: z
      .array(
        z.object({
          character: z
            .string()
            .describe(
              'Character name speaking (e.g., "Elder", "Guard", "Merchant")'
            ),
          dialogue: z
            .string()
            .describe("What the character says (the actual spoken words)"),
        })
      )
      .optional()
      .describe(
        'Array of character dialogs. Format: [{ character: "Name", dialogue: "What they say" }]. Use this for ALL character speech - do NOT put dialogue in the narration array.'
      ),
  }),
  execute: async ({
    narration,
    dialogs,
  }: {
    narration: string[];
    dialogs?: Array<{ character: string; dialogue: string }>;
  }) => {
    // Tool executes immediately and returns structured data
    // This will be included in the assistant message parts for client-side rendering
    return {
      success: true,
      narration,
      dialogs: dialogs || [],
      message: "Narrative formatted successfully",
    };
  },
} as const);

// Factory function to create tools with state context and runId
// runId is required for quest tools that need database access
export function createGameMasterTools(state: CampaignState, runId: string) {
  // Validate state structure
  if (!state || typeof state !== "object") {
    throw new Error("Invalid campaign state: state must be an object");
  }

  // Ensure required properties exist with defaults
  const validatedState: CampaignState = {
    activeFronts: Array.isArray(state.activeFronts) ? state.activeFronts : [],
    narrativeVectors: {
      hope:
        typeof state.narrativeVectors?.hope === "number"
          ? state.narrativeVectors.hope
          : 0.5,
      chaos:
        typeof state.narrativeVectors?.chaos === "number"
          ? state.narrativeVectors.chaos
          : 0.5,
    },
    knowledgeGraph: {
      nodes: Array.isArray(state.knowledgeGraph?.nodes)
        ? state.knowledgeGraph.nodes
        : [],
      edges: Array.isArray(state.knowledgeGraph?.edges)
        ? state.knowledgeGraph.edges
        : [],
    },
    currentContext:
      typeof state.currentContext === "string" ? state.currentContext : null,
  };

  return {
    updateNarrativeVector: tool({
      description: `Adjust the campaign's narrative mood by changing Hope and Chaos levels. Use this when:
- Player actions significantly impact the world's state
- Major victories or defeats occur
- The tone of the campaign shifts meaningfully
- Hope: Increase when players succeed heroically, save lives, or restore order. Decrease when they fail critically or despair grows.
- Chaos: Increase when things spiral out of control, violence escalates, or order breaks down. Decrease when stability is restored.
Make meaningful changes (0.1-0.3 deltas) - small shifts matter. Don't adjust every turn.`,
      inputSchema: z.object({
        hopeDelta: z
          .number()
          .min(-1)
          .max(1)
          .describe("Change to Hope level (-1 to 1)"),
        chaosDelta: z
          .number()
          .min(-1)
          .max(1)
          .describe("Change to Chaos level (-1 to 1)"),
      }),
      execute: async ({
        hopeDelta,
        chaosDelta,
      }: {
        hopeDelta: number;
        chaosDelta: number;
      }) => {
        const newHope = Math.max(
          0,
          Math.min(1, validatedState.narrativeVectors.hope + hopeDelta)
        );
        const newChaos = Math.max(
          0,
          Math.min(1, validatedState.narrativeVectors.chaos + chaosDelta)
        );
        validatedState.narrativeVectors.hope = newHope;
        validatedState.narrativeVectors.chaos = newChaos;
        return {
          success: true,
          newHope,
          newChaos,
          message: `Narrative vectors updated: Hope=${newHope.toFixed(
            2
          )}, Chaos=${newChaos.toFixed(2)}`,
        };
      },
    }),
    manageRelationship: tool({
      description: `Update or create relationships in the Knowledge Graph. Use this when:
- NPCs interact meaningfully with the player or each other
- Alliances form or break
- Reputations change significantly
- New connections are discovered
The Knowledge Graph tracks relationships between entities (NPCs, factions, locations, etc.). Only update when relationships meaningfully change, not for every interaction.`,
      inputSchema: z.object({
        sourceId: z.string().describe("ID of the source node"),
        targetId: z.string().describe("ID of the target node"),
        relationType: z
          .string()
          .describe(
            "Type of relationship (e.g., 'hates', 'loves', 'allied_with')"
          ),
        value: z
          .number()
          .min(0)
          .max(1)
          .describe("Strength/weight of the relationship (0-1)"),
      }),
      execute: async ({
        sourceId,
        targetId,
        relationType,
        value,
      }: {
        sourceId: string;
        targetId: string;
        relationType: string;
        value: number;
      }) => {
        const existingEdgeIndex = validatedState.knowledgeGraph.edges.findIndex(
          (e) => e.source === sourceId && e.target === targetId
        );
        if (existingEdgeIndex >= 0) {
          validatedState.knowledgeGraph.edges[existingEdgeIndex].relation =
            relationType;
          validatedState.knowledgeGraph.edges[existingEdgeIndex].weight = value;
        } else {
          validatedState.knowledgeGraph.edges.push({
            source: sourceId,
            target: targetId,
            relation: relationType,
            weight: value,
          });
        }
        return {
          success: true,
          message: `Relationship ${relationType} between ${sourceId} and ${targetId} set to ${value}`,
        };
      },
    }),
    advanceFront: tool({
      description: `Advance a plot threat (Front) by moving its doom clock forward. Use this when:
- The player ignores or fails to address a Front
- Time passes without player intervention
- A Front's conditions naturally progress
- The player makes choices that indirectly advance a threat
Only advance Fronts that are relevant to the current situation. Don't advance all Fronts every turn - be selective and meaningful.`,
      inputSchema: z.object({
        frontId: z.string().describe("ID or name of the Front to advance"),
        steps: z
          .number()
          .int()
          .min(1)
          .max(3)
          .describe("Number of steps to advance the doom clock"),
      }),
      execute: async ({
        frontId,
        steps,
      }: {
        frontId: string;
        steps: number;
      }) => {
        const front = validatedState.activeFronts.find(
          (f) =>
            f.name === frontId ||
            f.name.toLowerCase().includes(frontId.toLowerCase())
        );
        if (!front) {
          return {
            success: false,
            message: `Front "${frontId}" not found`,
          };
        }
        front.doomClock = Math.min(front.maxDoom, front.doomClock + steps);
        const isDoomed = front.doomClock >= front.maxDoom;
        return {
          success: true,
          newDoomClock: front.doomClock,
          isDoomed,
          message: `Front "${front.name}" advanced to ${front.doomClock}/${
            front.maxDoom
          }${isDoomed ? " - DOOM TRIGGERED!" : ""}`,
        };
      },
    }),
    createQuest: tool({
      description: `Create a new quest when the player discovers or accepts a new objective. Use this for:
- Main story objectives that drive the campaign forward
- Side quests that offer optional content
- Mystery threads that need investigation
- Player-initiated goals that become quests
Only create quests that are meaningful and relevant. Don't create duplicate quests.`,
      inputSchema: z.object({
        title: z.string().describe("Title of the quest"),
        description: z.string().describe("Description of the quest objective"),
        type: z
          .string()
          .optional()
          .describe("Type of quest (e.g., 'main', 'side', 'mystery')"),
      }),
      execute: async ({
        title,
        description,
      }: {
        title: string;
        description: string;
      }) => {
        // Create quest in database
        const newQuest = await createQuestQuery({
          runId,
          title,
          description,
          status: "active",
          clues: [],
          logs: [],
        });

        return {
          success: true,
          questId: newQuest.id,
          message: `Quest "${title}" created`,
        };
      },
    }),
    updateQuest: tool({
      description: `Update a quest with status changes, log entries, or clues. This is a unified tool for all quest updates. Use this when:
- Player actions relate to active quests (add log entry)
- New information is discovered (add clue)
- Quests are completed or failed (update status)
- Multiple updates are needed (can combine status + log + clue in single call)
Prefer single updateQuest calls that update multiple fields when appropriate.`,
      inputSchema: z.object({
        questId: z.string().uuid().describe("ID of the quest to update"),
        status: z
          .enum(["active", "completed", "failed", "dormant"])
          .optional()
          .describe("Update quest status"),
        addLog: z
          .string()
          .optional()
          .describe("Append a new log entry to quest's logs array"),
        addClue: z
          .string()
          .optional()
          .describe("Append a new clue to quest's clues array"),
        logType: z
          .string()
          .optional()
          .describe(
            "Type of log entry (e.g., 'progress', 'discovery', 'failure')"
          ),
        logImportance: z
          .enum(["low", "medium", "high", "critical"])
          .optional()
          .describe("Importance level of the log entry"),
      }),
      execute: async ({
        questId,
        status,
        addLog,
        addClue,
        logType,
        logImportance,
      }: {
        questId: string;
        status?: "active" | "completed" | "failed" | "dormant";
        addLog?: string;
        addClue?: string;
        logType?: string;
        logImportance?: "low" | "medium" | "high" | "critical";
      }) => {
        // Verify quest exists and belongs to this run
        const quest = await getQuestById(questId);
        if (!quest) {
          return {
            success: false,
            message: `Quest with ID "${questId}" not found`,
          };
        }
        if (quest.runId !== runId) {
          return {
            success: false,
            message: `Quest does not belong to this run`,
          };
        }

        // Build update object
        const updates: {
          status?: "active" | "completed" | "failed" | "dormant";
          logs?: string[];
          clues?: string[];
        } = {};

        if (status !== undefined) {
          updates.status = status;
        }

        if (addLog) {
          const formattedLog = `[${logType || "general"}] ${addLog} (${
            logImportance || "medium"
          })`;
          updates.logs = [...quest.logs, formattedLog];
        }

        if (addClue) {
          updates.clues = [...quest.clues, addClue];
        }

        // At least one update must be provided
        if (Object.keys(updates).length === 0) {
          return {
            success: false,
            message:
              "At least one update (status, addLog, or addClue) must be provided",
          };
        }

        // Update quest atomically
        const updatedQuest = await updateQuestQuery(questId, updates);

        return {
          success: true,
          questId: updatedQuest.id,
          status: updatedQuest.status,
          logCount: updatedQuest.logs.length,
          clueCount: updatedQuest.clues.length,
          message: `Quest "${updatedQuest.title}" updated successfully`,
        };
      },
    }),
    requestSkillCheck: requestSkillCheckTool, // HITL tool - no execute
    suggestActions: suggestActionsTool, // Non-HITL tool - executes immediately
  };
}

// ============================================================================
// Visual Engine Tools
// ============================================================================

/**
 * Tool to determine the appropriate scene type based on narrative context
 */
export const determineSceneTypeTool = tool({
  description: `Analyze narrative context and character action to determine the most appropriate scene type for visual generation. 

CRITICAL: This tool MUST be called AFTER shouldGenerateScene returns shouldGenerate: true, and BEFORE generateImagePrompt. Do not skip this step or guess the scene type.

ANALYSIS PROCESS:
Analyze the narrative holistically to determine what the visual focus should be. Consider:
- What is the primary subject of the narrative moment?
- What should the viewer's attention be drawn to?
- What type of composition best serves the narrative?

SCENE TYPE GUIDELINES:

PORTRAIT (Character-focused):
- Use when: The narrative emphasizes character moments, emotions, expressions, dialogue, conversations, or NPC interactions
- Visual focus: Character's face and expression are the primary subject
- Composition: Character-centered, close-up framing, character fills 70-80% of frame
- Examples: Character speaking, reacting emotionally, having a conversation, expressing feelings, interacting with NPCs in dialogue

WIDE SHOT (Environment-focused):
- Use when: The narrative emphasizes location, environment, exploration, travel, environmental storytelling, or establishing scenes
- Visual focus: Environment and location are the primary subject, character is secondary
- Composition: Wide-angle view, landscape composition, character occupies less than 20% of frame
- Examples: Character traveling, exploring new areas, entering locations, viewing landscapes, environmental changes, location transitions

DETAIL SHOT (Object/action-focused):
- Use when: The narrative focuses on specific objects, items, interactions with items, examining objects, or close-up moments
- Visual focus: Object/item is primary focus, character hands/partial view only
- Composition: Macro photography, extreme close-up, tight framing on specific element
- Examples: Character examining an artifact, picking up an item, reading a document, using an object, discovering something specific

DECISION MAKING:
- Analyze the narrative to identify the primary focus
- Consider what visual composition would best capture the narrative moment
- Choose the scene type that matches the narrative's emphasis
- Default to "wide-shot" if the focus is unclear (establishing context is safer than guessing)

Return your analysis and scene type recommendation with clear reasoning.`,
  inputSchema: z.object({
    currentNarrative: z
      .string()
      .describe(
        "Current narrative context from recent messages - analyze this to determine visual focus"
      ),
    characterAction: z
      .string()
      .describe(
        "The character's recent action or situation - helps identify what the character is doing"
      ),
    locationContext: z
      .string()
      .optional()
      .describe(
        "Current location from campaign state - helps identify if environment is the focus"
      ),
    sceneType: z
      .enum(["portrait", "wide-shot", "detail-shot"])
      .describe(
        "Your decision: the scene type that best matches the narrative's visual focus"
      ),
    reasoning: z
      .string()
      .describe(
        "Clear explanation of why you chose this scene type - what in the narrative led to this decision"
      ),
  }),
  execute: async ({
    currentNarrative,
    sceneType,
    reasoning,
  }: {
    currentNarrative: string;
    characterAction: string;
    locationContext?: string;
    sceneType: "portrait" | "wide-shot" | "detail-shot";
    reasoning: string;
  }) => {
    // Validate: Ensure narrative is not empty
    if (!currentNarrative || currentNarrative.trim().length === 0) {
      return {
        sceneType: "wide-shot" as const,
        reasoning:
          "No narrative context available - defaulting to wide-shot for establishing context.",
      };
    }

    // Return the model's decision (validated enum)
    return {
      sceneType,
      reasoning,
    };
  },
});

/**
 * Decision tool to determine if a new scene should be generated
 * CONSERVATIVE GENERATION: Only generates after complete narrative moments.
 * Defers generation when narrative is in intermediate states (e.g., skill check requested but outcome pending).
 */
export const shouldGenerateSceneTool = tool({
  description: `Analyze recent narrative changes to determine if a new scene should be generated. 

This tool MUST be called FIRST on every execution. You must analyze the narrative context and make a decision about whether scene generation is warranted.

ANALYSIS PROCESS:
1. Extract narrative text from recent messages (text parts and formatNarrativeTool narration segments)
2. Analyze the narrative for completeness and significant changes
3. Consider the character's action and current location context
4. Compare with previous narrative if available
5. Make a decision based on your analysis

CONSERVATIVE GENERATION PRINCIPLES:
- Only generate after COMPLETE narrative moments (e.g., after skill check outcomes are fully explained with consequences)
- DEFER generation when narrative is in intermediate states:
  * Skill check requested but outcome not yet explained (no success/failure mentioned)
  * Actions in progress without resolution (e.g., "begins to", "attempts to", "is about to" without completion)
  * Pending consequences or incomplete actions

GENERATION TRIGGERS - Generate when you detect:
- Location changes: Character moves to new area, enters building, travels, pursues, heads toward new location
- Environmental changes: Rituals, chants, whispers, storms, fires, battles, discoveries, revelations, dramatic shifts
- Combat/action: Clashes, battles, fights, confrontations, weapons, combat sequences
- Discoveries: Found items, revealed secrets, uncovered clues, learned information, map fragments, artifacts
- NPC interactions: Significant dialogue, tribe interactions, elder conversations, rival encounters
- Time/setting changes: Dawn, dusk, weather shifts, lighting changes
- Narrative shifts: Significant change from previous scene (different location, different situation, different mood)
- Initial scenes: First scene generation for substantial narrative (>100 chars)

A "complete narrative moment" means:
- Skill checks have outcomes explained (success/failure with consequences)
- Actions are resolved (not just "begins to" but actually completed)
- Consequences are described (what happened as a result)
- The narrative segment is substantial and self-contained

DECISION MAKING:
- Analyze the narrative holistically - don't rely on specific keywords
- Consider the overall narrative flow and completeness
- Compare current narrative with previous scene to detect significant shifts
- If narrative is complete and has changed meaningfully, recommend generation
- If narrative is incomplete or intermediate, defer generation

Return your analysis and decision. Be specific in your reasoning about what you observed in the narrative.`,
  inputSchema: z.object({
    currentNarrative: z
      .string()
      .describe(
        "Current narrative context from recent messages - extract from text parts and formatNarrativeTool narration segments"
      ),
    previousNarrative: z
      .string()
      .optional()
      .describe(
        "Previous scene's narrative context for comparison - use to detect significant changes"
      ),
    currentLocation: z
      .string()
      .optional()
      .describe(
        "Current location from campaign state - helps identify location changes"
      ),
    characterAction: z
      .string()
      .describe(
        "The character's recent action or situation - helps identify what the character is doing"
      ),
    hasPendingSkillCheck: z
      .boolean()
      .optional()
      .describe(
        "Whether there is a pending skill check (requested but outcome not yet explained) - if true, always defer generation"
      ),
    shouldGenerate: z
      .boolean()
      .describe(
        "Your decision: true if scene should be generated, false if generation should be deferred"
      ),
    reasoning: z
      .string()
      .describe(
        "Clear explanation of your decision - what you observed in the narrative that led to this conclusion"
      ),
    reasons: z
      .array(z.string())
      .optional()
      .describe(
        "Specific reasons for generation (e.g., 'Location changed', 'Combat occurred', 'Discovery made') - only include if shouldGenerate is true"
      ),
  }),
  execute: async ({
    currentNarrative,
    hasPendingSkillCheck,
    shouldGenerate,
    reasoning,
    reasons,
  }: {
    currentNarrative: string;
    previousNarrative?: string;
    currentLocation?: string;
    characterAction: string;
    hasPendingSkillCheck?: boolean;
    shouldGenerate: boolean;
    reasoning: string;
    reasons?: string[];
  }) => {
    // Validate: If skill check is pending, always defer generation regardless of model's decision
    if (hasPendingSkillCheck === true) {
      return {
        shouldGenerate: false,
        reasoning:
          "Skill check is pending (requested but outcome not yet explained). Deferring generation until narrative moment is complete.",
        reasons: ["Pending skill check detected"],
      };
    }

    // Validate: Ensure narrative is not empty
    if (!currentNarrative || currentNarrative.trim().length === 0) {
      return {
        shouldGenerate: false,
        reasoning:
          "No narrative context available - cannot determine if generation is needed.",
        reasons: [],
      };
    }

    // Return the model's decision (validated)
    return {
      shouldGenerate,
      reasoning,
      reasons: reasons || [],
    };
  },
});

/**
 * Tool to craft detailed image generation prompts with scene type-specific composition
 */
export const generateImagePromptTool = tool({
  description: `Create a detailed, vivid image generation prompt that captures the current scene with scene type-specific composition guidance.

CRITICAL: This tool MUST be called AFTER determineSceneType. You MUST include the sceneType parameter from determineSceneType - do not guess or omit it.

Include:
- Scene type-appropriate composition (portrait: character-centered, wide-shot: environmental, detail-shot: focused)
- Character appearance and pose (when relevant)
- Environment and setting details (when relevant)
- Lighting and atmosphere
- Art style and composition
- Universe-specific visual elements
- Genre-appropriate aesthetics

The sceneType parameter is REQUIRED and must match the result from determineSceneType tool.`,
  inputSchema: z.object({
    characterAppearance: z
      .string()
      .optional()
      .describe("Character's physical appearance"),
    characterProfession: z
      .string()
      .optional()
      .describe("Character's profession/role"),
    currentNarrative: z
      .string()
      .describe("Current scene narrative description"),
    universeVisualStyle: z
      .string()
      .optional()
      .describe("Universe's visual description and ontology"),
    campaignGenres: z.array(z.string()).describe("Campaign genre tags"),
    locationContext: z
      .string()
      .optional()
      .describe("Specific location details"),
    sceneType: z
      .enum(["portrait", "wide-shot", "detail-shot"])
      .optional()
      .describe(
        "Scene type determined by determineSceneType tool (portrait, wide-shot, or detail-shot)"
      ),
    compositionGuidance: z
      .string()
      .optional()
      .describe(
        "Specific composition instructions based on scene type (e.g., 'centered composition, close-up framing' for portrait)"
      ),
  }),
  execute: async ({
    characterAppearance,
    characterProfession,
    currentNarrative,
    universeVisualStyle,
    campaignGenres,
    locationContext,
    sceneType,
    compositionGuidance,
  }: {
    characterAppearance?: string;
    characterProfession?: string;
    currentNarrative: string;
    universeVisualStyle?: string;
    campaignGenres: string[];
    locationContext?: string;
    sceneType?: "portrait" | "wide-shot" | "detail-shot";
    compositionGuidance?: string;
  }) => {
    // Infer scene type from narrative if not provided (default to wide-shot for variety)
    let inferredSceneType = sceneType;
    if (!inferredSceneType) {
      const narrativeLower = currentNarrative.toLowerCase();
      // Simple heuristics to infer scene type
      if (
        /(examines|touches|picks up|reads|uses|holds|grasps|studies|inspects|opens|closes|presses|turns|lifts|item|object|artifact)/i.test(
          narrativeLower
        )
      ) {
        inferredSceneType = "detail-shot";
      } else if (
        /(says|thinks|feels|reacts|expresses|speaks|whispers|shouts|smiles|frowns|gazes|stares|looks|emotion|dialogue|conversation)/i.test(
          narrativeLower
        )
      ) {
        inferredSceneType = "portrait";
      } else {
        // Default to wide-shot for variety (safer than portrait)
        inferredSceneType = "wide-shot";
      }
    }

    let prompt = "";
    let negativePrompt = "";

    // Scene type-specific prompt structure with explicit composition rules
    if (inferredSceneType === "portrait") {
      // Portrait: Character-centered, expressive, close-up framing
      // Lead with character appearance and expression
      if (characterAppearance) {
        prompt += `${characterAppearance}`;
        if (characterProfession) {
          prompt += `, a ${characterProfession.toLowerCase()}`;
        }
        prompt +=
          ", expressive face, close-up portrait, character-centered composition";
      }
      // Add narrative as background context
      if (currentNarrative) {
        prompt += `. ${currentNarrative} (environment as background context only, out of focus). `;
      }
      // Portrait-specific composition and camera instructions
      if (compositionGuidance) {
        prompt += `${compositionGuidance}. `;
      } else {
        prompt +=
          "Close-up shot, 85mm lens, shallow depth of field, character fills 70-80% of frame, centered composition, expressive lighting, character portrait. ";
      }
      // No negative prompt needed for portrait (this is the default)
    } else if (inferredSceneType === "wide-shot") {
      // Wide Shot: Environmental context, establishing view, landscape composition
      // Lead with location/environment description (NOT character)
      if (locationContext) {
        prompt += `${locationContext}, `;
      }
      // Narrative with environmental emphasis (lead with environment)
      prompt += `${currentNarrative}, `;
      // Character mentioned late as small element
      if (characterAppearance) {
        prompt += `small figure in distance (${characterAppearance}), character visible but NOT the focus, `;
      }
      // Wide shot-specific composition and camera instructions
      prompt +=
        "establishing shot, wide-angle lens (24mm), deep depth of field, landscape composition, environmental storytelling, rule of thirds, atmospheric depth. ";
      if (compositionGuidance) {
        prompt += `${compositionGuidance}. `;
      } else {
        prompt +=
          "Character occupies less than 20% of frame, environment is primary subject, environmental focus. ";
      }
      // Negative prompts to prevent portrait bias
      negativePrompt =
        "NOT a character portrait, NOT close-up, NOT character-focused, character is secondary element, avoid character filling frame";
    } else if (inferredSceneType === "detail-shot") {
      // Detail Shot: Object/action-focused, close-up framing, focused composition
      // Lead with object/action description (NOT character)
      prompt += `${currentNarrative}, `;
      // Character mentioned only if hands/partial view relevant
      if (characterAppearance) {
        prompt += `${characterAppearance} (hands/partial view only, character face NOT visible), `;
      }
      // Detail shot-specific composition and camera instructions
      prompt +=
        "macro photography, extreme close-up, macro lens, shallow depth of field, object/item is primary focus, tight framing on specific element, detail-oriented composition. ";
      if (compositionGuidance) {
        prompt += `${compositionGuidance}. `;
      } else {
        prompt +=
          "Object in sharp focus, character hands/partial view if relevant, character face not visible. ";
      }
      // Negative prompts to prevent portrait bias
      negativePrompt =
        "NOT a character portrait, NOT full body shot, NOT character face visible, NOT character-centered, avoid showing character's full face";
    } else {
      // Fallback: Default to wide-shot for variety (safer than portrait)
      if (locationContext) {
        prompt += `${locationContext}, `;
      }
      prompt += `${currentNarrative}, `;
      if (characterAppearance) {
        prompt += `small figure (${characterAppearance}), character visible but NOT the focus, `;
      }
      prompt +=
        "establishing shot, wide-angle view, environmental focus, landscape composition. ";
      negativePrompt =
        "NOT a character portrait, NOT close-up, character is secondary element";
    }

    // Add universe visual style
    if (universeVisualStyle) {
      prompt += `Visual style: ${universeVisualStyle}. `;
    }

    // Add genre-appropriate aesthetics
    const genreStyles = getGenreVisualStyles(campaignGenres);
    if (genreStyles.length > 0) {
      prompt += `Art style: ${genreStyles.join(", ")}. `;
    }

    // Add technical quality instructions
    prompt +=
      "Highly detailed digital art, cinematic lighting, professional illustration, vivid colors, atmospheric depth.";

    // Append negative prompt if present (some models support negative prompts)
    const finalPrompt = negativePrompt
      ? `${prompt.trim()} | Negative: ${negativePrompt}`
      : prompt.trim();

    return {
      prompt: finalPrompt,
      components: {
        character: characterAppearance || "Not specified",
        environment: locationContext || currentNarrative,
        style: universeVisualStyle || "Default fantasy style",
        genres: campaignGenres,
        sceneType: inferredSceneType || "default",
        composition: compositionGuidance || "standard",
        negativePrompt: negativePrompt || "none",
      },
    };
  },
});

/**
 * Factory function to create generateSceneImageTool with runId bound in closure
 * This allows the tool to be used without requiring the LLM to provide runId
 */
export function createGenerateSceneImageTool(runId: string) {
  return tool({
    description: `Generate a new scene image using the Replicate API and store it in the database. This tool handles the complete image generation workflow.`,
    inputSchema: z.object({
      prompt: z.string().describe("The crafted image generation prompt"),
      narrativeContext: z
        .string()
        .describe("The narrative context that triggered generation"),
      previousSceneId: z
        .string()
        .uuid()
        .optional()
        .describe("ID of the previous scene for transitions"),
    }),
    execute: async ({
      prompt,
      narrativeContext,
      previousSceneId,
    }: {
      prompt: string;
      narrativeContext: string;
      previousSceneId?: string;
    }) => {
      // Sanitize narrativeContext to remove reasoning text and internal instructions
      // Remove patterns like "[full narrative as above, but shortened for brevity, but use the full one]"
      // Also remove common reasoning patterns that models might include
      const sanitizedNarrativeContext = narrativeContext
        // Remove bracketed instructions/reasoning
        .replace(/\[.*?full.*?narrative.*?\]/gi, "")
        .replace(/\[.*?shortened.*?brevity.*?\]/gi, "")
        .replace(/\[.*?use.*?full.*?\]/gi, "")
        .replace(/\[.*?as above.*?\]/gi, "")
        .replace(/\[.*?but.*?use.*?\]/gi, "")
        .replace(/\[.*?internal.*?\]/gi, "")
        .replace(/\[.*?reasoning.*?\]/gi, "")
        .replace(/\[.*?note.*?\]/gi, "")
        .replace(/\[.*?instruction.*?\]/gi, "")
        // Remove parenthetical reasoning
        .replace(/\(.*?full.*?narrative.*?\)/gi, "")
        .replace(/\(.*?shortened.*?brevity.*?\)/gi, "")
        .replace(/\(.*?use.*?full.*?\)/gi, "")
        // Remove standalone reasoning phrases
        .replace(
          /full narrative as above, but shortened for brevity, but use the full one/gi,
          ""
        )
        .replace(/shortened for brevity/gi, "")
        .replace(/use the full one/gi, "")
        .replace(/as above/gi, "")
        // Clean up multiple spaces and trim
        .replace(/\s+/g, " ")
        .trim();

      try {
        // Import here to avoid circular dependencies
        const { createScenePrompt } = await import("@/lib/ai/scene-generator");
        const { createImagePrediction } = await import(
          "@/lib/ai/image-generator"
        );
        const { db } = await import("@/lib/db");
        const { scenes, runs } = await import("@/lib/db/schema");
        const { randomUUID } = await import("node:crypto");
        const { and, eq } = await import("drizzle-orm");

        // Query run to get userId and currentSceneId
        const [runData] = await db
          .select({
            userId: runs.userId,
            currentSceneId: runs.currentSceneId,
          })
          .from(runs)
          .where(eq(runs.id, runId))
          .limit(1);

        if (!runData) {
          throw new Error(`Run not found: ${runId}`);
        }

        // Generate scene ID first for use in metadata
        const sceneId = randomUUID();

        // Normalize previousSceneId: convert zero UUID, empty string, or invalid UUIDs to null
        const ZERO_UUID = "00000000-0000-0000-0000-000000000000";
        let normalizedPreviousSceneId: string | null = null;

        if (
          previousSceneId &&
          previousSceneId !== ZERO_UUID &&
          previousSceneId.trim() !== ""
        ) {
          // Validate that the previous scene exists and belongs to this run
          const [previousScene] = await db
            .select({ id: scenes.id })
            .from(scenes)
            .where(and(eq(scenes.id, previousSceneId), eq(scenes.runId, runId)))
            .limit(1);

          if (previousScene) {
            normalizedPreviousSceneId = previousSceneId;
          }
        }

        // If no valid previousSceneId, validate and use run's currentSceneId
        if (!normalizedPreviousSceneId && runData.currentSceneId) {
          // Validate that currentSceneId exists and belongs to this run
          const [currentScene] = await db
            .select({ id: scenes.id })
            .from(scenes)
            .where(
              and(
                eq(scenes.id, runData.currentSceneId),
                eq(scenes.runId, runId)
              )
            )
            .limit(1);

          if (currentScene) {
            normalizedPreviousSceneId = runData.currentSceneId;
          }
        }

        // Use null if still no valid previous scene (normal for first scene in run)
        const finalPreviousSceneId = normalizedPreviousSceneId || null;

        // Enhance the prompt with safety and quality checks
        let enhancedPrompt: string;
        try {
          enhancedPrompt = createScenePrompt(prompt);
        } catch (error) {
          console.error(
            "Scene generation failed - prompt validation error:",
            error
          );
          throw error;
        }

        // Construct webhook URL
        // Development: Use NGROK_HOST if available
        // Production: Use NEXT_PUBLIC_SITE_URL or WEBHOOK_BASE_URL
        let webhookBaseUrl: string | undefined;
        if (process.env.NGROK_HOST) {
          // Development with ngrok
          // Handle case where NGROK_HOST might already include protocol
          const ngrokHost = process.env.NGROK_HOST.trim();
          if (
            ngrokHost.startsWith("http://") ||
            ngrokHost.startsWith("https://")
          ) {
            webhookBaseUrl = ngrokHost;
          } else {
            webhookBaseUrl = `https://${ngrokHost}`;
          }
        } else if (process.env.NEXT_PUBLIC_SITE_URL) {
          // Production
          webhookBaseUrl = process.env.NEXT_PUBLIC_SITE_URL;
        } else if (process.env.WEBHOOK_BASE_URL) {
          // Alternative production URL
          webhookBaseUrl = process.env.WEBHOOK_BASE_URL;
        }

        if (!webhookBaseUrl) {
          console.warn(
            "[Scene Generation] Webhook URL not configured - falling back to synchronous generation"
          );
          // Fallback to synchronous generation (existing behavior)
          const { generateImage } = await import("@/lib/ai/scene-generator");
          const { uploadImage } = await import("@/lib/storage/r2");
          const { getPublicUrl } = await import("@/lib/storage/r2");

          const replicateImageUrl = await generateImage(enhancedPrompt);
          if (typeof replicateImageUrl !== "string" || !replicateImageUrl) {
            throw new Error(
              `Invalid image URL from Replicate: ${typeof replicateImageUrl}`
            );
          }

          const imageResponse = await fetch(replicateImageUrl);
          if (!imageResponse.ok) {
            throw new Error(
              `Failed to download image: ${imageResponse.status} ${imageResponse.statusText}`
            );
          }

          const arrayBuffer = await imageResponse.arrayBuffer();
          const imageBuffer = Buffer.from(arrayBuffer);
          const r2Key = `${runData.userId}/runs/${runId}/scenes/${sceneId}.webp`;
          const { key: storedKey } = await uploadImage(
            imageBuffer,
            r2Key,
            "image/webp"
          );
          const publicUrl = await getPublicUrl(storedKey);

          const newSceneResult = await db
            .insert(scenes)
            .values({
              id: sceneId,
              runId,
              sceneType: "environment",
              imageUrl: publicUrl,
              generationPrompt: enhancedPrompt,
              narrativeContext: sanitizedNarrativeContext,
              previousSceneId: finalPreviousSceneId,
            })
            .returning();

          const newScene = Array.isArray(newSceneResult)
            ? newSceneResult[0]
            : (newSceneResult as unknown as Scene[])[0];

          if (!newScene) {
            throw new Error("Failed to create scene record");
          }

          await db
            .update(runs)
            .set({ currentSceneId: newScene.id })
            .where(eq(runs.id, runId));

          revalidatePath(`/runs/${runId}/play`);

          return {
            success: true,
            sceneId: newScene.id,
            imageUrl: publicUrl,
            message: `Scene generated and stored successfully (synchronous fallback)`,
          };
        }

        const webhookUrl = `${webhookBaseUrl}/api/webhooks/replicate`;

        // Create scene record with pending state (imageUrl: null)
        const newSceneResult = await db
          .insert(scenes)
          .values({
            id: sceneId,
            runId,
            sceneType: "environment",
            imageUrl: null, // Pending state - will be updated by webhook
            generationPrompt: enhancedPrompt,
            narrativeContext,
            previousSceneId: finalPreviousSceneId,
          })
          .returning();

        // Handle both array and QueryResult return types
        const newScene = Array.isArray(newSceneResult)
          ? newSceneResult[0]
          : (newSceneResult as unknown as Scene[])[0];

        if (!newScene) {
          throw new Error("Failed to create scene record");
        }

        // Trigger non-blocking image generation with webhook
        // Emit scene-generation-started with actual scene ID
        // VEA's prepareStep should have already emitted a placeholder, but this confirms with real ID
        try {
          const { sseConnectionManager } = await import(
            "@/lib/sse/connection-manager"
          );
          await sseConnectionManager.broadcast(runId, {
            type: "scene-generation-started",
            data: {
              runId,
              sceneId: newScene.id,
              narrativeContext,
              placeholder: false,
            },
          });
        } catch (_broadcastError) {
          console.error("[Scene Generation] Failed to broadcast scene start", {
            runId,
            sceneId,
          });
        }

        const predictionId = await createImagePrediction(
          enhancedPrompt,
          webhookUrl,
          {
            runId,
            sceneId,
          }
        );

        // Update run's current scene immediately (non-blocking)
        await db
          .update(runs)
          .set({ currentSceneId: newScene.id })
          .where(eq(runs.id, runId));

        // Revalidate the play page to show the new scene (pending state)
        revalidatePath(`/runs/${runId}/play`);

        return {
          success: true,
          sceneId: newScene.id,
          predictionId,
          imageUrl: null, // Pending - will be updated via webhook
          message: `Scene generation triggered successfully (pending)`,
        };
      } catch (error) {
        console.error("Scene generation failed:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
          message: "Failed to generate scene image",
        };
      }
    },
  });
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get visual style descriptors for campaign genres
 */
function getGenreVisualStyles(genres: string[]): string[] {
  const styleMap: Record<string, string[]> = {
    fantasy: [
      "fantasy art",
      "medieval architecture",
      "magical elements",
      "detailed landscapes",
    ],
    sci_fi: [
      "futuristic",
      "cyberpunk",
      "high-tech",
      "neon lighting",
      "metallic surfaces",
    ],
    horror: [
      "dark atmosphere",
      "shadowy lighting",
      "eerie environments",
      "ominous mood",
    ],
    mystery: [
      "noir lighting",
      "intriguing compositions",
      "atmospheric depth",
      "subtle details",
    ],
    modern: [
      "contemporary",
      "realistic lighting",
      "urban environments",
      "clean lines",
    ],
    historical: [
      "period accurate",
      "authentic costumes",
      "historical architecture",
      "aged appearance",
    ],
    western: [
      "dusty landscapes",
      "saloon interiors",
      "period clothing",
      "dramatic lighting",
    ],
    super_hero: [
      "dynamic poses",
      "bright colors",
      "heroic composition",
      "action-oriented",
    ],
  };

  const styles: string[] = [];
  for (const genre of genres) {
    const genreStyles = styleMap[genre.toLowerCase()];
    if (genreStyles) {
      styles.push(...genreStyles);
    }
  }

  // Remove duplicates and return
  return [...new Set(styles)];
}
