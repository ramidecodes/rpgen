import { ToolLoopAgent, stepCountIs } from "ai";
import {
  shouldGenerateSceneTool,
  determineSceneTypeTool,
  generateImagePromptTool,
  createGenerateSceneImageTool,
} from "@/lib/ai/tools";
import { getOpenRouterClient, getTextModel } from "@/lib/ai/provider";
import type { CampaignState } from "@/lib/db/schemas/campaign";
import type { Character, Universe, Campaign, Scene } from "@/lib/db/schema";
import type { UIMessage } from "@/types/ui-message";
import { isTextUIPart } from "@/types/ui-message";
import {
  isNarrativeToolPart,
  extractNarrativeData,
  type NarrativeToolPart,
} from "@/types/narrative";

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
  determineSceneType: typeof determineSceneTypeTool;
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

  // Create the ToolLoopAgent
  const agent = new ToolLoopAgent({
    model,
    instructions: systemPrompt,
    tools,

    // Only allow scene-related tools
    activeTools: [
      "shouldGenerateScene",
      "determineSceneType",
      "generateImagePrompt",
      "generateSceneImage",
    ],

    // Stop conditions for background processing
    stopWhen: [
      // Stop after limited tool cycles (4 max for background processing)
      // Workflow: shouldGenerateScene → determineSceneType → generateImagePrompt → generateSceneImage
      stepCountIs(4),
    ],

    // Note: scene-generation-started event is emitted by the generateSceneImage tool itself
    // with the real scene ID after the scene record is created. No need to emit from prepareStep.
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
2. MANDATORY WORKFLOW: You MUST follow this exact sequence on EVERY execution:
   a) ALWAYS call shouldGenerateScene tool FIRST - this is REQUIRED on every run
   b) Extract narrative text from the recent messages (look for text parts and formatNarrativeTool parts with narration segments)
   c) If shouldGenerateScene returns shouldGenerate: true, proceed to step (d)
   d) Call determineSceneType tool - this is REQUIRED before generateImagePrompt
   e) Call generateImagePrompt tool with the scene type from determineSceneType
   f) Call generateSceneImage tool with the generated prompt
   g) If shouldGenerateScene returns shouldGenerate: false, stop processing
3. NARRATIVE EXTRACTION: To extract current narrative from messages:
   - Look at the most recent assistant messages
   - Extract text from text parts (type: "text")
   - Extract narration segments from formatNarrativeTool parts (type: "tool-call", toolName: "formatNarrative")
   - Combine all narration text into a single narrative string
   - Use this narrative string as the currentNarrative parameter for shouldGenerateScene
4. CONSERVATIVE GENERATION: Only generate after COMPLETE narrative moments.
   - Wait for complete narrative moments before generating (e.g., after skill check outcomes are fully explained with consequences)
   - Avoid generating during intermediate states (e.g., when skill check is requested but outcome pending)
   - Prioritize narrative completeness over frequency
   - The shouldGenerateScene tool will handle intermediate state detection automatically
5. CRITICAL: If generation is approved, you MUST use determineSceneType tool BEFORE generateImagePrompt.
   - This step is REQUIRED - do not skip it or guess the scene type
   - The scene type determines the entire composition and focus of the image
   - Pass the scene type result to generateImagePrompt tool
6. Craft a detailed prompt with generateImagePrompt tool, ALWAYS including the scene type from determineSceneType.
7. Finally, use generateSceneImage tool to create and store the image.
8. Stop processing after completing the workflow or determining no generation is needed.

EXAMPLES OF WHEN TO GENERATE:
- After a successful skill check with full narrative consequences (e.g., "You draw the shard, lips forming the ancient words... The whispers shriek in discord, recoiling...")
- When the character moves to a new location (e.g., "Pursue the fleeing rival leader toward the Thicket")
- After major narrative events with complete resolution (e.g., "Prepare the tribe for rival incursion" with successful outcome)
- When the environment dramatically changes (e.g., entering a new area, weather changes, time of day shifts)

SCENE COMPOSITION GUIDELINES (STRICT ENFORCEMENT):

PORTRAIT (Character-focused):
- Use for: Dialogue, emotional reactions, character development, expressions
- Composition: Character-centered, close-up framing (85mm lens), character fills 70-80% of frame
- Focus: Character's face and expression are primary subject
- Environment: Background context only, out of focus
- Example: "Character's expressive face in close-up, environment blurred in background"

WIDE SHOT (Environment-focused):
- Use for: Exploration, travel, location changes, environmental storytelling, establishing scenes
- Composition: Wide-angle view (24mm lens), landscape composition, character occupies LESS than 20% of frame
- Focus: Environment and location are primary subject, character is secondary element
- Character: Small figure in distance, visible but NOT the focus
- Negative: NOT a character portrait, NOT close-up, character is secondary element
- Example: "Vast landscape with small figure in distance, environment dominates frame"

DETAIL SHOT (Object/action-focused):
- Use for: Object interactions, items, specific elements, close-up moments
- Composition: Macro photography, extreme close-up, tight framing on specific element
- Focus: Object/item is primary focus, character hands/partial view only
- Character: Character face NOT visible, only hands/partial view if relevant
- Negative: NOT a character portrait, NOT full body shot, character face not visible
- Example: "Close-up of object being examined, character's hands visible but face not shown"

COST OPTIMIZATION:
- Only generate when scenes have dramatically changed
- Avoid redundant generations of similar scenes
- Use efficient prompts that capture essential visual elements
- Conservative generation reduces unnecessary costs by waiting for complete narrative moments

OUTPUT: Use tools only. No text responses.`;
}

function createVisualEngineTools(
  runId: string,
  _options: VisualEngineAgentOptions
): VisualEngineTools {
  // Create tools with runId bound directly at creation time
  return {
    shouldGenerateScene: shouldGenerateSceneTool,
    determineSceneType: determineSceneTypeTool,
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
  if (
    !Array.isArray(lastAssistantMessage.parts) ||
    lastAssistantMessage.parts.length === 0
  ) {
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

  // Also check for formatNarrativeTool parts
  // This handles the new structured narrative format
  for (const part of lastAssistantMessage.parts) {
    if (isNarrativeToolPart(part)) {
      const extracted = extractNarrativeData(part as NarrativeToolPart);
      if (extracted && extracted.segments.length > 0) {
        // Check if there are any narration segments
        const hasNarration = extracted.segments.some(
          (seg) => seg.type === "narration"
        );
        if (hasNarration) {
          return true;
        }
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
