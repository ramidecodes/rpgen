import { createAgentUIStreamResponse, type Agent } from "ai";
import { db } from "@/lib/db";
import {
  runs,
  characters,
  campaigns,
  universes,
  messages,
  scenes,
} from "@/lib/db/schema";
import { eq, desc, and, sql } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";
import { getUserProfileByClerkId } from "@/lib/db/queries/user-profile";
import { createGameMasterAgent } from "@/agents/game-master";
import {
  createCampaignManagerAgent,
  extractTextFromUIMessages,
} from "@/agents/campaign-manager";
import { getActiveQuestsByRunId } from "@/lib/db/queries/quests";
import {
  createVisualEngineAgent,
  extractCharacterAction,
  hasNarrativeText,
} from "@/agents/visual-engine";
import type { UIMessage, UIMessagePart } from "@/types/ui-message";
import { isTextUIPart, isToolUIPart } from "@/types/ui-message";
import {
  isNarrativeToolPart,
  extractNarrativeData,
  type NarrativeToolPart,
} from "@/types/narrative";
import type { CampaignState, KnowledgeGraph } from "@/lib/db/schemas/campaign";
import type { Run, Character, Campaign, Universe } from "@/lib/db/schema";
import { sseConnectionManager } from "@/lib/sse/connection-manager";

export async function POST(req: Request) {
  try {
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      console.error("[API] Unauthorized: No clerkUserId");
      return new Response("Unauthorized", { status: 401 });
    }

    const userProfile = await getUserProfileByClerkId(clerkUserId);
    if (!userProfile) {
      console.error("[API] User profile not found");
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
      console.error("[API] Invalid runId");
      return new Response("runId is required and must be a string", {
        status: 400,
      });
    }

    // Validate messages
    if (!incomingMessages || !Array.isArray(incomingMessages)) {
      console.error("[API] Invalid messages");
      return new Response("messages is required and must be an array", {
        status: 400,
      });
    }

    // Validate each message structure
    for (let i = 0; i < incomingMessages.length; i++) {
      const msg = incomingMessages[i];
      if (!msg || typeof msg !== "object") {
        console.error(`[API] Invalid message at index ${i}`);
        return new Response(`Invalid message structure at index ${i}`, {
          status: 400,
        });
      }
      if (!("role" in msg) || typeof msg.role !== "string") {
        console.error(`[API] Message at index ${i} missing role`);
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
      console.error("[API] Run not found");
      return new Response("Run not found", { status: 404 });
    }

    const { run, character, campaign, universe } = runData;

    // Verify ownership
    if (run.userId !== userProfile.id) {
      console.error("[API] Unauthorized: Run ownership mismatch");
      return new Response("Unauthorized", { status: 403 });
    }

    // Load existing messages for initial context (used for model preparation)
    const existingMessages = await db
      .select({
        id: messages.id,
        role: messages.role,
        content: messages.content,
      })
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

    // Reload messages for fresh deduplication (ensures incoming messages are filtered correctly)
    // Note: Database constraint will prevent duplicates atomically even if deduplication misses something
    const freshExistingMessages = await db
      .select({
        id: messages.id,
        role: messages.role,
        content: messages.content,
      })
      .from(messages)
      .where(eq(messages.runId, run.id))
      .orderBy(desc(messages.createdAt))
      .limit(50);

    const freshStoredMessages = freshExistingMessages.reverse().map((msg) => ({
      id: msg.id,
      role: msg.role as UIMessage["role"],
      parts: msg.content as UIMessage["parts"],
    }));

    // Deduplicate incoming messages before combining
    // Following AI SDK v6 best practices: validate and deduplicate before processing
    const deduplicatedIncoming = deduplicateIncomingMessages(
      incomingMessages,
      freshStoredMessages
    );

    // Persist user message before streaming (AI SDK v6 best practice)
    // Deduplication already filtered out duplicates, so we can persist directly
    const lastUserMessage = findLastMeaningfulUserMessage(deduplicatedIncoming);

    if (lastUserMessage && !isWhitespaceOnlyMessage(lastUserMessage)) {
      await persistMessage(run.id, lastUserMessage);
    }

    // CRITICAL: Merge tool results from incomingMessages into storedMessages in-memory
    // This ensures the agent sees tool results (e.g., skill check outcomes) when generating the response
    // Tool results are merged BEFORE creating processedMessages so the agent can continue the narrative
    const messagesWithToolResults = mergeToolResultsIntoMessages(
      storedMessages,
      deduplicatedIncoming
    );

    // CRITICAL: Only include NEW incoming messages (user messages and tool results)
    // Filter out any incoming messages that are already in messagesWithToolResults
    // This prevents duplicate assistant messages from being sent to the agent
    const newIncomingMessages = deduplicatedIncoming.filter((incoming) => {
      // Always include user messages (they're new actions)
      if (incoming.role === "user") {
        return true;
      }

      // For assistant messages, only include if they contain tool results that aren't already merged
      if (incoming.role === "assistant" && Array.isArray(incoming.parts)) {
        // Check if this message has tool results that aren't in messagesWithToolResults
        const hasNewToolResults = incoming.parts.some((part) => {
          if (!isToolUIPart(part)) {
            return false;
          }
          const toolPart = part as {
            toolCallId?: string;
            state?: string;
            output?: unknown;
            result?: unknown;
          };
          // Only include if it has output and isn't already in messagesWithToolResults
          const hasOutput =
            toolPart.output !== undefined || toolPart.result !== undefined;
          const hasValidState =
            toolPart.state === "output-available" ||
            toolPart.state === "result";
          if (hasOutput && hasValidState && toolPart.toolCallId) {
            // Check if this toolCallId is already in messagesWithToolResults
            const alreadyMerged = messagesWithToolResults.some((msg) => {
              if (
                msg.role !== "assistant" ||
                !msg.parts ||
                !Array.isArray(msg.parts)
              ) {
                return false;
              }
              return msg.parts.some((p) => {
                if (!isToolUIPart(p)) {
                  return false;
                }
                const pTyped = p as { toolCallId?: string };
                return pTyped.toolCallId === toolPart.toolCallId;
              });
            });
            return !alreadyMerged;
          }
          return false;
        });
        return hasNewToolResults;
      }

      // Exclude other assistant messages (they're already in messagesWithToolResults)
      return false;
    });

    // Combine messages: stored messages with merged tool results + only new incoming messages
    let processedMessages = prepareMessagesForModel([
      ...messagesWithToolResults,
      ...newIncomingMessages,
    ]);

    // CRITICAL: Deduplicate assistant messages to prevent repetitive responses
    // Keep only the most recent assistant message for each unique content
    processedMessages = deduplicateAssistantMessages(processedMessages);

    // CRITICAL: Check for consecutive skill checks and add context to prevent duplicates
    // If the last assistant message contains a skill check, the system prompt will handle it
    // This check ensures we're aware of the situation for logging/debugging
    const lastAssistantMessage = processedMessages
      .filter((msg) => msg.role === "assistant")
      .pop();
    if (lastAssistantMessage && Array.isArray(lastAssistantMessage.parts)) {
      const hasSkillCheckInLastMessage = lastAssistantMessage.parts.some(
        (part) => {
          if (!isToolUIPart(part)) return false;
          const toolPart = part as {
            toolName?: string;
            state?: string;
          };
          return (
            toolPart.toolName === "requestSkillCheck" &&
            (toolPart.state === "input-available" ||
              toolPart.state === "output-available")
          );
        }
      );
      if (hasSkillCheckInLastMessage) {
        // System prompt should prevent duplicate skill checks
      }
    }

    // CRITICAL: Ensure processedMessages is never empty
    // createAgentUIStreamResponse requires at least one message
    // This can happen when whitespace trigger messages are filtered and no stored messages exist
    if (processedMessages.length === 0) {
      console.warn(
        "[API] processedMessages is empty after filtering, adding synthetic initial message"
      );
      processedMessages = [
        {
          id: "synthetic-initial-message",
          role: "user" as const,
          parts: [
            {
              type: "text",
              text: " ",
            },
          ],
        },
      ];
    }

    // Check for empty initial message (unused for now, but function is available)
    const _isEmptyInitialMessage =
      checkForEmptyInitialMessage(incomingMessages);

    // Query active quests for read-only context (GMA narrative awareness)
    const activeQuests = await getActiveQuestsByRunId(run.id);

    // Build campaignState from separate columns for in-memory state management
    const EMPTY_KNOWLEDGE_GRAPH: KnowledgeGraph = { nodes: [], edges: [] };
    const rawKnowledgeGraph =
      (run.relationships as KnowledgeGraph | null) ?? EMPTY_KNOWLEDGE_GRAPH;

    const campaignState: CampaignState = {
      activeFronts: run.activeFronts || [],
      narrativeVectors: run.narrativeVectors || { hope: 0.5, chaos: 0.5 },
      knowledgeGraph: rawKnowledgeGraph,
      currentContext: run.currentContext || null,
    };

    // Create Game Master Agent (GMA) - Narration only, no state mutations
    // GMA has read-only access to quests and state for narrative context
    const gma = createGameMasterAgent({
      runId,
      campaign,
      character,
      universe,
      campaignState,
      activeQuests, // Read-only quest context for narrative awareness
    });

    // Create the streaming response
    const response = createAgentUIStreamResponse({
      agent: gma.getAgent() as unknown as Agent<
        never,
        Record<string, never>,
        never
      >,
      uiMessages: processedMessages,
      onFinish: async (result) => {
        // Process incomingMessages for tool-result parts for DB persistence
        // Note: Tool results were already merged in-memory before agent execution
        // (see mergeToolResultsIntoMessages call above) so the agent could see them.
        // This DB persistence ensures tool results are saved to the database.
        await processIncomingMessagesForToolResults(run.id, incomingMessages);

        // User messages are already persisted before streaming (AI SDK v6 best practice)
        // Only persist assistant message here

        // Persist assistant message from result.responseMessage (AI SDK v6 best practice)
        // This is the NEW message generated by the agent, not historical messages
        if (result.responseMessage) {
          await persistAssistantMessage(run.id, result.responseMessage);
        }

        // Build complete message context including latest assistant message
        const allRecentMessages: UIMessage[] = result.responseMessage
          ? [...processedMessages, result.responseMessage]
          : processedMessages;

        // GMA does NOT modify state - no state persistence needed here
        // All state mutations are handled by CMA in background

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
 * Deduplicate assistant messages to prevent repetitive responses
 * Keeps only the most recent assistant message when multiple have similar content
 * This prevents the agent from seeing duplicate assistant messages and repeating itself
 */
function deduplicateAssistantMessages(messages: UIMessage[]): UIMessage[] {
  const deduplicated: UIMessage[] = [];
  const seenAssistantContent = new Set<string>();

  // Process messages in reverse order (most recent first) to keep latest versions
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];

    if (msg.role !== "assistant") {
      // Always keep non-assistant messages
      deduplicated.unshift(msg);
      continue;
    }

    // For assistant messages, create a content signature
    const contentSignature = createMessageContentSignature(msg);
    if (!seenAssistantContent.has(contentSignature)) {
      seenAssistantContent.add(contentSignature);
      deduplicated.unshift(msg);
    }
  }

  return deduplicated;
}

/**
 * Create a content signature for a message to detect duplicates
 * Normalizes the message content for comparison
 */
function createMessageContentSignature(message: UIMessage): string {
  if (!Array.isArray(message.parts)) {
    return `empty-${message.id || "no-id"}`;
  }

  // Extract and normalize text from narrative tool parts
  const narrativeTexts: string[] = [];
  const dialogTexts: string[] = [];

  for (const part of message.parts) {
    if (isNarrativeToolPart(part)) {
      const extracted = extractNarrativeData(part as NarrativeToolPart);
      if (extracted) {
        narrativeTexts.push(
          ...extracted.narration.map((n) => n.trim().toLowerCase())
        );
        if (extracted.dialogs) {
          dialogTexts.push(
            ...extracted.dialogs.map((d) =>
              `${d.character}:${d.dialogue}`.trim().toLowerCase()
            )
          );
        }
      }
    } else if (isTextUIPart(part)) {
      const text = part.text.trim().toLowerCase();
      if (text.length > 0) {
        narrativeTexts.push(text);
      }
    }
  }

  // Create signature from normalized content
  const allTexts = [...narrativeTexts, ...dialogTexts].sort().join("|");
  return `${message.role}-${allTexts.length > 0 ? allTexts : "empty"}`;
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

      // Also extract text from formatNarrativeTool parts
      // This handles the new structured narrative format
      const narrativeTextParts: string[] = [];
      if (Array.isArray(msg.parts)) {
        for (const part of msg.parts) {
          if (isNarrativeToolPart(part)) {
            const extracted = extractNarrativeData(part as NarrativeToolPart);
            if (extracted && extracted.narration.length > 0) {
              // Join all narration segments with spaces
              narrativeTextParts.push(...extracted.narration);
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
      // Check if it has non-empty parts and is not whitespace-only
      if (
        Array.isArray(msg.parts) &&
        msg.parts.length > 0 &&
        !isWhitespaceOnlyMessage(msg)
      ) {
        return msg;
      }
    }
  }
  return null;
}

/**
 * Check if a message is whitespace-only (used for trigger messages)
 */
function isWhitespaceOnlyMessage(message: UIMessage): boolean {
  if (!Array.isArray(message.parts) || message.parts.length === 0) {
    return true;
  }

  // Check if all text parts are empty/whitespace
  const hasNonEmptyText = message.parts.some((part) => {
    if (isTextUIPart(part)) {
      return part.text.trim().length > 0;
    }
    // Non-text parts (like tool parts) are not considered whitespace
    return true;
  });

  return !hasNonEmptyText;
}

/**
 * Deduplicate incoming messages against stored messages
 * Returns only messages that don't already exist in stored messages
 * Uses ID-based matching first, then content-based matching
 * This runs BEFORE combining messages for processing to prevent duplicates
 */
function deduplicateIncomingMessages(
  incomingMessages: UIMessage[],
  storedMessages: Array<{ id?: string; role: string; parts?: unknown }>
): UIMessage[] {
  // Convert storedMessages to format expected by isMessageInHistory (with content field)
  const storedMessagesForComparison = storedMessages.map((msg) => ({
    id: msg.id,
    role: msg.role,
    content: msg.parts, // Use parts as content for comparison
  }));

  return incomingMessages.filter((incoming) => {
    // Filter out whitespace-only messages (trigger messages from skill check submission)
    // These should never be persisted or processed
    if (incoming.role === "user" && isWhitespaceOnlyMessage(incoming)) {
      return false;
    }

    // Phase 1: ID-based check (most reliable)
    if (incoming.id) {
      const existsById = storedMessages.some(
        (stored) => stored.id === incoming.id
      );
      if (existsById) {
        return false;
      }
    }

    // Phase 2: Content-based check (for messages without IDs)
    const isDuplicate = isMessageInHistory(
      incoming,
      storedMessagesForComparison
    );
    if (isDuplicate) {
      return false;
    }

    return true;
  });
}

/**
 * Check if a message already exists in the existing messages history
 * Uses ID-based matching first, then content-based matching
 * This avoids expensive DB queries by using already-loaded existingMessages
 * Checks ALL messages of the same role, not just the most recent
 */
function isMessageInHistory(
  message: UIMessage,
  existingMessages: Array<{ id?: string; role: string; content: unknown }>
): boolean {
  // Phase 1: ID-based check (most reliable)
  if (message.id) {
    const existsById = existingMessages.some(
      (existing) => existing.id === message.id
    );
    if (existsById) {
      return true;
    }
  }

  // Phase 2: Content-based check (fallback for messages without IDs)
  const messagesOfSameRole = existingMessages.filter(
    (existing) => existing.role === message.role
  );

  if (messagesOfSameRole.length === 0) {
    return false;
  }

  const messageContent = message.parts || [];
  const messageParts = Array.isArray(messageContent) ? messageContent : [];

  // Check against ALL messages of the same role, not just the most recent
  for (const existing of messagesOfSameRole) {
    const existingContent = existing.content;
    const existingParts = Array.isArray(existingContent) ? existingContent : [];

    // Normalize text content for better matching
    // Extract and normalize text from text parts (trim, lowercase for comparison)
    const normalizeTextParts = (parts: unknown[]): string[] => {
      return parts
        .filter((part) => {
          if (typeof part === "object" && part !== null) {
            const typedPart = part as { type?: string; text?: string };
            return (
              typedPart.type === "text" && typeof typedPart.text === "string"
            );
          }
          return false;
        })
        .map((part) => {
          const typedPart = part as { text: string };
          return typedPart.text.trim().toLowerCase();
        })
        .filter((text) => text.length > 0)
        .sort();
    };

    const incomingTexts = normalizeTextParts(messageParts);
    const existingTexts = normalizeTextParts(existingParts);

    // If both have text parts, compare normalized text content
    if (incomingTexts.length > 0 && existingTexts.length > 0) {
    if (
      incomingTexts.length === existingTexts.length &&
      incomingTexts.every((text, i) => text === existingTexts[i])
    ) {
      return true;
    }
    }

    // Fallback: Normalize parts for comparison (handle property ordering differences)
    // Sort by type to ensure consistent comparison regardless of part order
    const normalizedIncoming = JSON.stringify(
      messageParts.sort((a, b) => {
        const aType = (a as { type?: string })?.type || "";
        const bType = (b as { type?: string })?.type || "";
        return aType.localeCompare(bType);
      })
    );
    const normalizedExisting = JSON.stringify(
      existingParts.sort((a, b) => {
        const aType = (a as { type?: string })?.type || "";
        const bType = (b as { type?: string })?.type || "";
        return aType.localeCompare(bType);
      })
    );

    if (normalizedIncoming === normalizedExisting) {
      return true;
    }
  }

  return false;
}

/**
 * Persist a message to the database
 * For user messages: uses application-level deduplication (already checked before calling)
 * For assistant messages: always inserts (they're always new messages from the AI)
 * Returns true if inserted, false if skipped (shouldn't happen in normal flow)
 */
async function persistMessage(
  runId: string,
  message: UIMessage
): Promise<boolean> {
  try {
    await db.insert(messages).values({
      runId,
      role: message.role,
      content: message.parts || [],
    });
    return true;
  } catch (error) {
    console.error("[API] Error persisting message:", error);
    throw error;
  }
}

/**
 * Merge tool results from incomingMessages into storedMessages in-memory
 * This ensures the agent sees tool results when generating the response
 * Returns updated storedMessages array with tool results merged
 */
function mergeToolResultsIntoMessages(
  storedMessages: UIMessage[],
  incomingMessages: UIMessage[]
): UIMessage[] {
  // Create a copy to avoid mutating the original
  const mergedMessages = [...storedMessages];

  // Scan all incomingMessages for assistant messages with tool-result parts
  for (const incomingMessage of incomingMessages) {
    if (
      incomingMessage.role !== "assistant" ||
      !incomingMessage.parts ||
      !Array.isArray(incomingMessage.parts)
    ) {
      continue;
    }

    // Find tool parts with output-available state
    const toolPartsWithOutput = incomingMessage.parts.filter((part) => {
      if (!isToolUIPart(part)) {
        return false;
      }

      const toolPart = part as {
        toolCallId?: string;
        state?: string;
        output?: unknown;
        result?: unknown;
      };

      // Check for output-available state with valid output and toolCallId
      const hasOutput =
        toolPart.output !== undefined || toolPart.result !== undefined;
      const hasValidState =
        toolPart.state === "output-available" || toolPart.state === "result";
      const hasToolCallId =
        typeof toolPart.toolCallId === "string" &&
        toolPart.toolCallId.length > 0;

      return hasOutput && hasValidState && hasToolCallId;
    });

    if (toolPartsWithOutput.length === 0) {
      continue;
    }

    // Process each tool part with output
    for (const toolPart of toolPartsWithOutput) {
      const typedToolPart = toolPart as {
        toolCallId: string;
        state: string;
        output?: unknown;
        result?: unknown;
        type?: string;
      };

      const toolCallId = typedToolPart.toolCallId;

      // Find existing message in storedMessages with matching toolCallId
      const existingMessageIndex = mergedMessages.findIndex((msg) => {
        if (
          msg.role !== "assistant" ||
          !msg.parts ||
          !Array.isArray(msg.parts)
        ) {
          return false;
        }

        return msg.parts.some((part) => {
          if (!isToolUIPart(part)) {
            return false;
          }
          const typedPart = part as { toolCallId?: string };
          return typedPart.toolCallId === toolCallId;
        });
      });

      if (existingMessageIndex !== -1) {
        // Merge tool result into existing message
        const existingMessage = mergedMessages[existingMessageIndex];
        const existingParts = existingMessage.parts || [];

        // Check if tool-result part already exists for this toolCallId
        const hasExistingResult = existingParts.some((part) => {
          if (isToolUIPart(part)) {
            const typedPart = part as {
              toolCallId?: string;
              type?: string;
              state?: string;
            };
            return (
              typedPart.toolCallId === toolCallId &&
              (typedPart.type === "tool-result" ||
                typedPart.state === "output-available")
            );
          }
          return false;
        });

        let updatedParts: UIMessagePart[];

        if (hasExistingResult) {
          // Update existing tool-result part
          updatedParts = existingParts.map((part) => {
            if (isToolUIPart(part)) {
              const typedPart = part as {
                toolCallId?: string;
                type?: string;
                state?: string;
              };
              if (
                typedPart.toolCallId === toolCallId &&
                (typedPart.type === "tool-result" ||
                  typedPart.state === "output-available")
              ) {
                // Update existing tool-result part
                return {
                  ...part,
                  state: "output-available",
                  output: typedToolPart.output ?? typedToolPart.result,
                } as UIMessagePart;
              }
            }
            return part;
          }) as UIMessagePart[];
        } else {
          // Add new tool-result part to existing parts
          updatedParts = [
            ...existingParts,
            toolPart as UIMessagePart,
          ] as UIMessagePart[];
        }

        // Update the message in the merged array
        mergedMessages[existingMessageIndex] = {
          ...existingMessage,
          parts: updatedParts,
        };
      }
    }
  }

  return mergedMessages;
}

/**
 * Process incomingMessages for tool-result parts from addToolOutput
 * When addToolOutput is called, the tool-result is added to the client's message history
 * and appears in incomingMessages. We need to merge these into existing messages in the database.
 * This function persists the merged results to the database.
 */
async function processIncomingMessagesForToolResults(
  runId: string,
  incomingMessages: UIMessage[]
): Promise<void> {
  // Scan all incomingMessages for assistant messages with tool-result parts
  for (const message of incomingMessages) {
    if (
      message.role !== "assistant" ||
      !message.parts ||
      !Array.isArray(message.parts)
    ) {
      continue;
    }

    // Find tool parts with output-available state
    const toolPartsWithOutput = message.parts.filter((part) => {
      if (!isToolUIPart(part)) {
        return false;
      }

      const toolPart = part as {
        toolCallId?: string;
        state?: string;
        output?: unknown;
        result?: unknown;
      };

      // Check for output-available state with valid output and toolCallId
      const hasOutput =
        toolPart.output !== undefined || toolPart.result !== undefined;
      const hasValidState =
        toolPart.state === "output-available" || toolPart.state === "result";
      const hasToolCallId =
        typeof toolPart.toolCallId === "string" &&
        toolPart.toolCallId.length > 0;

      return hasOutput && hasValidState && hasToolCallId;
    });

    if (toolPartsWithOutput.length === 0) {
      continue;
    }

    // Process each tool part with output
    for (const toolPart of toolPartsWithOutput) {
      const typedToolPart = toolPart as {
        toolCallId: string;
        state: string;
        output?: unknown;
        result?: unknown;
        type?: string;
      };

      const toolCallId = typedToolPart.toolCallId;

      // Find existing message with matching toolCallId using parameterized query
      // Use proper parameterization to avoid SQL injection
      // Note: Drizzle's sql template parameterizes ${toolCallId}, but for JSONB text comparison
      // we need to ensure it's treated as a string literal
      const existingMessage = await db
        .select()
        .from(messages)
        .where(
          and(
            eq(messages.runId, runId),
            eq(messages.role, "assistant"),
            sql`EXISTS (
              SELECT 1 
              FROM jsonb_array_elements(${messages.content}) AS part
              WHERE part->>'toolCallId' = ${sql.raw(
                `'${toolCallId.replace(/'/g, "''")}'`
              )}
            )`
          )
        )
        .limit(1)
        .then((results) => results[0] || null);

      if (existingMessage) {
        // Get existing parts
        const existingParts = existingMessage.content as UIMessagePart[];

        // Check if tool-result part already exists for this toolCallId
        const hasExistingResult = existingParts.some((part) => {
          if (isToolUIPart(part)) {
            const typedPart = part as { toolCallId?: string; type?: string };
            return (
              typedPart.toolCallId === toolCallId &&
              (typedPart.type === "tool-result" ||
                (part as { state?: string }).state === "output-available")
            );
          }
          return false;
        });

        let updatedParts: UIMessagePart[];

        if (hasExistingResult) {
          // Update existing tool-result part
          updatedParts = existingParts.map((part) => {
            if (isToolUIPart(part)) {
              const typedPart = part as {
                toolCallId?: string;
                type?: string;
                state?: string;
              };
              if (
                typedPart.toolCallId === toolCallId &&
                (typedPart.type === "tool-result" ||
                  typedPart.state === "output-available")
              ) {
                // Update existing tool-result part
                return {
                  ...part,
                  state: "output-available",
                  output: typedToolPart.output ?? typedToolPart.result,
                } as UIMessagePart;
              }
            }
            return part;
          }) as UIMessagePart[];
        } else {
          // Add new tool-result part to existing parts
          updatedParts = [
            ...existingParts,
            toolPart as UIMessagePart,
          ] as UIMessagePart[];
        }

        await db
          .update(messages)
          .set({ content: updatedParts })
          .where(eq(messages.id, existingMessage.id));
      }
    }
  }
}

/**
 * Persist assistant message from AI SDK v6 responseMessage
 * This follows AI SDK v6 best practices: only persist the NEW message from result.responseMessage
 * Implements update-by-toolCallId pattern for HITL tool outputs to merge results into existing messages
 */
async function persistAssistantMessage(
  runId: string,
  responseMessage: UIMessage
): Promise<void> {
  if (!responseMessage || responseMessage.role !== "assistant") {
    return;
  }

  // Check if message has tool parts
  if (!responseMessage.parts || !Array.isArray(responseMessage.parts)) {
    // No parts or invalid structure - insert normally
    await persistMessage(runId, responseMessage);
    return;
  }

  // Find HITL tool parts with output-available state that need special handling
  // Non-HITL tools (like suggestActions) already have their results in the message parts
  // and should be persisted normally without special handling
  const hitlToolPartsWithOutput = responseMessage.parts.filter((part) => {
    if (!isToolUIPart(part)) {
      return false;
    }

    const toolPart = part as {
      toolCallId?: string;
      state?: string;
      output?: unknown;
      result?: unknown;
    };

    // Only process HITL tools that have output-available state
    // These need special handling to merge with existing messages
    const hasOutput =
      toolPart.output !== undefined || toolPart.result !== undefined;
    const hasValidState =
      toolPart.state === "output-available" || toolPart.state === "result";
    const hasToolCallId =
      typeof toolPart.toolCallId === "string" && toolPart.toolCallId.length > 0;

    return hasOutput && hasValidState && hasToolCallId;
  });

  // If no HITL tool parts with output found, insert message normally
  // This includes non-HITL tool results which are already complete in the message
  if (hitlToolPartsWithOutput.length === 0) {
    await persistMessage(runId, responseMessage);
    return;
  }

  // Process each HITL tool part with output separately
  // Track which toolCallIds were successfully updated
  const updatedToolCallIds = new Set<string>();
  const toolCallIdsToProcess = new Set<string>();

  for (const toolPart of hitlToolPartsWithOutput) {
    const typedToolPart = toolPart as {
      toolCallId: string;
      state: string;
      output?: unknown;
      result?: unknown;
      type?: string;
    };

    const toolCallId = typedToolPart.toolCallId;
    toolCallIdsToProcess.add(toolCallId);

    // Find existing message with matching toolCallId in ANY tool part
    // Use JSONB path query to search for toolCallId in any element of the parts array
    // Use proper parameterization with SQL escaping to avoid SQL injection
    // Note: We escape single quotes in toolCallId to prevent SQL injection
    const existingMessage = await db
      .select()
      .from(messages)
      .where(
        and(
          eq(messages.runId, runId),
          eq(messages.role, "assistant"),
          sql`EXISTS (
            SELECT 1 
            FROM jsonb_array_elements(${messages.content}) AS part
            WHERE part->>'toolCallId' = ${sql.raw(
              `'${toolCallId.replace(/'/g, "''")}'`
            )}
          )`
        )
      )
      .limit(1)
      .then((results) => results[0] || null);

    if (existingMessage) {
      // Get existing parts
      const existingParts = existingMessage.content as UIMessagePart[];

      // Check if tool-result part already exists for this toolCallId
      const hasExistingResult = existingParts.some((part) => {
        if (isToolUIPart(part)) {
          const typedPart = part as { toolCallId?: string; type?: string };
          return (
            typedPart.toolCallId === toolCallId &&
            (typedPart.type === "tool-result" ||
              (part as { state?: string }).state === "output-available")
          );
        }
        return false;
      });

      let updatedParts: UIMessagePart[];

      if (hasExistingResult) {
        // Update existing tool-result part
        updatedParts = existingParts.map((part) => {
          if (isToolUIPart(part)) {
            const typedPart = part as {
              toolCallId?: string;
              type?: string;
              state?: string;
            };
            if (
              typedPart.toolCallId === toolCallId &&
              (typedPart.type === "tool-result" ||
                typedPart.state === "output-available")
            ) {
              // Update existing tool-result part
              return {
                ...part,
                state: "output-available",
                output: typedToolPart.output ?? typedToolPart.result,
              } as UIMessagePart;
            }
          }
          return part;
        }) as UIMessagePart[];
      } else {
        // Add new tool-result part to existing parts
        // Preserve all existing parts and add the tool-result part from responseMessage
        // Use the tool part directly from responseMessage since it's already properly typed
        updatedParts = [
          ...existingParts,
          toolPart as UIMessagePart,
        ] as UIMessagePart[];
      }

      await db
        .update(messages)
        .set({ content: updatedParts })
        .where(eq(messages.id, existingMessage.id));

      updatedToolCallIds.add(toolCallId);
    }
  }

  // If any tool part with output didn't find a match, insert the message once
  if (updatedToolCallIds.size < toolCallIdsToProcess.size) {
    await persistMessage(runId, responseMessage);
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
    // Extract text from UIMessage parts for CMA processing
    const modelMessages = extractTextFromUIMessages(recentMessages, 20);

    // Skip if no meaningful messages to process
    if (modelMessages.length === 0) {
      return;
    }

    // Query active quests for CMA state management context
    const activeQuests = await getActiveQuestsByRunId(run.id);

    // Create Campaign Manager Agent with current state and active quests
    // The agent will create a deep copy internally for comparison
    const cma = createCampaignManagerAgent({
      runId: run.id,
      campaign,
      character,
      universe,
      campaignState,
      activeQuests, // Full quest context for state management
      recentMessages,
    });

    // Get original state copy for comparison
    const originalState = cma.getOriginalState();

    // Execute background processing (no streaming, just state mutations)
    await cma.getAgent().generate({
      messages: modelMessages,
    });

    // Persist any additional state changes from background processing
    // Compare against the original state copy
    // Note: Quest changes are persisted directly by quest tools, so we only persist JSONB columns
    if (cma.hasStateChanged(originalState)) {
      const updatedState = cma.getCampaignState();

      // Persist to separate columns (not state JSONB)
      await db
        .update(runs)
        .set({
          relationships: updatedState.knowledgeGraph,
          activeFronts: updatedState.activeFronts,
          narrativeVectors: updatedState.narrativeVectors,
          currentContext: updatedState.currentContext,
          updatedAt: new Date(),
        })
        .where(eq(runs.id, run.id));

      // Notify subscribed clients via SSE about the state change
      try {
        await sseConnectionManager.broadcast(run.id, {
          type: "campaign-state-updated",
          data: {
            state: updatedState,
          },
        });
      } catch (broadcastError) {
        console.error("[API] Failed to broadcast campaign state SSE event", {
          runId: run.id,
        });
      }
    }
  } catch (error) {
    console.error("[API] Background state reconciliation failed:", error);
    // Don't fail the main request if background processing fails
  }
}

/**
 * Helper function to detect pending skill checks in messages
 * Returns true if a skill check is requested but outcome is not yet explained
 */
function hasPendingSkillCheck(messages: UIMessage[]): boolean {
  // Check last 10 messages for skill check patterns
  const recentMessages = messages.slice(-10);

  for (const message of recentMessages) {
    if (!Array.isArray(message.parts)) continue;

    for (const part of message.parts) {
      if (isToolUIPart(part)) {
        const toolPart = part as {
          toolName?: string;
          toolCallId?: string;
          state?: string;
        };

        // Check if this is a requestSkillCheck tool call with input-available state
        if (
          toolPart.toolName === "requestSkillCheck" &&
          toolPart.toolCallId &&
          toolPart.state === "input-available"
        ) {
          // Check if corresponding outcome exists in subsequent messages
          const toolCallId = toolPart.toolCallId;
          const hasOutcome = recentMessages.some((msg) => {
            if (!Array.isArray(msg.parts)) return false;
            return msg.parts.some((p) => {
              if (isToolUIPart(p)) {
                const pTool = p as {
                  toolCallId?: string;
                  state?: string;
                };
                return (
                  pTool.toolCallId === toolCallId &&
                  pTool.state === "output-available"
                );
              }
              return false;
            });
          });

          // If skill check requested but outcome not found, it's pending
          if (!hasOutcome) {
            return true;
          }
        }
      }
    }
  }

  return false;
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
      return;
    }

    // Early exit: Skip VEA if there's a pending skill check
    // Conservative generation: wait for complete narrative moments
    if (hasPendingSkillCheck(recentMessages)) {
      return;
    }

    // Extract character action from the latest user message
    const characterAction = extractCharacterAction(incomingMessages);

    // Get current scene for comparison
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
    await vea.getAgent().generate({
      messages: veaMessages,
    });
  } catch (error) {
    console.error("[API] Visual Engine Agent failed:", error);
    // Don't fail the main request if visual processing fails
  }
}

