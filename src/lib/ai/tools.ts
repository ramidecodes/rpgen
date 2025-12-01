import { tool } from "ai";
import { z } from "zod";
import type { CampaignState } from "@/lib/db/schemas/campaign";

// --- World Mutation Tools (Server-side execution) ---

export const updateNarrativeVectorTool = tool({
  description:
    "Shift the abstract mood of the campaign by adjusting Hope and Chaos levels",
  parameters: z.object({
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
  execute: async ({ hopeDelta, chaosDelta }, { state }) => {
    const campaignState = state as CampaignState;
    const newHope = Math.max(
      0,
      Math.min(1, campaignState.narrativeVectors.hope + hopeDelta)
    );
    const newChaos = Math.max(
      0,
      Math.min(1, campaignState.narrativeVectors.chaos + chaosDelta)
    );
    campaignState.narrativeVectors.hope = newHope;
    campaignState.narrativeVectors.chaos = newChaos;
    return {
      success: true,
      newHope,
      newChaos,
      message: `Narrative vectors updated: Hope=${newHope.toFixed(2)}, Chaos=${newChaos.toFixed(2)}`,
    };
  },
});

export const manageRelationshipTool = tool({
  description:
    "Update or create an edge in the Knowledge Graph representing a relationship between entities",
  parameters: z.object({
    sourceId: z.string().describe("ID of the source node"),
    targetId: z.string().describe("ID of the target node"),
    relationType: z
      .string()
      .describe("Type of relationship (e.g., 'hates', 'loves', 'allied_with')"),
    value: z
      .number()
      .min(0)
      .max(1)
      .describe("Strength/weight of the relationship (0-1)"),
  }),
  execute: async ({ sourceId, targetId, relationType, value }, { state }) => {
    const campaignState = state as CampaignState;
    const existingEdgeIndex = campaignState.knowledgeGraph.edges.findIndex(
      (e) => e.source === sourceId && e.target === targetId
    );
    if (existingEdgeIndex >= 0) {
      campaignState.knowledgeGraph.edges[existingEdgeIndex].relation =
        relationType;
      campaignState.knowledgeGraph.edges[existingEdgeIndex].weight = value;
    } else {
      campaignState.knowledgeGraph.edges.push({
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
});

export const advanceFrontTool = tool({
  description: "Move a plot threat (Front) forward by advancing its doom clock",
  parameters: z.object({
    frontId: z.string().describe("ID or name of the Front to advance"),
    steps: z
      .number()
      .int()
      .min(1)
      .max(3)
      .describe("Number of steps to advance the doom clock"),
  }),
  execute: async ({ frontId, steps }, { state }) => {
    const campaignState = state as CampaignState;
    const front = campaignState.activeFronts.find(
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
      message: `Front "${front.name}" advanced to ${front.doomClock}/${front.maxDoom}${isDoomed ? " - DOOM TRIGGERED!" : ""}`,
    };
  },
});

export const createQuestTool = tool({
  description: "Open a new narrative thread or objective",
  parameters: z.object({
    title: z.string().describe("Title of the quest"),
    description: z.string().describe("Description of the quest objective"),
    type: z
      .string()
      .optional()
      .describe("Type of quest (e.g., 'main', 'side', 'mystery')"),
  }),
  execute: async ({ title, description, type }, { state }) => {
    const campaignState = state as CampaignState;
    campaignState.questThreads.push({
      title,
      description,
      status: "active",
      clues: [],
    });
    return {
      success: true,
      message: `Quest "${title}" created`,
    };
  },
});

export const logEventTool = tool({
  description: "Record a significant event in the campaign history",
  parameters: z.object({
    description: z.string().describe("Description of the event"),
    type: z
      .string()
      .optional()
      .describe("Type of event (e.g., 'combat', 'social', 'discovery')"),
    importance: z
      .enum(["low", "medium", "high", "critical"])
      .optional()
      .describe("Importance level of the event"),
  }),
  execute: async ({ description, type, importance }, { state }) => {
    // For now, we'll store events in the currentContext or could extend the schema
    const campaignState = state as CampaignState;
    const eventLog = `[${type || "general"}] ${description} (${importance || "medium"})`;
    campaignState.currentContext = campaignState.currentContext
      ? `${campaignState.currentContext}\n\n${eventLog}`
      : eventLog;
    return {
      success: true,
      message: `Event logged: ${description}`,
    };
  },
});

// --- Interactive Tools (HITL - Client triggers) ---

export const requestSkillCheckTool = tool({
  description:
    "Request a skill check from the player. This pauses the narrative until the player rolls the dice.",
  parameters: z.object({
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
});

// Factory function to create tools with state context
export function createGameMasterTools(state: CampaignState) {
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
    questThreads: Array.isArray(state.questThreads) ? state.questThreads : [],
    knowledgeGraph: {
      nodes: Array.isArray(state.knowledgeGraph?.nodes)
        ? state.knowledgeGraph.nodes
        : [],
      edges: Array.isArray(state.knowledgeGraph?.edges)
        ? state.knowledgeGraph.edges
        : [],
    },
    currentContext:
      typeof state.currentContext === "string"
        ? state.currentContext
        : undefined,
  };

  return {
    updateNarrativeVector: tool({
      description:
        "Shift the abstract mood of the campaign by adjusting Hope and Chaos levels",
      parameters: z.object({
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
      execute: async (params) => {
        return await updateNarrativeVectorTool.execute(params, {
          state: validatedState,
        });
      },
    }),
    manageRelationship: tool({
      description:
        "Update or create an edge in the Knowledge Graph representing a relationship between entities",
      parameters: z.object({
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
      execute: async (params) => {
        return await manageRelationshipTool.execute(params, {
          state: validatedState,
        });
      },
    }),
    advanceFront: tool({
      description:
        "Move a plot threat (Front) forward by advancing its doom clock",
      parameters: z.object({
        frontId: z.string().describe("ID or name of the Front to advance"),
        steps: z
          .number()
          .int()
          .min(1)
          .max(3)
          .describe("Number of steps to advance the doom clock"),
      }),
      execute: async (params) => {
        return await advanceFrontTool.execute(params, {
          state: validatedState,
        });
      },
    }),
    createQuest: tool({
      description: "Open a new narrative thread or objective",
      parameters: z.object({
        title: z.string().describe("Title of the quest"),
        description: z.string().describe("Description of the quest objective"),
        type: z
          .string()
          .optional()
          .describe("Type of quest (e.g., 'main', 'side', 'mystery')"),
      }),
      execute: async (params) => {
        return await createQuestTool.execute(params, { state: validatedState });
      },
    }),
    logEvent: tool({
      description: "Record a significant event in the campaign history",
      parameters: z.object({
        description: z.string().describe("Description of the event"),
        type: z
          .string()
          .optional()
          .describe("Type of event (e.g., 'combat', 'social', 'discovery')"),
        importance: z
          .enum(["low", "medium", "high", "critical"])
          .optional()
          .describe("Importance level of the event"),
      }),
      execute: async (params) => {
        return await logEventTool.execute(params, { state: validatedState });
      },
    }),
    requestSkillCheck: requestSkillCheckTool, // HITL tool - no execute
  };
}

// Export all tools as a tools object for use with streamText (without state - for reference)
export const gameMasterTools = {
  updateNarrativeVector: updateNarrativeVectorTool,
  manageRelationship: manageRelationshipTool,
  advanceFront: advanceFrontTool,
  createQuest: createQuestTool,
  logEvent: logEventTool,
  requestSkillCheck: requestSkillCheckTool,
};

export type GameMasterTools = typeof gameMasterTools;
