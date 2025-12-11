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
  extractTranscriptForProcessing,
} from "@/agents/campaign-manager";
import type { UIMessage } from "ai";
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

        // Update campaign state if modified
        if (gma.hasStateChanged(run.state)) {
          console.log("[API] Campaign state modified, persisting changes");
          await db
            .update(runs)
            .set({
              state: campaignState,
              updatedAt: new Date(),
            })
            .where(eq(runs.id, run.id));

          // Trigger background Campaign Manager Agent for state reconciliation
          await triggerBackgroundStateReconciliation(
            run,
            character,
            campaign,
            universe,
            campaignState,
            processedMessages
          );
        }

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
 * Check if the incoming messages represent an empty initial message
 */
function checkForEmptyInitialMessage(messages: UIMessage[]): boolean {
  if (messages.length === 0) return true;

  const lastMessage = messages[messages.length - 1];
  if (lastMessage.role !== "user") return false;

  // Check for empty text parts
  if (Array.isArray(lastMessage.parts)) {
    const hasOnlyEmptyText = lastMessage.parts.every((part) => {
      return (
        typeof part === "object" &&
        part !== null &&
        "type" in part &&
        "text" in part &&
        typeof (part as { text: unknown }).text === "string" &&
        (part as { text: string }).text.trim() === ""
      );
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

    // Extract transcript for CMA processing
    const transcript = extractTranscriptForProcessing(
      recentMessages.map((msg) => ({
        role: msg.role,
        content: msg.parts || [],
      }))
    );

    // Create Campaign Manager Agent
    const cma = createCampaignManagerAgent({
      runId: run.id,
      campaign,
      character,
      universe,
      campaignState,
      transcript,
    });

    // Execute background processing (no streaming, just state mutations)
    // Pass transcript messages to generate method (filter to valid ModelMessage roles)
    const modelMessages = transcript
      .filter((msg) => msg.role !== "tool") // Remove tool messages for generate call
      .map((msg) => ({
        role: msg.role as "system" | "user" | "assistant",
        content: msg.content,
      }));

    const result = await cma.getAgent().generate({
      messages: modelMessages,
    });

    // Persist any additional state changes from background processing
    if (cma.hasStateChanged(campaignState)) {
      console.log("[API] Background agent modified state, persisting changes");
      await db
        .update(runs)
        .set({
          state: cma.getCampaignState(),
          updatedAt: new Date(),
        })
        .where(eq(runs.id, run.id));
    }

    console.log("[API] Background state reconciliation completed", {
      toolCalls: result.toolCalls?.length || 0,
      stateChanged: cma.hasStateChanged(campaignState),
    });
  } catch (error) {
    console.error("[API] Background state reconciliation failed:", error);
    // Don't fail the main request if background processing fails
  }
}
