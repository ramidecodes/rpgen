import { createAgentUIStreamResponse } from "ai";
import { db } from "@/lib/db";
import {
  runs,
  characters,
  campaigns,
  universes,
  messages,
} from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";
import { getUserProfileByClerkId } from "@/lib/db/queries/user-profile";
import { createGameMasterAgent } from "@/agents/game-master";
import {
  createCampaignManagerAgent,
  extractTextFromUIMessages,
} from "@/agents/campaign-manager";
import {
  createVisualEngineAgent,
  extractCharacterAction,
  hasNarrativeText,
} from "@/agents/visual-engine";
import type { UIMessage, UIMessagePart } from "@/types/ui-message";
import { isTextUIPart } from "@/types/ui-message";
import type { CampaignState } from "@/lib/db/schemas/campaign";
import type { Run, Character, Campaign, Universe } from "@/lib/db/schema";

export async function POST(req: Request) {
  try {
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

    // Parse and validate request body
    let requestBody: { messages?: UIMessage[]; runId?: string };
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

    // Validate each message structure
    for (let i = 0; i < incomingMessages.length; i++) {
      const msg = incomingMessages[i];
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

    // Load existing messages for context
    const existingMessages = await db
      .select()
      .from(messages)
      .where(eq(messages.runId, run.id))
      .orderBy(desc(messages.createdAt))
      .limit(50);

    // Convert stored messages back to UIMessage format
    const storedMessages = existingMessages.reverse().map((msg) => ({
      id: msg.id,
      role: msg.role as UIMessage["role"],
      parts: msg.content as UIMessage["parts"],
    }));

    // Filter and prepare messages for model processing
    const processedMessages = prepareMessagesForModel([
      ...storedMessages,
      ...incomingMessages,
    ]);

    // Check for empty initial message (unused for now, but function is available)
    const _isEmptyInitialMessage =
      checkForEmptyInitialMessage(incomingMessages);

    // Persist assistant messages with tool outputs from incoming messages
    // This handles HITL tool results added via addToolOutput (immutable pattern)
    await persistAssistantMessagesWithToolOutputs(incomingMessages, run.id);

    // Create mutable state copy for tool execution
    const campaignState: CampaignState = JSON.parse(JSON.stringify(run.state));

    // Create Game Master Agent
    const gma = createGameMasterAgent({
      runId,
      campaign,
      character,
      universe,
      campaignState,
    });

    // Create the streaming response
    const response = createAgentUIStreamResponse({
      agent: gma.getAgent(),
      messages: processedMessages,
      onFinish: async (result) => {
        console.log("[API] Agent execution finished");

        // Persist user message if it was meaningful
        const lastUserMessage = findLastMeaningfulUserMessage(incomingMessages);
        if (lastUserMessage) {
          await persistMessage(run.id, lastUserMessage);
        }

        // Persist assistant message with tool calls/results
        await persistAssistantMessage(run.id, result);

        // Extract latest assistant message from result.messages
        const latestAssistantMessage = result.messages
          ?.filter((msg) => msg.role === "assistant")
          .pop();

        // Build complete message context including latest assistant message
        const allRecentMessages: UIMessage[] = latestAssistantMessage
          ? [...processedMessages, latestAssistantMessage]
          : processedMessages;

        // Update campaign state if modified by GMA
        if (gma.hasStateChanged(run.state)) {
          console.log(
            "[API] Campaign state modified by GMA, persisting changes"
          );
          await db
            .update(runs)
            .set({
              state: campaignState,
              updatedAt: new Date(),
            })
            .where(eq(runs.id, run.id));
        }

        // Trigger background Campaign Manager Agent for state reconciliation
        // (After EVERY assistant message - needed to analyze GMA narration)
        // Fire-and-forget pattern: don't await to avoid blocking the chat response
        triggerBackgroundStateReconciliation(
          run,
          character,
          campaign,
          universe,
          campaignState,
          allRecentMessages
        ).catch((error) => {
          // Log errors but don't fail the main request
          console.error(
            "[API] Campaign Manager Agent error (non-blocking):",
            error
          );
        });

        // Trigger Visual Engine Agent for scene generation (non-blocking)
        // (After EVERY assistant message - needed to assess narrative changes)
        // Fire-and-forget pattern: don't await to avoid blocking the chat response
        triggerVisualEngineAgent(
          run,
          character,
          campaign,
          universe,
          campaignState,
          allRecentMessages,
          incomingMessages
        ).catch((error) => {
          // Log errors but don't fail the main request
          console.error(
            "[API] Visual Engine Agent error (non-blocking):",
            error
          );
        });

        // Log completion metrics
        console.log("[API] Chat turn completed", {
          runId,
          hasStateChanges: gma.hasStateChanged(run.state),
          messageCount: result.messages?.length || 0,
        });
      },
    });

    return response;
  } catch (error) {
    console.error("[API] Unexpected error:", error);
    return new Response("Internal server error", { status: 500 });
  }
}

/**
 * Prepare messages for model processing by filtering out empty messages
 * and converting to the format expected by the model
 */
function prepareMessagesForModel(messages: UIMessage[]): UIMessage[] {
  return messages.filter((msg) => {
    // Drop messages that have no non-empty parts
    return Array.isArray(msg.parts) && msg.parts.length > 0;
  });
}

/**
 * Convert UIMessage[] to CoreMessage[] format for model input
 * Extracts text from text parts and filters non-standard parts
 * This is needed when passing messages to ToolLoopAgent.generate() which expects CoreMessage[] with content field
 */
function convertUIMessagesToCoreMessages(
  messages: UIMessage[]
): Array<{ role: "system" | "user" | "assistant"; content: string }> {
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

      return {
        role: msg.role as "system" | "user" | "assistant",
        content: textParts.join(" ").trim() || "", // Join text parts, fallback to empty string
      };
    })
    .filter((msg) => msg.content.length > 0); // Remove empty messages
}

/**
 * Check if the incoming messages represent an empty initial message
 */
function checkForEmptyInitialMessage(messages: UIMessage[]): boolean {
  if (messages.length === 0) return true;

  const lastMessage = messages[messages.length - 1];
  if (lastMessage.role !== "user") return false;

  // Check for empty text parts
  if (Array.isArray(lastMessage.parts)) {
    const hasOnlyEmptyText = lastMessage.parts.every((part: UIMessagePart) => {
      if (!isTextUIPart(part)) {
        return false;
      }
      return part.text.trim() === "";
    });
    if (hasOnlyEmptyText) return true;
  }

  return false;
}

/**
 * Find the last meaningful user message from incoming messages
 */
function findLastMeaningfulUserMessage(
  messages: UIMessage[]
): UIMessage | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (msg.role === "user") {
      // Check if it has non-empty parts
      if (Array.isArray(msg.parts) && msg.parts.length > 0) {
        return msg;
      }
    }
  }
  return null;
}

/**
 * Persist a message to the database
 */
async function persistMessage(
  runId: string,
  message: UIMessage
): Promise<void> {
  await db.insert(messages).values({
    runId,
    role: message.role,
    content: message.parts || [],
  });
}

/**
 * Persist assistant messages with tool outputs from incoming messages
 * This handles HITL tool results added via addToolOutput (immutable pattern)
 */
async function persistAssistantMessagesWithToolOutputs(
  incomingMessages: UIMessage[],
  runId: string
): Promise<void> {
  for (const msg of incomingMessages) {
    if (msg.role !== "assistant" || !msg.parts || !Array.isArray(msg.parts)) {
      continue;
    }

    // Check if this message has tool parts with output-available state
    const hasToolOutput = msg.parts.some((part) => {
      if (
        typeof part === "object" &&
        part !== null &&
        !Array.isArray(part) &&
        "type" in part &&
        "toolCallId" in part
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
          typeof typedPart.toolCallId === "string"
        );
      }
      return false;
    });

    if (hasToolOutput) {
      try {
        // Insert as new message (immutable pattern - don't update existing)
        await persistMessage(runId, msg);
      } catch (error) {
        console.error(
          "[API] Error persisting assistant message with tool output:",
          error
        );
        // Continue even if saving fails - don't block the stream
      }
    }
  }
}

/**
 * Persist assistant message with tool calls and results
 */
async function persistAssistantMessage(
  runId: string,
  result: { messages?: UIMessage[] }
): Promise<void> {
  if (!result.messages || result.messages.length === 0) return;

  // The result should contain the final assistant message with all parts
  const assistantMessage = result.messages[result.messages.length - 1];
  if (assistantMessage?.role === "assistant") {
    await persistMessage(runId, assistantMessage);
  }
}

/**
 * Trigger background state reconciliation using the Campaign Manager Agent
 */
async function triggerBackgroundStateReconciliation(
  run: Run,
  character: Character,
  campaign: Campaign,
  universe: Universe,
  campaignState: CampaignState,
  recentMessages: UIMessage[]
): Promise<void> {
  try {
    console.log("[API] Starting background state reconciliation");

    // Extract text from UIMessage parts for CMA processing
    const modelMessages = extractTextFromUIMessages(recentMessages, 20);

    // Skip if no meaningful messages to process
    if (modelMessages.length === 0) {
      console.log("[API] No text content found in messages, skipping CMA");
      return;
    }

    // Create Campaign Manager Agent with current state
    // The agent will create a deep copy internally for comparison
    const cma = createCampaignManagerAgent({
      runId: run.id,
      campaign,
      character,
      universe,
      campaignState,
      recentMessages,
    });

    // Get original state copy for comparison
    const originalState = cma.getOriginalState();

    // Execute background processing (no streaming, just state mutations)
    const result = await cma.getAgent().generate({
      messages: modelMessages,
    });

    // Persist any additional state changes from background processing
    // Compare against the original state copy
    if (cma.hasStateChanged(originalState)) {
      console.log("[API] Background agent modified state, persisting changes");
      const updatedState = cma.getCampaignState();
      await db
        .update(runs)
        .set({
          state: updatedState,
          updatedAt: new Date(),
        })
        .where(eq(runs.id, run.id));
    }

    console.log("[API] Background state reconciliation completed", {
      toolCalls: result.toolCalls?.length || 0,
      stateChanged: cma.hasStateChanged(originalState),
    });
  } catch (error) {
    console.error("[API] Background state reconciliation failed:", error);
    // Don't fail the main request if background processing fails
  }
}

/**
 * Trigger Visual Engine Agent for automatic scene generation
 */
async function triggerVisualEngineAgent(
  run: Run,
  character: Character,
  campaign: Campaign,
  universe: Universe,
  campaignState: CampaignState,
  recentMessages: UIMessage[],
  incomingMessages: UIMessage[]
): Promise<void> {
  try {
    // Early exit: Skip VEA if latest assistant message has no narrative text
    // This prevents duplicate scene generation for tool-call-only messages (e.g., requestSkillCheck)
    if (!hasNarrativeText(recentMessages)) {
      console.log(
        "[API] Skipping Visual Engine Agent - no narrative text in latest assistant message"
      );
      return;
    }

    console.log("[API] Starting Visual Engine Agent for scene generation");

    // Extract character action from the latest user message
    const characterAction = extractCharacterAction(incomingMessages);

    // Get current scene for comparison
    const { db } = await import("@/lib/db");
    const { scenes } = await import("@/lib/db/schema");
    const { eq } = await import("drizzle-orm");

    const currentScene = run.currentSceneId
      ? await db
          .select({
            id: scenes.id,
            runId: scenes.runId,
            sceneType: scenes.sceneType,
            imageUrl: scenes.imageUrl,
            generationPrompt: scenes.generationPrompt,
            narrativeContext: scenes.narrativeContext,
            previousSceneId: scenes.previousSceneId,
            createdAt: scenes.createdAt,
          })
          .from(scenes)
          .where(eq(scenes.id, run.currentSceneId))
          .limit(1)
          .then((results) => results[0] || null)
      : null;

    // Create Visual Engine Agent
    const vea = createVisualEngineAgent({
      runId: run.id,
      campaign,
      character,
      universe,
      campaignState,
      currentScene,
      recentMessages,
      characterAction,
    });

    // Extract recent messages for VEA context
    // Convert UIMessage[] to CoreMessage[] format for model input
    const veaMessages = convertUIMessagesToCoreMessages(
      recentMessages.slice(-10) // Last 10 messages for context
    );

    // Execute visual engine processing (background, no streaming)
    // runId is already bound in the tool at agent creation time
    const result = await vea.getAgent().generate({
      messages: veaMessages,
    });

    console.log("[API] Visual Engine Agent completed", {
      toolCalls: result.toolCalls?.length || 0,
    });
  } catch (error) {
    console.error("[API] Visual Engine Agent failed:", error);
    // Don't fail the main request if visual processing fails
  }
}
