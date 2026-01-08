// ============================================================================
// CRITICAL: Load environment variables FIRST before any imports
// This prevents database module from failing when it checks for DATABASE_URL
// ============================================================================

import { config } from "dotenv";
import { resolve } from "node:path";
import { existsSync } from "node:fs";

// Load environment variables from .env.local BEFORE importing any modules
// This is critical because some modules (like @/lib/db) read process.env at module load time
const envPath = resolve(process.cwd(), ".env.local");

if (!existsSync(envPath)) {
  console.error(`❌ .env.local file not found at: ${envPath}`);
  console.error("Please ensure .env.local exists in the project root");
  process.exit(1);
}

const result = config({ path: envPath });

if (result.error) {
  console.error("❌ Error loading .env.local:", result.error);
  process.exit(1);
}

// CRITICAL: Set DATABASE_URL IMMEDIATELY after loading .env.local
// This must happen BEFORE any code that might trigger imports (including console.log)
// Some modules (like @/lib/db) check for DATABASE_URL at module load time
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = "postgresql://dummy:dummy@localhost:5432/dummy";
}

// Now safe to do console.log and other operations
const loadedVarCount = result.parsed ? Object.keys(result.parsed).length : 0;
console.log(`✅ Loaded .env.local from: ${envPath}`);
console.log(`   Found ${loadedVarCount} environment variables`);

if (
  process.env.DATABASE_URL === "postgresql://dummy:dummy@localhost:5432/dummy"
) {
  console.log(
    "⚠️  DATABASE_URL not set in .env.local, using dummy value (DB operations will be skipped)"
  );
}

console.log();

// Now we can safely import modules that might use the database
// Note: DATABASE_URL must be set above before these imports
import type { Campaign, Character, Universe } from "@/lib/db/schema";
import type { CampaignState } from "@/lib/db/schemas/campaign";
import type { UIMessage } from "@/types/ui-message";
import type { NarrativeToolPart } from "@/types/narrative";

// ============================================================================
// Types
// ============================================================================

type TestScenario = {
  id: number;
  narrative: string;
  expectedSceneType: "portrait" | "wide-shot" | "detail-shot" | "unknown";
  description: string;
};

type TestResult = {
  scenario: TestScenario;
  success: boolean;
  executionTime: number;
  toolCalls: Array<{
    toolName: string;
    args?: unknown;
    result?: unknown;
  }>;
  detectedSceneType?: "portrait" | "wide-shot" | "detail-shot";
  generatedPrompt?: string;
  reasoning?: string;
  replicatePredictionId?: string;
  replicateImageUrl?: string;
  error?: string;
};

type TestStats = {
  total: number;
  successful: number;
  failed: number;
  sceneTypeDistribution: {
    portrait: number;
    "wide-shot": number;
    "detail-shot": number;
    unknown: number;
  };
  averageExecutionTime: number;
  styleKeywordsFound: number;
};

// ============================================================================
// Environment Validation
// ============================================================================

// Validate required environment variables (after loading .env.local above)
const requiredVars = ["OPENROUTER_API_KEY"];
const missingVars = requiredVars.filter((varName) => !process.env[varName]);

if (missingVars.length > 0) {
  console.error("\n❌ Missing required environment variables:");
  missingVars.forEach((varName) => {
    console.error(`   - ${varName}`);
  });
  console.error("\nPlease ensure these are set in .env.local");
  process.exit(1);
}

// Check for REPLICATE_API_TOKEN if image generation might be used
const shouldGenerateImages =
  process.env.VEA_GENERATE_IMAGES === "true" ||
  process.argv.includes("--generate-images");

if (shouldGenerateImages && !process.env.REPLICATE_API_TOKEN) {
  console.error("\n❌ REPLICATE_API_TOKEN is required for image generation");
  console.error("   Please set REPLICATE_API_TOKEN in .env.local");
  console.error("   Or run without --generate-images flag\n");
  process.exit(1);
}

console.log("✅ All required environment variables are present");
if (shouldGenerateImages) {
  console.log("✅ REPLICATE_API_TOKEN is configured for image generation");
}
console.log();

// ============================================================================
// Mock Data Generation
// ============================================================================

function generateMockData(): {
  campaign: Campaign;
  character: Character;
  universe: Universe;
  campaignState: CampaignState;
  runId: string;
} {
  const runId = `test-run-${Date.now()}`;

  const campaign: Campaign = {
    id: "test-campaign-id",
    userId: "test-user-id",
    universeId: "test-universe-id",
    name: "Test Campaign: The Ancient Citadel",
    description: "A test campaign for VEA testing",
    genres: ["fantasy", "adventure"],
    coverImage: null,
    isPublic: false,
    likesCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const character: Character = {
    id: "test-character-id",
    userId: "test-user-id",
    universeId: "test-universe-id",
    name: "Test Character",
    stats: {
      strength: 14,
      agility: 12,
      intelligence: 16,
      scholarship: 13,
      intuition: 15,
    },
    properties: {
      profession: "Scholar-Adventurer",
      appearance:
        "A tall figure with dark hair and piercing blue eyes, wearing weathered leather armor and carrying an ancient tome",
      backstory: "A seeker of lost knowledge and forgotten truths",
      personalityTraits: ["curious", "determined", "cautious"],
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const universe: Universe = {
    id: "test-universe-id",
    userId: "test-user-id",
    name: "Test Universe: The Shattered Realms",
    description:
      "A world where ancient magic and forgotten civilizations lie buried beneath the sands of time",
    ontology: {
      timeframe: "Medieval Fantasy",
      magicLevel: "High Magic",
      physics: "Fantasy Physics",
      metaphysics: "Multiple Realms",
      socialStructure: "Feudal with Magical Orders",
    },
    coverImage: null,
    factions: null,
    locations: null,
    history:
      "Long ago, great civilizations ruled these lands, but they fell to ruin. Now, adventurers seek to uncover their secrets.",
    isPremade: false,
    isPublic: false,
    likesCount: 0,
    playCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const campaignState: CampaignState = {
    activeFronts: [
      {
        name: "The Rising Darkness",
        description: "Ancient evil stirs beneath the ruins",
        doomClock: 3,
        maxDoom: 8,
      },
    ],
    narrativeVectors: {
      hope: 0.6,
      chaos: 0.4,
    },
    knowledgeGraph: {
      nodes: [
        {
          id: "npc-1",
          type: "npc",
          label: "Elder Sage",
          description: "A wise keeper of ancient knowledge",
          data: null,
        },
      ],
      edges: [],
    },
    currentContext: "Ancient Ruins - Outer Chambers",
  };

  return {
    campaign,
    character,
    universe,
    campaignState,
    runId,
  };
}

// ============================================================================
// Test Scenario Generation
// ============================================================================

function generateTestScenarios(): TestScenario[] {
  const scenarios: TestScenario[] = [];

  // Portrait scenarios
  const portraitScenarios = [
    {
      narrative:
        "The character's face contorts with rage as they confront the betrayer, eyes burning with fury and hands clenched into fists.",
      description: "Emotional confrontation - rage",
    },
    {
      narrative:
        "A moment of quiet reflection, the character's eyes showing deep sorrow as they remember lost companions, tears welling up.",
      description: "Emotional moment - sorrow and reflection",
    },
    {
      narrative:
        "Dialogue exchange with an NPC, emotions clearly visible on the character's expressive face as they discuss the ancient prophecy.",
      description: "Dialogue scene with emotional expression",
    },
    {
      narrative:
        "The character's face lights up with sudden realization, eyes widening as they understand the hidden meaning behind the cryptic message.",
      description: "Character moment - realization",
    },
  ];

  // Wide shot scenarios
  const wideShotScenarios = [
    {
      narrative:
        "The character approaches the ancient citadel, its towers piercing the clouds, a small figure against the massive structure that dominates the horizon.",
      description: "Approaching large structure - establishing shot",
    },
    {
      narrative:
        "A vast desert landscape stretches before the character, who appears as a tiny figure in the distance, the endless dunes and scorching sun dominating the scene.",
      description: "Vast landscape - environmental focus",
    },
    {
      narrative:
        "The character travels through a dense forest, towering trees and undergrowth surrounding them, the environment filling the frame with ancient woodland.",
      description: "Forest exploration - environmental storytelling",
    },
    {
      narrative:
        "From the mountain peak, the character gazes upon the valley below, a sweeping vista of rolling hills and distant settlements visible in the golden hour light.",
      description: "Vista view - landscape composition",
    },
  ];

  // Detail shot scenarios
  const detailShotScenarios = [
    {
      narrative:
        "The character's hands carefully examine an ancient artifact, turning it over to reveal intricate runes carved into its surface, the object filling the frame.",
      description: "Object examination - close-up detail",
    },
    {
      narrative:
        "Close-up of a glowing rune being activated, the character's hands visible as they trace the magical symbols, light emanating from the intricate patterns.",
      description: "Rune activation - detail focus",
    },
    {
      narrative:
        "The character picks up a mysterious key, studying its intricate design and unusual shape, the metalwork clearly visible in sharp detail.",
      description: "Key examination - object detail",
    },
    {
      narrative:
        "The character's hands work to unlock an ancient mechanism, gears and cogs visible in extreme close-up as the mechanism slowly turns.",
      description: "Mechanism interaction - technical detail",
    },
  ];

  // Add portrait scenarios
  portraitScenarios.forEach((scenario) => {
    scenarios.push({
      id: scenarios.length + 1,
      narrative: scenario.narrative,
      expectedSceneType: "portrait",
      description: scenario.description,
    });
  });

  // Add wide shot scenarios
  wideShotScenarios.forEach((scenario) => {
    scenarios.push({
      id: scenarios.length + 1,
      narrative: scenario.narrative,
      expectedSceneType: "wide-shot",
      description: scenario.description,
    });
  });

  // Add detail shot scenarios
  detailShotScenarios.forEach((scenario) => {
    scenarios.push({
      id: scenarios.length + 1,
      narrative: scenario.narrative,
      expectedSceneType: "detail-shot",
      description: scenario.description,
    });
  });

  return scenarios;
}

// ============================================================================
// Message Conversion
// ============================================================================

async function convertUIMessagesToCoreMessages(
  messages: UIMessage[]
): Promise<Array<{ role: "system" | "user" | "assistant"; content: string }>> {
  // Dynamic imports to ensure DATABASE_URL is set before loading modules
  const { isTextUIPart } = await import("@/types/ui-message");
  const { isNarrativeToolPart, extractNarrativeData } = await import(
    "@/types/narrative"
  );

  return messages
    .filter((msg) => {
      // Only include system, user, assistant messages
      return (
        msg.role === "system" || msg.role === "user" || msg.role === "assistant"
      );
    })
    .map((msg) => {
      // Extract text from text parts
      const textParts: string[] = [];
      if (Array.isArray(msg.parts)) {
        for (const part of msg.parts) {
          if (isTextUIPart(part)) {
            const text = part.text.trim();
            if (text.length > 0) {
              textParts.push(text);
            }
          }
        }
      }

      // Also extract text from formatNarrativeTool parts
      // This handles the new structured narrative format
      const narrativeTextParts: string[] = [];
      if (Array.isArray(msg.parts)) {
        for (const part of msg.parts) {
          if (isNarrativeToolPart(part)) {
            const extracted = extractNarrativeData(part as NarrativeToolPart);
            if (extracted && extracted.segments.length > 0) {
              // Extract narration text from segments
              const narrationFromSegments = extracted.segments
                .filter((seg) => seg.type === "narration")
                .map((seg) => seg.text);
              narrativeTextParts.push(...narrationFromSegments);
            }
          }
        }
      }

      // Combine text parts and narrative text parts
      const allTextParts = [...textParts, ...narrativeTextParts];

      return {
        role: msg.role as "system" | "user" | "assistant",
        content: allTextParts.join(" ").trim() || "", // Join all parts, fallback to empty string
      };
    })
    .filter((msg) => msg.content.length > 0); // Remove empty messages
}

// ============================================================================
// Message Creation
// ============================================================================

function createMockMessages(narrative: string): UIMessage[] {
  return [
    {
      id: "test-user-message",
      role: "user",
      parts: [
        {
          type: "text",
          text: "I examine the scene carefully.",
        },
      ],
    },
    {
      id: "test-assistant-message",
      role: "assistant",
      parts: [
        {
          type: "text",
          text: narrative,
        },
      ],
    },
  ];
}

// ============================================================================
// Tool Result Extraction Helper
// ============================================================================

function extractToolResultData(
  toolName: string,
  result: unknown,
  callback: (data: {
    sceneType?: "portrait" | "wide-shot" | "detail-shot";
    prompt?: string;
    reasoning?: string;
  }) => void
): void {
  if (!result || typeof result !== "object") {
    return;
  }

  const toolResult = result as Record<string, unknown>;

  if (toolName === "determineSceneType") {
    const sceneType = toolResult.sceneType as
      | "portrait"
      | "wide-shot"
      | "detail-shot"
      | undefined;
    const reasoning = toolResult.reasoning as string | undefined;
    if (sceneType) {
      console.log(`   📐 Detected scene type: ${sceneType}`);
      callback({ sceneType, reasoning });
    }
  }

  if (toolName === "generateImagePrompt") {
    const prompt = toolResult.prompt as string | undefined;
    if (prompt) {
      console.log(`   📝 Generated prompt (${prompt.length} chars)`);
      callback({ prompt });
    }
  }

  if (toolName === "generateSceneImage") {
    const prompt = toolResult.prompt as string | undefined;
    if (prompt) {
      console.log(
        `   📝 Extracted prompt from generateSceneImage (${prompt.length} chars)`
      );
      callback({ prompt });
    }
  }
}

// ============================================================================
// VEA Execution
// ============================================================================

async function executeVEA(
  scenario: TestScenario,
  mockData: {
    campaign: Campaign;
    character: Character;
    universe: Universe;
    campaignState: CampaignState;
    runId: string;
  },
  shouldGenerateImages: boolean
): Promise<TestResult> {
  const startTime = Date.now();
  const toolCalls: TestResult["toolCalls"] = [];

  try {
    // Dynamic imports to ensure DATABASE_URL is set before loading modules
    // This prevents the database module from loading before env vars are ready
    const { createVisualEngineAgent } = await import("@/agents/visual-engine");

    // Create mock messages
    const messages = createMockMessages(scenario.narrative);

    // Create VEA
    const vea = createVisualEngineAgent({
      runId: mockData.runId,
      campaign: mockData.campaign,
      character: mockData.character,
      universe: mockData.universe,
      campaignState: mockData.campaignState,
      currentScene: null,
      recentMessages: messages,
      characterAction: "I examine the scene carefully.",
    });

    // Set test mode flag to prevent actual DB writes
    // The generateSceneImage tool will check this and skip DB operations
    // But we can still generate images if shouldGenerateImages is true
    const originalTestMode = process.env.VEA_TEST_MODE;
    process.env.VEA_TEST_MODE = "true";

    try {
      // Convert messages to CoreMessage format
      const coreMessages = await convertUIMessagesToCoreMessages(messages);

      // Execute agent
      const result = await vea.getAgent().generate({
        messages: coreMessages,
      });

      const executionTime = Date.now() - startTime;

      // Extract tool calls and results
      let detectedSceneType:
        | "portrait"
        | "wide-shot"
        | "detail-shot"
        | undefined;
      let generatedPrompt: string | undefined;
      let reasoning: string | undefined;
      let replicatePredictionId: string | undefined;
      let replicateImageUrl: string | undefined;

      // Track which tools were called
      const toolCallMap = new Map<
        string,
        { toolName: string; args?: unknown }
      >();

      if (result.steps && Array.isArray(result.steps)) {
        for (const step of result.steps) {
          // Use type assertion to access step properties safely
          const stepAny = step as Record<string, unknown>;

          // Check if step has toolCalls array (AI SDK v6 format)
          if (Array.isArray(stepAny.toolCalls)) {
            for (const toolCall of stepAny.toolCalls) {
              const toolCallAny = toolCall as Record<string, unknown>;
              if (toolCallAny.toolName) {
                const toolCallId = String(toolCallAny.toolCallId || "");
                const toolName = String(toolCallAny.toolName);
                toolCalls.push({
                  toolName,
                  args: toolCallAny.args,
                });
                if (toolCallId) {
                  toolCallMap.set(toolCallId, {
                    toolName,
                    args: toolCallAny.args,
                  });
                }
                console.log(`   🔧 Tool called: ${toolName}`);
              }
            }
          }

          // Check if step is a tool-call step (alternative format)
          if (stepAny.toolCallId && stepAny.toolName) {
            const toolCallId = String(stepAny.toolCallId);
            const toolName = String(stepAny.toolName);
            if (!toolCallMap.has(toolCallId)) {
              toolCalls.push({
                toolName,
                args: stepAny.args,
              });
              toolCallMap.set(toolCallId, { toolName, args: stepAny.args });
              console.log(`   🔧 Tool called (alt format): ${toolName}`);
            }
          }

          // Check if step has toolResults array (AI SDK v6 format)
          if (Array.isArray(stepAny.toolResults)) {
            for (const toolResult of stepAny.toolResults) {
              const toolResultAny = toolResult as Record<string, unknown>;
              const toolCallId = toolResultAny.toolCallId
                ? String(toolResultAny.toolCallId)
                : undefined;
              const toolCallInfo = toolCallId
                ? toolCallMap.get(toolCallId)
                : undefined;
              const toolName =
                toolCallInfo?.toolName ||
                (toolResultAny.toolName as string | undefined);

              if (toolName) {
                const matchingToolCall = toolCalls.find(
                  (tc) => tc.toolName === toolName && !tc.result
                );
                if (matchingToolCall) {
                  // The actual result is in toolResult.output (AI SDK v6 format)
                  const actualResult =
                    toolResultAny.output !== undefined
                      ? toolResultAny.output
                      : toolResultAny.result !== undefined
                      ? toolResultAny.result
                      : toolResultAny;
                  matchingToolCall.result = actualResult;

                  // Extract data from tool results
                  extractToolResultData(toolName, actualResult, (data) => {
                    if (data.sceneType) {
                      detectedSceneType = data.sceneType;
                    }
                    if (data.prompt) {
                      generatedPrompt = data.prompt;
                    }
                    if (data.reasoning) {
                      reasoning = data.reasoning;
                    }
                  });
                }
              }
            }
          }

          // Check if step is a tool-result step (alternative format)
          if (stepAny.result !== undefined) {
            const toolCallId = stepAny.toolCallId
              ? String(stepAny.toolCallId)
              : undefined;
            const toolCallInfo = toolCallId
              ? toolCallMap.get(toolCallId)
              : undefined;
            const toolName = toolCallInfo?.toolName;

            // Also try to match by checking the last tool call
            if (!toolName && toolCalls.length > 0) {
              const lastToolCall = toolCalls[toolCalls.length - 1];
              if (lastToolCall && !lastToolCall.result) {
                const actualResult =
                  stepAny.result !== undefined ? stepAny.result : stepAny;
                lastToolCall.result = actualResult;

                // Extract data from tool results
                extractToolResultData(
                  lastToolCall.toolName,
                  actualResult,
                  (data) => {
                    if (data.sceneType) {
                      detectedSceneType = data.sceneType;
                    }
                    if (data.prompt) {
                      generatedPrompt = data.prompt;
                    }
                    if (data.reasoning) {
                      reasoning = data.reasoning;
                    }
                  }
                );
              }
            } else if (toolName) {
              const matchingToolCall = toolCalls.find(
                (tc) => tc.toolName === toolName && !tc.result
              );
              if (matchingToolCall) {
                const actualResult =
                  stepAny.result !== undefined ? stepAny.result : stepAny;
                matchingToolCall.result = actualResult;

                // Extract data from tool results
                extractToolResultData(toolName, actualResult, (data) => {
                  if (data.sceneType) {
                    detectedSceneType = data.sceneType;
                  }
                  if (data.prompt) {
                    generatedPrompt = data.prompt;
                  }
                  if (data.reasoning) {
                    reasoning = data.reasoning;
                  }
                });
              }
            }
          }
        }
      }

      // Debug logging
      if (shouldGenerateImages) {
        console.log(
          `   🔍 Image generation check: shouldGenerateImages=${shouldGenerateImages}, hasPrompt=${!!generatedPrompt}`
        );
        if (!generatedPrompt) {
          console.log(
            `   ⚠️  No prompt extracted. Tool calls made: ${toolCalls
              .map((tc) => tc.toolName)
              .join(", ")}`
          );
        }
      }

      // If we have a prompt and should generate images, actually call Replicate
      if (shouldGenerateImages) {
        if (!generatedPrompt) {
          console.log(
            `   ⚠️  Image generation enabled but no prompt was generated`
          );
          console.log(
            `   💡 This might mean the VEA workflow didn't complete (shouldGenerateScene may have returned false)`
          );
        } else {
          try {
            // At this point, generatedPrompt is guaranteed to be defined (we're in the else block)
            const prompt = generatedPrompt;
            console.log(`\n   🎨 Generating image via Replicate API...`);
            console.log(`   📝 Prompt preview: ${prompt.substring(0, 150)}...`);
            // Log style keywords to verify comic-book style is present
            const styleKeywords = [
              "comic book",
              "graphic novel",
              "Moebius",
              "illustration",
              "illustrated",
            ];
            const promptLower = prompt.toLowerCase();
            const foundKeywords = styleKeywords.filter((keyword) =>
              promptLower.includes(keyword.toLowerCase())
            );
            if (foundKeywords.length > 0) {
              console.log(
                `   ✅ Comic-book style keywords found: ${foundKeywords.join(
                  ", "
                )}`
              );
            } else {
              console.log(
                `   ⚠️  Warning: No comic-book style keywords detected in prompt`
              );
            }
            // Check for photographic terms that should be avoided
            const photoTerms = [
              "photography",
              "photo",
              "cinematic",
              "8k",
              "artstation",
            ];
            const foundPhotoTerms = photoTerms.filter((term) =>
              promptLower.includes(term.toLowerCase())
            );
            if (foundPhotoTerms.length > 0) {
              console.log(
                `   ⚠️  Note: Found photographic/realistic terms: ${foundPhotoTerms.join(
                  ", "
                )}`
              );
            }

            // Import Replicate client and model
            const { getReplicateClient, getImageModel } = await import(
              "@/lib/ai/provider"
            );
            const replicate = getReplicateClient();
            const modelIdentifier = getImageModel();

            if (!replicate) {
              throw new Error("Replicate client is not initialized");
            }

            // Parse model identifier
            const modelParts = modelIdentifier.split(":");
            const modelName = modelParts[0] || modelIdentifier;
            const modelVersion = modelParts[1];

            // Prepare input parameters
            const predictionInput: Record<string, unknown> = {
              prompt: prompt.substring(0, 2000),
              go_fast: true,
              megapixels: "1",
              num_outputs: 1,
              aspect_ratio: "16:9",
              output_format: "webp",
              output_quality: 90,
              disable_safety_checker: true,
            };

            // Create prediction
            const predictionParams: {
              model: string;
              version?: string;
              input: Record<string, unknown>;
            } = {
              model: modelName,
              input: predictionInput,
            };

            if (modelVersion) {
              predictionParams.version = modelVersion;
            }

            console.log(
              `   📋 Model: ${modelName}${
                modelVersion ? ` (v${modelVersion})` : ""
              }`
            );

            const prediction = await replicate.predictions.create(
              predictionParams
            );

            if (!prediction.id) {
              throw new Error("Failed to create prediction - no ID returned");
            }

            replicatePredictionId = prediction.id;
            console.log(`   ✅ Prediction created!`);
            console.log(
              `   🔗 Dashboard: https://replicate.com/predictions/${prediction.id}`
            );
            console.log(`   📊 Status: ${prediction.status}`);

            // Poll for completion (non-blocking - prediction is visible in dashboard immediately)
            if (
              prediction.status === "starting" ||
              prediction.status === "processing"
            ) {
              console.log(
                `   ⏳ Polling for completion (check dashboard for real-time updates)...`
              );

              let completedPrediction = prediction;
              let pollCount = 0;
              const maxPolls = 30;

              while (
                completedPrediction.status === "starting" ||
                completedPrediction.status === "processing"
              ) {
                pollCount++;
                if (pollCount > maxPolls) {
                  console.log(
                    `   ⏱️  Still processing after ${
                      maxPolls * 2
                    }s - check dashboard`
                  );
                  break;
                }

                await new Promise((resolve) => setTimeout(resolve, 2000));
                completedPrediction = await replicate.predictions.get(
                  prediction.id
                );

                if (completedPrediction.status === "succeeded") {
                  const output = completedPrediction.output;
                  if (Array.isArray(output) && output.length > 0) {
                    replicateImageUrl = String(output[0]);
                  } else if (typeof output === "string") {
                    replicateImageUrl = output;
                  }
                  console.log(`   ✅ Image generated: ${replicateImageUrl}`);
                  break;
                } else if (completedPrediction.status === "failed") {
                  const errorMsg = completedPrediction.error
                    ? JSON.stringify(completedPrediction.error)
                    : "Unknown error";
                  console.error(`   ❌ Prediction failed: ${errorMsg}`);
                  break;
                } else {
                  console.log(
                    `   ⏳ ${completedPrediction.status} (${pollCount}/${maxPolls})...`
                  );
                }
              }
            } else if (prediction.status === "succeeded") {
              const output = prediction.output;
              if (Array.isArray(output) && output.length > 0) {
                replicateImageUrl = String(output[0]);
              } else if (typeof output === "string") {
                replicateImageUrl = output;
              }
              console.log(`   ✅ Image URL: ${replicateImageUrl}`);
            }
          } catch (imageError) {
            console.error(`   ❌ Image generation error:`);
            if (imageError instanceof Error) {
              console.error(`      ${imageError.message}`);
            } else {
              console.error(`      ${String(imageError)}`);
            }
          }
        }
      }

      return {
        scenario,
        success: true,
        executionTime,
        toolCalls,
        detectedSceneType,
        generatedPrompt,
        reasoning,
        replicatePredictionId,
        replicateImageUrl,
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      return {
        scenario,
        success: false,
        executionTime,
        toolCalls,
        error: error instanceof Error ? error.message : String(error),
      };
    } finally {
      // Restore original test mode setting
      if (originalTestMode !== undefined) {
        process.env.VEA_TEST_MODE = originalTestMode;
      } else {
        delete process.env.VEA_TEST_MODE;
      }
    }
  } catch (error) {
    const executionTime = Date.now() - startTime;
    return {
      scenario,
      success: false,
      executionTime,
      toolCalls,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// ============================================================================
// Result Formatting
// ============================================================================

function formatResults(results: TestResult[]): void {
  console.log(`\n${"=".repeat(80)}`);
  console.log("VEA TEST RESULTS");
  console.log(`${"=".repeat(80)}\n`);

  results.forEach((result) => {
    console.log(`Test ${result.scenario.id}: ${result.scenario.description}`);
    console.log("-".repeat(80));
    console.log(`Narrative: ${result.scenario.narrative.substring(0, 100)}...`);
    console.log(`Expected Scene Type: ${result.scenario.expectedSceneType}`);
    console.log(`Detected Scene Type: ${result.detectedSceneType || "N/A"}`);
    console.log(
      `Match: ${
        result.detectedSceneType === result.scenario.expectedSceneType
          ? "✅"
          : "❌"
      }`
    );
    console.log(`Execution Time: ${result.executionTime}ms`);
    console.log(`Success: ${result.success ? "✅" : "❌"}`);

    if (result.reasoning) {
      console.log(`\nReasoning: ${result.reasoning.substring(0, 200)}...`);
    }

    if (result.generatedPrompt) {
      const promptPreview = result.generatedPrompt.substring(0, 200);
      console.log(`\nGenerated Prompt Preview:\n${promptPreview}...`);
    }

    if (result.replicateImageUrl) {
      console.log(`\n🎨 Replicate Image URL: ${result.replicateImageUrl}`);
      console.log(
        `📊 View in Dashboard: https://replicate.com/predictions (search for the URL)`
      );
    }

    if (result.replicatePredictionId) {
      console.log(
        `\n🆔 Replicate Prediction ID: ${result.replicatePredictionId}`
      );
      console.log(
        `📊 View in Dashboard: https://replicate.com/predictions/${result.replicatePredictionId}`
      );
    }

    if (result.toolCalls.length > 0) {
      console.log(`\nTool Execution Flow:`);
      result.toolCalls.forEach((toolCall, index) => {
        console.log(`  ${index + 1}. ${toolCall.toolName}`);
      });
    }

    if (result.error) {
      console.log(`\n❌ Error: ${result.error}`);
    }

    console.log("\n");
  });
}

function generateSummary(results: TestResult[]): TestStats {
  const stats: TestStats = {
    total: results.length,
    successful: results.filter((r) => r.success).length,
    failed: results.filter((r) => !r.success).length,
    sceneTypeDistribution: {
      portrait: 0,
      "wide-shot": 0,
      "detail-shot": 0,
      unknown: 0,
    },
    averageExecutionTime: 0,
    styleKeywordsFound: 0,
  };

  let totalExecutionTime = 0;
  const styleKeywords = [
    "Moebius-inspired",
    "clean fluid lines",
    "vibrant saturated colors",
    "modern graphic novel",
  ];

  results.forEach((result) => {
    if (result.success) {
      totalExecutionTime += result.executionTime;

      if (result.detectedSceneType) {
        stats.sceneTypeDistribution[result.detectedSceneType]++;
      } else {
        stats.sceneTypeDistribution.unknown++;
      }

      if (result.generatedPrompt) {
        const promptLower = result.generatedPrompt.toLowerCase();
        const keywordsFound = styleKeywords.filter((keyword) =>
          promptLower.includes(keyword.toLowerCase())
        ).length;
        stats.styleKeywordsFound += keywordsFound;
      }
    }
  });

  stats.averageExecutionTime =
    stats.successful > 0
      ? Math.round(totalExecutionTime / stats.successful)
      : 0;

  return stats;
}

function displaySummary(stats: TestStats): void {
  console.log(`\n${"=".repeat(80)}`);
  console.log("SUMMARY STATISTICS");
  console.log(`${"=".repeat(80)}\n`);

  console.log(`Total Tests: ${stats.total}`);
  console.log(`Successful: ${stats.successful} ✅`);
  console.log(`Failed: ${stats.failed} ${stats.failed > 0 ? "❌" : ""}`);
  console.log(`\nScene Type Distribution:`);
  console.log(`  Portrait: ${stats.sceneTypeDistribution.portrait}`);
  console.log(`  Wide Shot: ${stats.sceneTypeDistribution["wide-shot"]}`);
  console.log(`  Detail Shot: ${stats.sceneTypeDistribution["detail-shot"]}`);
  console.log(`  Unknown: ${stats.sceneTypeDistribution.unknown}`);
  console.log(`\nAverage Execution Time: ${stats.averageExecutionTime}ms`);
  console.log(
    `Style Keywords Found: ${stats.styleKeywordsFound} (across all prompts)`
  );

  const avgKeywordsPerPrompt =
    stats.successful > 0
      ? (stats.styleKeywordsFound / stats.successful).toFixed(1)
      : "0";
  console.log(`Average Keywords per Prompt: ${avgKeywordsPerPrompt}`);

  console.log(`\n${"=".repeat(80)}\n`);
}

// ============================================================================
// Main Execution
// ============================================================================

async function runTests() {
  console.log("🧪 VEA Test Script");
  console.log(`${"=".repeat(80)}\n`);

  // Check if image generation is enabled
  const shouldGenerateImages =
    process.env.VEA_GENERATE_IMAGES === "true" ||
    process.argv.includes("--generate-images");

  if (shouldGenerateImages) {
    console.log(
      "🎨 Image generation enabled - images will be generated via Replicate"
    );
    console.log("   Check your Replicate Dashboard to see the predictions");
  } else {
    console.log("ℹ️  Image generation disabled (test mode only)");
    console.log(
      "   To enable: Set VEA_GENERATE_IMAGES=true or use --generate-images flag"
    );
  }

  console.log();

  // Check if we should only test main scene types (one of each)
  const quickMode =
    process.env.VEA_QUICK_MODE === "true" ||
    process.argv.includes("--quick") ||
    process.argv.includes("--main-scenes-only");

  // Generate mock data
  console.log("📦 Generating mock data...");
  const mockData = generateMockData();
  console.log(`   Campaign: ${mockData.campaign.name}`);
  console.log(`   Character: ${mockData.character.name}`);
  console.log(`   Universe: ${mockData.universe.name}`);
  console.log(`   Run ID: ${mockData.runId}\n`);

  // Generate test scenarios
  console.log("🎲 Generating test scenarios...");
  let scenarios = generateTestScenarios();

  if (quickMode) {
    // Filter to one scenario of each type (portrait, wide-shot, detail-shot)
    const portraitScenarios = scenarios.filter(
      (s) => s.expectedSceneType === "portrait"
    );
    const wideShotScenarios = scenarios.filter(
      (s) => s.expectedSceneType === "wide-shot"
    );
    const detailShotScenarios = scenarios.filter(
      (s) => s.expectedSceneType === "detail-shot"
    );

    scenarios = [
      portraitScenarios[0],
      wideShotScenarios[0],
      detailShotScenarios[0],
    ].filter(Boolean); // Remove any undefined entries

    console.log(
      `   Quick mode: Testing ${scenarios.length} main scene types (one of each)\n`
    );
  } else {
    console.log(`   Generated ${scenarios.length} test scenarios\n`);
  }

  // Execute tests
  console.log("🚀 Executing VEA tests...\n");
  const results: TestResult[] = [];

  for (const scenario of scenarios) {
    console.log(
      `Running test ${scenario.id}/${scenarios.length}: ${scenario.description}...`
    );
    const result = await executeVEA(scenario, mockData, shouldGenerateImages);
    results.push(result);

    if (result.success) {
      console.log(
        `   ✅ Completed in ${result.executionTime}ms (Detected: ${
          result.detectedSceneType || "N/A"
        })`
      );
    } else {
      console.log(`   ❌ Failed: ${result.error}`);
    }
  }

  // Display results
  formatResults(results);

  // Generate and display summary
  const stats = generateSummary(results);
  displaySummary(stats);

  // Exit with appropriate code
  if (stats.failed > 0) {
    console.log("⚠️  Some tests failed. Review the results above.\n");
    process.exit(1);
  } else {
    console.log("✅ All tests completed successfully!\n");
    process.exit(0);
  }
}

// Run the tests
runTests().catch((error) => {
  console.error("\n❌ Fatal error running tests:", error);
  process.exit(1);
});
