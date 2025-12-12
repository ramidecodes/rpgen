import { tool } from "ai";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import type { CampaignState } from "@/lib/db/schemas/campaign";
import type { Scene } from "@/lib/db/schema";

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
      description: `Create a new quest thread when the player discovers or accepts a new objective. Use this for:
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
      inputSchema: z.object({
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

// ============================================================================
// Visual Engine Tools
// ============================================================================

/**
 * Decision tool to determine if a new scene should be generated
 */
export const shouldGenerateSceneTool = tool({
  description: `Analyze recent narrative changes to determine if a new scene should be generated. Consider:
- Has the scene location dramatically changed (entering a new area, city, building, etc.)?
- Has the environment significantly changed (weather, time of day, destruction, etc.)?
- Has the character moved to a completely different setting?
- Is the current scene image no longer appropriate for the narrative?
Return a boolean decision with clear reasoning.`,
  inputSchema: z.object({
    currentNarrative: z
      .string()
      .describe("Current narrative context from recent messages"),
    previousNarrative: z
      .string()
      .optional()
      .describe("Previous scene's narrative context for comparison"),
    currentLocation: z
      .string()
      .optional()
      .describe("Current location from campaign state"),
    characterAction: z
      .string()
      .describe("The character's recent action or situation"),
  }),
  execute: async ({
    currentNarrative,
    previousNarrative,
    currentLocation,
    characterAction,
  }: {
    currentNarrative: string;
    previousNarrative?: string;
    currentLocation?: string;
    characterAction: string;
  }) => {
    // Simple heuristic-based decision making
    // In a more sophisticated implementation, this could use embeddings or ML

    const reasons: string[] = [];

    // Check for location changes
    if (currentLocation) {
      const locationKeywords = [
        "entered",
        "arrived",
        "moved to",
        "travelled to",
        "found themselves in",
      ];
      const hasLocationChange = locationKeywords.some((keyword) =>
        characterAction.toLowerCase().includes(keyword.toLowerCase())
      );
      if (hasLocationChange) {
        reasons.push("Character has moved to a new location");
      }
    }

    // Check for dramatic environmental changes
    const environmentKeywords = [
      "storm",
      "fire",
      "explosion",
      "earthquake",
      "flood",
      "battlefield",
      "destroyed",
      "ruins",
    ];
    const hasEnvironmentChange = environmentKeywords.some((keyword) =>
      currentNarrative.toLowerCase().includes(keyword.toLowerCase())
    );
    if (hasEnvironmentChange) {
      reasons.push("Environment has dramatically changed");
    }

    // Check for time/setting changes
    const timeKeywords = [
      "dawn",
      "sunrise",
      "sunset",
      "midnight",
      "night fell",
      "day broke",
    ];
    const hasTimeChange = timeKeywords.some((keyword) =>
      currentNarrative.toLowerCase().includes(keyword.toLowerCase())
    );
    if (hasTimeChange) {
      reasons.push(
        "Time of day or lighting conditions have changed significantly"
      );
    }

    // Compare with previous narrative if available
    if (previousNarrative && currentNarrative !== previousNarrative) {
      const similarity = calculateTextSimilarity(
        currentNarrative,
        previousNarrative
      );
      if (similarity < 0.3) {
        // Low similarity threshold
        reasons.push(
          "Narrative context has significantly changed from previous scene"
        );
      }
    }

    const shouldGenerate = reasons.length > 0;

    return {
      shouldGenerate,
      reasoning: shouldGenerate
        ? `Scene generation recommended: ${reasons.join(", ")}`
        : "Scene generation not needed: No significant changes detected in location, environment, or narrative context",
      reasons,
    };
  },
});

/**
 * Tool to craft detailed image generation prompts
 */
export const generateImagePromptTool = tool({
  description: `Create a detailed, vivid image generation prompt that captures the current scene. Include:
- Character appearance and pose
- Environment and setting details
- Lighting and atmosphere
- Art style and composition
- Universe-specific visual elements
- Genre-appropriate aesthetics`,
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
  }),
  execute: async ({
    characterAppearance,
    characterProfession,
    currentNarrative,
    universeVisualStyle,
    campaignGenres,
    locationContext,
  }: {
    characterAppearance?: string;
    characterProfession?: string;
    currentNarrative: string;
    universeVisualStyle?: string;
    campaignGenres: string[];
    locationContext?: string;
  }) => {
    let prompt = "";

    // Start with character focus if available
    if (characterAppearance) {
      prompt += `${characterAppearance}`;
      if (characterProfession) {
        prompt += `, a ${characterProfession.toLowerCase()}`;
      }
      prompt += ". ";
    }

    // Add location and environment
    if (locationContext) {
      prompt += `${locationContext}. `;
    }

    // Add narrative scene description
    prompt += `${currentNarrative}. `;

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

    return {
      prompt: prompt.trim(),
      components: {
        character: characterAppearance || "Not specified",
        environment: locationContext || currentNarrative,
        style: universeVisualStyle || "Default fantasy style",
        genres: campaignGenres,
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
      try {
        // Import here to avoid circular dependencies
        const { generateImage, createScenePrompt } = await import(
          "@/lib/ai/scene-generator"
        );
        const { db } = await import("@/lib/db");
        const { scenes, runs } = await import("@/lib/db/schema");
        const { uploadImage } = await import("@/lib/storage/r2");
        const { randomUUID } = await import("node:crypto");

        // Query run to get userId for R2 path
        const [runData] = await db
          .select({ userId: runs.userId })
          .from(runs)
          .where(eq(runs.id, runId))
          .limit(1);

        if (!runData) {
          throw new Error(`Run not found: ${runId}`);
        }

        const userId = runData.userId;

        // Generate scene ID first for use in R2 path
        const sceneId = randomUUID();

        // Enhance the prompt with safety and quality checks
        let enhancedPrompt: string;
        try {
          enhancedPrompt = createScenePrompt(prompt);
        } catch (error) {
          console.error(
            "Scene generation failed - prompt validation error:",
            error
          );
          console.error("Original prompt length:", prompt.length);
          console.error("Original prompt preview:", prompt.substring(0, 200));
          throw error;
        }

        // Generate the image from Replicate
        const replicateImageUrl = await generateImage(enhancedPrompt);

        // Ensure we have a valid URL string
        if (typeof replicateImageUrl !== "string" || !replicateImageUrl) {
          throw new Error(
            `Invalid image URL from Replicate: ${typeof replicateImageUrl}`
          );
        }

        // Download image from Replicate URL
        const imageResponse = await fetch(replicateImageUrl);
        if (!imageResponse.ok) {
          throw new Error(
            `Failed to download image from Replicate: ${imageResponse.status} ${imageResponse.statusText}`
          );
        }

        const arrayBuffer = await imageResponse.arrayBuffer();
        const imageBuffer = Buffer.from(arrayBuffer);

        // Construct R2 storage key: <user-id>/runs/<run-id>/scenes/<scene-id>.webp
        const r2Key = `${userId}/runs/${runId}/scenes/${sceneId}.webp`;

        // Upload image to R2
        const { key: storedKey } = await uploadImage(
          imageBuffer,
          r2Key,
          "image/webp"
        );

        // Create scene record in database with R2 key (not URL)
        const newSceneResult = await db
          .insert(scenes)
          .values({
            id: sceneId, // Use the pre-generated ID
            runId,
            sceneType: "environment",
            imageUrl: storedKey, // Store R2 key, not URL
            generationPrompt: enhancedPrompt,
            narrativeContext,
            previousSceneId: previousSceneId || null,
          })
          .returning();

        // Handle both array and QueryResult return types
        const newScene = Array.isArray(newSceneResult)
          ? newSceneResult[0]
          : (newSceneResult as unknown as Scene[])[0];

        if (!newScene) {
          throw new Error("Failed to create scene record");
        }

        // Update run's current scene
        await db
          .update(runs)
          .set({ currentSceneId: newScene.id })
          .where(eq(runs.id, runId));

        // Revalidate the play page to show the new scene
        revalidatePath(`/runs/${runId}/play`);

        return {
          success: true,
          sceneId: newScene.id,
          imageUrl: storedKey, // Return R2 key
          message: `Scene generated and stored successfully`,
        };
      } catch (error) {
        console.error("Scene generation failed:", error);
        console.error("Prompt that failed:", prompt.substring(0, 300));
        console.error("Prompt length:", prompt.length);
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
 * Calculate simple text similarity for narrative comparison
 */
function calculateTextSimilarity(text1: string, text2: string): number {
  // Simple word overlap similarity
  const words1 = new Set(text1.toLowerCase().split(/\W+/));
  const words2 = new Set(text2.toLowerCase().split(/\W+/));

  const intersection = new Set([...words1].filter((x) => words2.has(x)));
  const union = new Set([...words1, ...words2]);

  return intersection.size / union.size;
}

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
