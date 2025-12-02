import {
  createUIMessageStreamResponse,
  createUIMessageStream,
  streamText,
  convertToModelMessages,
} from "ai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { createGameMasterTools } from "@/lib/ai/tools";
import { db } from "@/lib/db";
import {
  runs,
  characters,
  campaigns,
  universes,
  messages,
} from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";
import { getUserProfileByClerkId } from "@/lib/db/queries/user-profile";
import type { UIMessage } from "ai";
import type { CampaignState } from "@/lib/db/schemas/campaign";

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

const MODEL_NAME = "x-ai/grok-4.1-fast:free";

export async function POST(req: Request) {
  try {
    // Validate API key
    if (!process.env.OPENROUTER_API_KEY) {
      console.error("[API] OPENROUTER_API_KEY is not configured");
      return new Response("Server configuration error", { status: 500 });
    }

    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      console.error("[API] Unauthorized: No clerkUserId");
      return new Response("Unauthorized", { status: 401 });
    }

    const userProfile = await getUserProfileByClerkId(clerkUserId);
    if (!userProfile) {
      console.error(
        "[API] User profile not found for clerkUserId:",
        clerkUserId
      );
      return new Response("User profile not found", { status: 404 });
    }

    // Validate request body
    let requestBody: { messages?: unknown; runId?: unknown };
    try {
      requestBody = await req.json();
    } catch (error) {
      console.error("[API] Error parsing request body:", error);
      return new Response("Invalid JSON in request body", { status: 400 });
    }

    const { messages: incomingMessages, runId } = requestBody;

    // Validate runId
    if (!runId || typeof runId !== "string") {
      console.error("[API] Invalid runId:", runId);
      return new Response("runId is required and must be a string", {
        status: 400,
      });
    }

    // Validate messages
    if (!incomingMessages || !Array.isArray(incomingMessages)) {
      console.error("[API] Invalid messages:", incomingMessages);
      return new Response("messages is required and must be an array", {
        status: 400,
      });
    }

    // Ensure messages array is properly typed and validated
    const typedMessages = incomingMessages as UIMessage[];

    // Validate each message has required structure (AI SDK v6 supports both 'content' and 'parts')
    for (let i = 0; i < typedMessages.length; i++) {
      const msg = typedMessages[i];
      if (!msg || typeof msg !== "object") {
        console.error(`[API] Invalid message at index ${i}:`, msg);
        return new Response(`Invalid message structure at index ${i}`, {
          status: 400,
        });
      }
      if (!("role" in msg) || typeof msg.role !== "string") {
        console.error(`[API] Message at index ${i} missing role:`, msg);
        return new Response(
          `Message at index ${i} missing required 'role' field`,
          { status: 400 }
        );
      }
      // AI SDK v6 messages can have either 'content' OR 'parts' (or both).
      // Detailed validation of \"meaningful\" content is handled later before model conversion.
    }

    // Fetch run with related data
    const [runData] = await db
      .select({
        run: runs,
        character: characters,
        campaign: campaigns,
        universe: universes,
      })
      .from(runs)
      .innerJoin(characters, eq(runs.characterId, characters.id))
      .innerJoin(campaigns, eq(runs.campaignId, campaigns.id))
      .innerJoin(universes, eq(campaigns.universeId, universes.id))
      .where(eq(runs.id, runId))
      .limit(1);

    if (!runData) {
      console.error("[API] Run not found:", runId);
      return new Response("Run not found", { status: 404 });
    }

    const { run, character, campaign, universe } = runData;

    // Verify ownership
    if (run.userId !== userProfile.id) {
      console.error(
        "[API] Unauthorized: Run userId",
        run.userId,
        "does not match userProfile.id",
        userProfile.id
      );
      return new Response("Unauthorized", { status: 403 });
    }

    // Check if this is the first message (no previous messages in database)
    // Select all fields to avoid Drizzle select object structure issues
    const existingMessages = await db
      .select()
      .from(messages)
      .where(eq(messages.runId, run.id))
      .limit(1);

    const isFirstMessage = existingMessages.length === 0;

    const lastUserMessage = typedMessages
      .filter((m) => m.role === "user")
      .pop();

    // Check if this is an empty initial message (first message with empty/whitespace content or empty parts)
    let isEmptyInitialMessage = false;
    if (isFirstMessage) {
      if (!lastUserMessage) {
        isEmptyInitialMessage = true;
      } else {
        const arrayContent =
          "content" in lastUserMessage
            ? (lastUserMessage as { content?: unknown[] }).content
            : undefined;

        const hasEmptyContent =
          ("content" in lastUserMessage &&
            typeof (lastUserMessage as { content?: unknown }).content ===
              "string" &&
            ((lastUserMessage as { content?: string }).content || "").trim() ===
              "") ||
          (Array.isArray(arrayContent) && arrayContent.length === 0);

        const hasOnlyEmptyTextParts =
          Array.isArray(lastUserMessage.parts) &&
          lastUserMessage.parts.every((part: unknown) => {
            if (
              typeof part === "object" &&
              part !== null &&
              "type" in part &&
              "text" in part
            ) {
              return (
                typeof (part as { text?: unknown }).text === "string" &&
                (part as { text: string }).text.trim() === ""
              );
            }
            return false;
          });

        isEmptyInitialMessage = hasEmptyContent || hasOnlyEmptyTextParts;
      }
    }

    // For empty initial messages, ensure we have at least one user message to trigger the opening scene.
    // We synthesize a minimal text part instead of using the deprecated/unsupported `content` field.
    if (isEmptyInitialMessage && typedMessages.length === 0) {
      typedMessages.push({
        id: "synthetic-initial-message",
        role: "user",
        parts: [
          {
            type: "text",
            text: " ",
          },
        ],
      });
    }

    // Create mutable state copy for tool execution and ensure it matches CampaignState
    let validatedState: CampaignState;
    try {
      const rawState = JSON.parse(JSON.stringify(run.state)) as CampaignState;

      validatedState = {
        activeFronts: Array.isArray(rawState.activeFronts)
          ? rawState.activeFronts
          : [],
        narrativeVectors: {
          hope:
            typeof rawState.narrativeVectors?.hope === "number"
              ? rawState.narrativeVectors.hope
              : 0.5,
          chaos:
            typeof rawState.narrativeVectors?.chaos === "number"
              ? rawState.narrativeVectors.chaos
              : 0.5,
        },
        questThreads: Array.isArray(rawState.questThreads)
          ? rawState.questThreads
          : [],
        knowledgeGraph: {
          nodes: Array.isArray(rawState.knowledgeGraph?.nodes)
            ? rawState.knowledgeGraph.nodes
            : [],
          edges: Array.isArray(rawState.knowledgeGraph?.edges)
            ? rawState.knowledgeGraph.edges
            : [],
        },
        currentContext:
          typeof rawState.currentContext === "string"
            ? rawState.currentContext
            : undefined,
      };
    } catch (error) {
      console.error("[API] Error parsing campaign state:", error);
      return new Response("Invalid campaign state", { status: 500 });
    }

    // Build system prompt with context
    const systemPrompt = `You are the Game Master Agent (GMA) for a text-based RPG campaign.

UNIVERSE CONTEXT:
- Name: ${universe.name}
- Description: ${universe.description}
- History: ${universe.history.substring(0, 500)}...
- Ontology: ${JSON.stringify(universe.ontology)}
- Factions: ${JSON.stringify(universe.factions || [])}

CAMPAIGN CONTEXT:
- Name: ${campaign.name}
- Genres: ${campaign.genres.join(", ")}
- Current State:
  - Active Fronts: ${JSON.stringify(validatedState.activeFronts)}
  - Narrative Vectors: Hope=${(
    validatedState.narrativeVectors?.hope ?? 0.5
  ).toFixed(2)}, Chaos=${(
      validatedState.narrativeVectors?.chaos ?? 0.5
    ).toFixed(2)}
  - Quest Threads: ${validatedState.questThreads?.length ?? 0} active
  - Knowledge Graph: ${
    validatedState.knowledgeGraph?.nodes?.length ?? 0
  } nodes, ${validatedState.knowledgeGraph?.edges?.length ?? 0} edges
  - Current Context: ${validatedState.currentContext || "Beginning of campaign"}

CHARACTER CONTEXT:
- Name: ${character.name}
- Profession: ${character.properties?.profession || "Unknown"}
- Stats:
  - Strength: ${character.stats.strength}
  - Agility: ${character.stats.agility}
  - Intelligence: ${character.stats.intelligence}
  - Scholarship: ${character.stats.scholarship}
  - Intuition: ${character.stats.intuition}
- Backstory: ${
      character.properties?.backstory?.substring(0, 300) ||
      "No backstory provided"
    }...

GAME MASTER INSTRUCTIONS:
1. You are a living world simulator. Use tools to update the campaign state dynamically.
2. Check Active Fronts every turn. If the player ignores a Front, advance it by 1 step.
3. When a player action requires a skill check, use the requestSkillCheck tool with the appropriate attribute and difficulty.
4. After tool execution, narrate the consequences naturally, incorporating state changes into your description.
5. Keep narrative engaging and responsive to player choices.
6. Use maxSteps: 5 to allow multi-step reasoning (Reason -> Act -> Narrate).

${
  isEmptyInitialMessage
    ? `OPENING SCENE INSTRUCTIONS:
This is the beginning of the campaign. You must create an engaging opening scene that:
- Introduces the setting and atmosphere based on the universe and campaign genres
- Establishes the character's current situation and location
- Incorporates elements from the character's backstory naturally
- References the active fronts and quest threads from the campaign state
- Sets up the first decision point or action prompt for the player
- Uses rich, descriptive language with markdown formatting (use **bold** for emphasis, *italic* for thoughts, etc.)
- Ends with a clear prompt asking what the player wants to do next

Make this opening scene immersive and compelling. Set the tone for the adventure ahead.`
    : ""
}

IMPORTANT: For skill checks, use requestSkillCheck tool. Do NOT execute it yourself - wait for the player to roll the dice.`;

    // Create tools with state context
    let toolsWithState: ReturnType<typeof createGameMasterTools>;
    try {
      toolsWithState = createGameMasterTools(
        validatedState as Parameters<typeof createGameMasterTools>[0]
      );

      // Validate tools object structure
      if (!toolsWithState || typeof toolsWithState !== "object") {
        throw new Error("Tools object is invalid");
      }

      // Ensure all expected tools exist
      const requiredTools = [
        "updateNarrativeVector",
        "manageRelationship",
        "advanceFront",
        "createQuest",
        "logEvent",
        "requestSkillCheck",
      ];
      for (const toolName of requiredTools) {
        if (!(toolName in toolsWithState)) {
          throw new Error(`Missing required tool: ${toolName}`);
        }
      }
    } catch (error) {
      console.error("[API] Error creating tools:", error);
      return new Response(
        `Error creating game tools: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        { status: 500 }
      );
    }

    // Validate and sanitize messages before conversion.
    // AI SDK v6 messages can have 'content', 'parts', or both.
    // Providers like xAI require that each message has at least one content element,
    // so we drop messages that are effectively empty (no meaningful content or parts).
    const sanitizedMessages = typedMessages.filter((msg): msg is UIMessage => {
      if (!msg || typeof msg !== "object") {
        return false;
      }
      if (!("role" in msg)) {
        return false;
      }

      const rawContent =
        "content" in msg ? (msg as { content?: unknown }).content : undefined;
      const hasContent =
        typeof rawContent === "string"
          ? rawContent.trim().length > 0
          : Array.isArray(rawContent)
          ? rawContent.length > 0
          : false;

      const rawParts = "parts" in msg ? msg.parts : undefined;
      // Treat any non-empty parts array as meaningful content. This ensures that
      // tool calls and tool results (which often have no text content) are kept
      // in the conversation history so HITL flows continue to work correctly.
      const hasParts = Array.isArray(rawParts) && rawParts.length > 0;

      if (!hasContent && !hasParts) {
        console.warn("[API] Dropping empty message before model call:", msg);
        return false;
      }

      return true;
    });

    // Save user message upfront (before streaming) to ensure persistence
    // Reuse lastUserMessage that was already declared above
    if (lastUserMessage && !isEmptyInitialMessage) {
      // Handle both content and parts formats
      const userContent =
        "content" in lastUserMessage
          ? (lastUserMessage as { content?: unknown }).content
          : undefined;
      const userParts = lastUserMessage.parts;

      // Check if message has meaningful content
      const hasContent =
        typeof userContent === "string"
          ? userContent.trim().length > 0
          : Array.isArray(userContent)
          ? userContent.length > 0
          : false;

      const hasParts =
        Array.isArray(userParts) &&
        userParts.length > 0 &&
        userParts.some((part: unknown) => {
          if (typeof part === "object" && part !== null && "type" in part) {
            if (
              "text" in part &&
              typeof (part as { text: unknown }).text === "string"
            ) {
              return (part as { text: string }).text.trim().length > 0;
            }
            return true; // Non-text parts are considered content
          }
          return false;
        });

      if (hasContent || hasParts) {
        try {
          const userMessageData = {
            content: userContent,
            parts: userParts || undefined,
          };
          await db.insert(messages).values({
            runId: run.id,
            role: "user",
            content: userMessageData as unknown,
          });
        } catch (error) {
          console.error("[API] Error saving user message upfront:", error);
          // Continue even if saving fails - don't block the stream
        }
      }
    }

    // Save assistant messages from incoming messages that have tool output
    // (These come from the client after addToolOutput updates them with output)
    // This ensures tool results with output are persisted correctly
    for (const msg of typedMessages) {
      if (msg.role === "assistant" && msg.parts) {
        // Check if this message has tool parts with output-available state
        const toolPartsWithOutput = msg.parts.filter((part: unknown) => {
          if (
            typeof part === "object" &&
            part !== null &&
            "type" in part &&
            ("state" in part || "output" in part)
          ) {
            const typedPart = part as {
              type?: string;
              state?: string;
              output?: unknown;
              toolCallId?: string;
            };
            // Check for tool parts with output (HITL tool results)
            return (
              (typedPart.state === "output-available" ||
                typedPart.state === "result") &&
              typedPart.output !== undefined &&
              typedPart.toolCallId
            );
          }
          return false;
        });

        if (toolPartsWithOutput.length > 0) {
          try {
            // Extract toolCallIds from tool parts with output
            const toolCallIds = toolPartsWithOutput
              .map((part: unknown) => {
                const typedPart = part as { toolCallId?: string };
                return typedPart.toolCallId;
              })
              .filter((id): id is string => typeof id === "string");

            // Find existing messages that contain these toolCallIds
            const existingMessages = await db
              .select()
              .from(messages)
              .where(and(eq(messages.runId, run.id), eq(messages.role, "assistant")));

            // Check if any existing message has matching toolCallIds
            let messageUpdated = false;
            for (const existingMsg of existingMessages) {
              const existingContent = existingMsg.content as
                | { parts?: unknown[] }
                | null
                | undefined;
              const existingParts = Array.isArray(existingContent?.parts)
                ? existingContent.parts
                : [];

              const hasMatchingToolCall = existingParts.some(
                (part: unknown) => {
                  if (
                    typeof part === "object" &&
                    part !== null &&
                    "toolCallId" in part
                  ) {
                    const typedPart = part as { toolCallId?: string };
                    return (
                      typedPart.toolCallId &&
                      toolCallIds.includes(typedPart.toolCallId)
                    );
                  }
                  return false;
                }
              );

              if (hasMatchingToolCall) {
                // Update existing message with tool output
                const assistantMessageData = {
                  content: "content" in msg ? msg.content : undefined,
                  parts: msg.parts,
                };
                await db
                  .update(messages)
                  .set({
                    content: assistantMessageData as unknown,
                  })
                  .where(eq(messages.id, existingMsg.id));
                messageUpdated = true;
                break;
              }
            }

            // If no existing message was found, insert new one
            if (!messageUpdated) {
              const assistantMessageData = {
                content: "content" in msg ? msg.content : undefined,
                parts: msg.parts,
              };
              await db.insert(messages).values({
                runId: run.id,
                role: "assistant",
                content: assistantMessageData as unknown,
              });
            }
          } catch (error) {
            console.error(
              "[API] Error saving assistant message with tool output:",
              error
            );
            // Continue even if saving fails - don't block the stream
          }
        }
      }
    }

    const stream = createUIMessageStream({
      originalMessages: typedMessages,
      execute: async ({ writer }) => {
        try {
          // Convert messages safely
          let modelMessages: ReturnType<typeof convertToModelMessages>;
          try {
            modelMessages = convertToModelMessages(sanitizedMessages);
          } catch (error) {
            console.error("[API] Error converting messages:", error);
            throw new Error(
              `Message conversion failed: ${
                error instanceof Error ? error.message : "Unknown error"
              }`
            );
          }
          const result = streamText({
            model: openrouter.chat(MODEL_NAME),
            messages: [
              { role: "system", content: systemPrompt },
              ...modelMessages,
            ],
            tools: toolsWithState,
            onFinish: async ({ text, toolCalls, toolResults }) => {
              try {
                // Save assistant message using the text and tool calls from onFinish
                // Note: For HITL tools like requestSkillCheck, tool output comes from the client
                // via addToolOutput and will be saved/updated when the client sends the next message.
                // We save the message here without tool output, then update it later when tool output arrives.
                const parts: unknown[] = [];
                if (text) {
                  parts.push({
                    type: "text",
                    text,
                  });
                }
                if (toolCalls) {
                  for (const toolCall of toolCalls) {
                    parts.push({
                      type: "tool-call",
                      toolCallId: toolCall.toolCallId,
                      toolName: toolCall.toolName,
                    });
                  }
                }
                if (toolResults) {
                  for (const toolResult of toolResults) {
                    // For server-executed tools, include result if available
                    const typedResult = toolResult as {
                      toolCallId: string;
                      result?: unknown;
                    };
                    parts.push({
                      type: "tool-result",
                      toolCallId: typedResult.toolCallId,
                      result: typedResult.result,
                    });
                  }
                }

                const assistantMessageData = {
                  content: text || "",
                  parts: parts.length > 0 ? parts : undefined,
                };

                await db.insert(messages).values({
                  runId: run.id,
                  role: "assistant",
                  content: assistantMessageData as unknown,
                });

                // Check if any tools modified state (excluding requestSkillCheck)
                let stateUpdated = false;
                if (toolCalls) {
                  for (const toolCall of toolCalls) {
                    if (toolCall.toolName !== "requestSkillCheck") {
                      stateUpdated = true;
                      break;
                    }
                  }
                }

                // Persist updated state if tools modified it
                if (stateUpdated) {
                  await db
                    .update(runs)
                    .set({
                      state: validatedState,
                      updatedAt: new Date(),
                    })
                    .where(eq(runs.id, run.id));
                }
              } catch (error) {
                console.error("[API] Error in streamText.onFinish:", error);
                console.error(
                  "[API] Error stack:",
                  error instanceof Error ? error.stack : "No stack trace"
                );
                // Don't throw - allow the stream to complete even if saving fails
              }
            },
          });

          writer.merge(
            result.toUIMessageStream({ originalMessages: typedMessages })
          );
        } catch (error) {
          console.error("[API] Error in stream execution:", error);
          console.error(
            "[API] Error stack:",
            error instanceof Error ? error.stack : "No stack trace"
          );
          throw error;
        }
      },
    });

    // Simplified: messages are now saved in streamText.onFinish and upfront for user messages
    return createUIMessageStreamResponse({ stream });
  } catch (error) {
    console.error("[API] Unhandled error in POST handler:", error);
    console.error(
      "[API] Error stack:",
      error instanceof Error ? error.stack : "No stack trace"
    );
    return new Response(
      `Internal server error: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
      { status: 500 }
    );
  }
}
