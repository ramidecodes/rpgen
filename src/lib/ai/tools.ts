import { tool } from "ai";
import { z } from "zod";
import type { CampaignState } from "@/lib/db/schemas/campaign";

// --- Interactive Tools (HITL - Client triggers) ---

export const requestSkillCheckTool = tool({
  description:
    "Request a skill check from the player. This pauses the narrative until the player rolls the dice.",
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
      description: `Adjust the campaign's narrative mood by changing Hope and Chaos levels. Use this when:
- Player actions significantly impact the world's state
- Major victories or defeats occur
- The tone of the campaign shifts meaningfully
- Hope: Increase when players succeed heroically, save lives, or restore order. Decrease when they fail critically or despair grows.
- Chaos: Increase when things spiral out of control, violence escalates, or order breaks down. Decrease when stability is restored.
Make meaningful changes (0.1-0.3 deltas) - small shifts matter. Don't adjust every turn.`,
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
      // @ts-expect-error - AI SDK v6 tool type inference issue, works correctly at runtime
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
      // @ts-expect-error - AI SDK v6 tool type inference issue, works correctly at runtime
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
      parameters: z.object({
        frontId: z.string().describe("ID or name of the Front to advance"),
        steps: z
          .number()
          .int()
          .min(1)
          .max(3)
          .describe("Number of steps to advance the doom clock"),
      }),
      // @ts-expect-error - AI SDK v6 tool type inference issue, works correctly at runtime
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
      description: `Create a new quest thread when the player discovers or accepts a new objective. Use this for:
- Main story objectives that drive the campaign forward
- Side quests that offer optional content
- Mystery threads that need investigation
- Player-initiated goals that become quests
Only create quests that are meaningful and relevant. Don't create duplicate quests.`,
      parameters: z.object({
        title: z.string().describe("Title of the quest"),
        description: z.string().describe("Description of the quest objective"),
        type: z
          .string()
          .optional()
          .describe("Type of quest (e.g., 'main', 'side', 'mystery')"),
      }),
      // @ts-expect-error - AI SDK v6 tool type inference issue, works correctly at runtime
      execute: async ({
        title,
        description,
      }: {
        title: string;
        description: string;
      }) => {
        validatedState.questThreads.push({
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
    }),
    logEvent: tool({
      description: `Log significant events that impact the world or story. Use this for:
- Major story beats and plot developments
- Important NPC interactions or revelations
- World-changing events (not routine actions)
- Discoveries that affect future gameplay
Use 'critical' sparingly - only for truly game-changing moments. Most events should be 'medium' or 'high'.`,
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
      // @ts-expect-error - AI SDK v6 tool type inference issue, works correctly at runtime
      execute: async ({
        description,
        type,
        importance,
      }: {
        description: string;
        type?: string;
        importance?: "low" | "medium" | "high" | "critical";
      }) => {
        const eventLog = `[${type || "general"}] ${description} (${
          importance || "medium"
        })`;
        validatedState.currentContext = validatedState.currentContext
          ? `${validatedState.currentContext}\n\n${eventLog}`
          : eventLog;
        return {
          success: true,
          message: `Event logged: ${description}`,
        };
      },
    }),
    requestSkillCheck: requestSkillCheckTool, // HITL tool - no execute
  };
}
