import { ToolLoopAgent, stepCountIs } from "ai";
import {
  shouldGenerateSceneTool,
  generateImagePromptTool,
  createGenerateSceneImageTool,
} from "@/lib/ai/tools";
import { getOpenRouterClient, getTextModel } from "@/lib/ai/provider";
import type { CampaignState } from "@/lib/db/schemas/campaign";
import type { Character, Universe, Campaign, Scene } from "@/lib/db/schema";
import type { UIMessage } from "@/types/ui-message";
import { isTextUIPart } from "@/types/ui-message";

// ============================================================================
// Types
// ============================================================================

export type VisualEngineAgentOptions = {
  runId: string;
  campaign: Campaign;
  character: Character;
  universe: Universe;
  campaignState: CampaignState;
  currentScene?: Scene | null;
  recentMessages: UIMessage[];
  characterAction?: string; // The most recent character action
};

export type VisualEngineAgent = {
  getAgent: () => ToolLoopAgent<never, VisualEngineTools, never>;
  getCampaignState: () => CampaignState;
  hasStateChanged: (originalState: CampaignState) => boolean;
};

// ============================================================================
// Tool Types
// ============================================================================

export type VisualEngineTools = {
  shouldGenerateScene: typeof shouldGenerateSceneTool;
  generateImagePrompt: typeof generateImagePromptTool;
  generateSceneImage: ReturnType<typeof createGenerateSceneImageTool>;
};

// ============================================================================
// Visual Engine Agent - Background Scene Generation Agent
// ============================================================================

/**
 * Creates a Visual Engine Agent (VEA) - Background agent for automatic scene image generation.
 *
 * Responsibilities:
 * - Monitors narrative changes from GM agent output
 * - Decides when scene regeneration is needed
 * - Crafts detailed image prompts with character/universe context
 * - Generates and stores scene images via Replicate API
 * - Updates run's current scene reference
 *
 * Key differences from GMA:
 * - No user-facing text output (background processing only)
 * - Limited tool cycles (3 max for efficiency)
 * - Uses BASE model for consistent decision making
 * - Focuses on visual content generation
 */
export function createVisualEngineAgent(
  options: VisualEngineAgentOptions
): VisualEngineAgent {
  const { campaignState } = options;
  const openrouter = getOpenRouterClient();
  const model = openrouter.chat(getTextModel("base"));

  // Build system prompt for background processing
  const systemPrompt = buildSystemPrompt(options);

  // Create tools with runId bound directly at creation time
  const tools = createVisualEngineTools(options.runId, options);

  // Track whether a start signal has been emitted this cycle
  let hasEmittedStart = false;
  const emitStart = async (sceneId?: string) => {
    if (hasEmittedStart) return;
    hasEmittedStart = true;
    const placeholderId = sceneId || `pending-${options.runId}-${Date.now()}`;
    try {
      const { sseConnectionManager } = await import(
        "@/lib/sse/connection-manager"
      );
      sseConnectionManager.broadcast(options.runId, {
        type: "scene-generation-started",
        data: {
          runId: options.runId,
          sceneId: placeholderId,
          narrativeContext: options.campaignState.currentContext,
          placeholder: !sceneId,
        },
      });
    } catch (error) {
      console.error("[VEA] Failed to broadcast generation start", error);
    }
  };

  // Create the ToolLoopAgent
  const agent = new ToolLoopAgent({
    model,
    instructions: systemPrompt,
    tools,

    // Only allow scene-related tools
    activeTools: [
      "shouldGenerateScene",
      "generateImagePrompt",
      "generateSceneImage",
    ],

    // Stop conditions for background processing
    stopWhen: [
      // Stop after limited tool cycles (3 max for background processing)
      stepCountIs(3),
    ],

    // Emit start when tools sequence begins
    prepareStep: async (context) => {
      const toolName = context?.step?.toolName;
      if (!hasEmittedStart && toolName) {
        await emitStart();
      }
    },
  });

  return {
    getAgent: () => agent,
    getCampaignState: () => campaignState,
    hasStateChanged: (originalState: CampaignState) =>
      JSON.stringify(campaignState) !== JSON.stringify(originalState),
  };
}

function buildSystemPrompt(options: VisualEngineAgentOptions): string {
  const { campaign, character, universe, campaignState, currentScene } =
    options;

  return `You are the Visual Engine Agent (VEA) - a background system for generating scene images.

UNIVERSE CONTEXT:
- Name: ${universe.name}
- Description: ${universe.description}
- Ontology: ${JSON.stringify(universe.ontology)}
- Visual Description: Not specified

CAMPAIGN CONTEXT:
- Name: ${campaign.name}
- Genres: ${campaign.genres.join(", ")}

CHARACTER CONTEXT:
- Name: ${character.name}
- Profession: ${character.properties?.profession || "Unknown"}
- Appearance: ${character.properties?.appearance || "Not specified"}

CURRENT STATE:
- Location: ${campaignState.currentContext || "Unknown"}
- Current Scene: ${currentScene ? "Exists" : "None"}

BACKGROUND PROCESSING INSTRUCTIONS:
1. You are NOT an interactive agent. Do not produce text responses or chat messages.
2. Analyze recent narrative changes to determine if scene regeneration is needed.
3. Only generate scenes when there are significant location or environment changes.
4. Use the shouldGenerateScene tool first to make the decision.
5. If generation is needed, craft a detailed prompt with generateImagePrompt tool.
6. Finally, use generateSceneImage tool to create and store the image.
7. Stop processing after completing the workflow or determining no generation is needed.

COST OPTIMIZATION:
- Only generate when scenes have dramatically changed
- Avoid redundant generations of similar scenes
- Use efficient prompts that capture essential visual elements

OUTPUT: Use tools only. No text responses.`;
}

function createVisualEngineTools(
  runId: string,
  _options: VisualEngineAgentOptions
): VisualEngineTools {
  // Create tools with runId bound directly at creation time
  return {
    shouldGenerateScene: shouldGenerateSceneTool,
    generateImagePrompt: generateImagePromptTool,
    generateSceneImage: createGenerateSceneImageTool(runId),
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if the latest assistant message contains meaningful narrative text.
 * Returns false if the message only contains tool calls without narrative text.
 * Uses simple heuristics to avoid unnecessary scene generation for tool-call-only messages.
 */
export function hasNarrativeText(messages: UIMessage[]): boolean {
  // Find the latest assistant message
  const lastAssistantMessage = messages
    .filter((msg) => msg.role === "assistant")
    .pop();

  // No assistant messages exist
  if (!lastAssistantMessage) {
    return false;
  }

  // Check if message has parts
  if (!Array.isArray(lastAssistantMessage.parts) || lastAssistantMessage.parts.length === 0) {
    return false;
  }

  // Check for text parts with non-empty content
  for (const part of lastAssistantMessage.parts) {
    if (isTextUIPart(part)) {
      const text = part.text.trim();
      // If we find at least one non-empty text part, there's narrative text
      if (text.length > 0) {
        return true;
      }
    }
  }

  // No non-empty text parts found (only tool calls or empty text)
  return false;
}

/**
 * Extract the character's most recent action from messages
 * Useful for determining if location/setting changes occurred
 */
export function extractCharacterAction(messages: UIMessage[]): string {
  // Get the most recent user message
  const lastUserMessage = messages.filter((msg) => msg.role === "user").pop();

  if (!lastUserMessage || !Array.isArray(lastUserMessage.parts)) {
    return "";
  }

  // Extract text from text parts
  const textParts: string[] = [];
  for (const part of lastUserMessage.parts) {
    if (isTextUIPart(part)) {
      textParts.push(part.text);
    }
  }

  return textParts.join(" ") || "";
}
