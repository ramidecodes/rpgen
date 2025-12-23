"use client";

import { useGameChat } from "@/hooks/use-game-chat";
import { Card, CardContent } from "@/components/ui/card";
import { isToolUIPart } from "ai";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { SkillCheckInteractive } from "@/components/game/skill-check-interactive";
import { SkillCheckResult } from "@/components/game/skill-check-result";
import { useGameStore } from "@/lib/store/game-store";
import { isSkillCheckPart, type SkillCheckToolPart } from "@/types/skill-check";
import type { UIMessage } from "@/types/ui-message";
import { D20Anime } from "@/components/hero/d20-anime";
import {
  isNarrativeToolPart,
  extractNarrativeData,
  type NarrativeToolPart,
} from "@/types/narrative";
import { NarrativeContent } from "@/components/game/narrative-content";

type ChatInterfaceProps = {
  gameChat: ReturnType<typeof useGameChat>;
};

/**
 * Check if text appears to be internal reasoning/thinking that should be filtered out
 */
function isReasoningText(text: string): boolean {
  const reasoningPatterns = [
    /^looking at/i,
    /^i think/i,
    /^to be safe/i,
    /^since the/i,
    /^assume/i,
    /^for this thinking/i,
    /^now, for this/i,
    /^the system handles/i,
    /^the instruction is/i,
    /^no, the/i,
    /^but after/i,
  ];
  return reasoningPatterns.some((pattern) => pattern.test(text.trim()));
}

/**
 * Extract visible narration from a UIMessage following AI SDK v6 patterns.
 * AI SDK v6 uses parts array exclusively - extract text parts only.
 * Also checks for structured narrative data from formatNarrativeTool.
 * Combines ALL narrative tool calls and text parts in the message.
 * Returns both the narration string (or null) and a boolean indicating
 * whether the message has any visible content.
 */
function extractNarration(message: UIMessage): {
  narration: string | null;
  hasVisibleContent: boolean;
} {
  // Collect ALL narrative tool parts and combine them
  const allNarration: string[] = [];
  if (message.parts && Array.isArray(message.parts)) {
    for (const part of message.parts) {
      if (isNarrativeToolPart(part)) {
        const extracted = extractNarrativeData(part as NarrativeToolPart);
        if (extracted && extracted.narration.length > 0) {
          // Combine narration arrays from all tool calls
          allNarration.push(...extracted.narration);
        }
      }
    }
  }

  // Also collect text parts (they may come after tool calls)
  // Filter out reasoning text that shouldn't be displayed
  const textParts: string[] = [];
  if (message.parts && Array.isArray(message.parts)) {
    for (const part of message.parts) {
      if (
        part.type === "text" &&
        "text" in part &&
        typeof part.text === "string" &&
        part.text.trim().length > 0
      ) {
        // Filter out reasoning text
        if (!isReasoningText(part.text)) {
          textParts.push(part.text.trim());
        }
      }
    }
  }

  // Combine: narrative from tools + text parts
  // Deduplicate narration segments (normalize and compare)
  const combinedNarration = [...allNarration, ...textParts];
  const normalizedNarration = combinedNarration.map((text) =>
    text.trim().toLowerCase().replace(/\s+/g, " ")
  );
  const uniqueNarration: string[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < combinedNarration.length; i++) {
    const normalized = normalizedNarration[i];
    if (!seen.has(normalized)) {
      seen.add(normalized);
      uniqueNarration.push(combinedNarration[i]);
    }
  }

  if (uniqueNarration.length > 0) {
    return {
      narration: uniqueNarration.join("\n\n"),
      hasVisibleContent: true,
    };
  }

  // No visible narration found
  return {
    narration: null,
    hasVisibleContent: false,
  };
}

export function ChatInterface({ gameChat }: ChatInterfaceProps) {
  const { messages } = gameChat;
  const isLoading =
    "isLoading" in gameChat && typeof gameChat.isLoading === "boolean"
      ? gameChat.isLoading
      : false;
  const error =
    "error" in gameChat && gameChat.error ? gameChat.error : undefined;
  const { currentCharacter } = useGameStore();

  // Find the last assistant message (not just the last message overall)
  // This ensures we correctly detect when we're waiting for a NEW assistant response
  const lastAssistantMessage = [...messages]
    .reverse()
    .find((msg) => msg.role === "assistant");
  const { hasVisibleContent: lastAssistantHasContent } = lastAssistantMessage
    ? extractNarration(lastAssistantMessage)
    : { hasVisibleContent: false };

  // Show loader if loading and either:
  // - No assistant message exists yet, OR
  // - Last assistant message has no visible content (still streaming initial response)
  const shouldShowLoader =
    isLoading && (!lastAssistantMessage || !lastAssistantHasContent) && !error;
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const hasScrolledInitiallyRef = useRef(false);

  // Auto-scroll to bottom when new messages arrive
  const prevMessageCountRef = useRef(messages.length);
  useEffect(() => {
    if (messages.length !== prevMessageCountRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      prevMessageCountRef.current = messages.length;
    }
  }, [messages.length]);

  // Initial scroll on mount when messages are loaded
  useEffect(() => {
    if (!hasScrolledInitiallyRef.current && messages.length > 0) {
      // Use requestAnimationFrame to ensure DOM is ready
      requestAnimationFrame(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        hasScrolledInitiallyRef.current = true;
      });
    }
  }, [messages.length]);

  return (
    <div className="flex flex-col h-full">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {error && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {typeof error === "string"
              ? error
              : (error as { message?: unknown }).message &&
                typeof (error as { message?: unknown }).message === "string"
              ? (error as { message?: string }).message ?? ""
              : "The Game Master ran into an error. Please try again."}
          </div>
        )}

        {messages.length === 0 && !isLoading && (
          <div className="text-center text-muted-foreground py-8">
            <p>Preparing your adventure...</p>
          </div>
        )}

        {messages
          .filter((message) => {
            // Filter out messages with no parts (AI SDK v6 uses parts exclusively)
            if (
              !message.parts ||
              !Array.isArray(message.parts) ||
              message.parts.length === 0
            ) {
              return false;
            }

            // Filter out empty user messages (used to trigger initial GM message)
            // These are lightweight triggers sent after HITL tool output
            if (message.role === "user") {
              const { hasVisibleContent } = extractNarration(message);
              return hasVisibleContent;
            }
            // Filter out empty assistant messages that are currently being streamed
            // This prevents showing an empty card while the loader is displayed
            if (message.role === "assistant" && isLoading) {
              const { hasVisibleContent } = extractNarration(message);
              // Check if message has any visible tool parts (like skill checks, narrative tools)
              const hasVisibleToolParts = message.parts?.some((part) => {
                // Check for narrative tool parts
                if (isNarrativeToolPart(part)) {
                  const extracted = extractNarrativeData(
                    part as NarrativeToolPart
                  );
                  if (extracted && extracted.narration.length > 0) {
                    return true;
                  }
                }
                // Check for skill check parts
                if (isSkillCheckPart(part)) {
                  const skillCheckPart = part as SkillCheckToolPart;
                  // Show if it's in input-available state (needs user interaction)
                  if (
                    skillCheckPart.state === "input-available" &&
                    skillCheckPart.input
                  ) {
                    return true;
                  }
                  // Show if it has a result/output
                  if (
                    skillCheckPart.state === "output-available" &&
                    ("output" in skillCheckPart || "result" in skillCheckPart)
                  ) {
                    return true;
                  }
                }
                return false;
              });
              // Only filter out if it has no visible content AND no visible tool parts
              return hasVisibleContent || hasVisibleToolParts || false;
            }
            return true;
          })
          .map((message) => {
            const isUser = message.role === "user";

            // Check for structured narrative data from formatNarrativeTool
            // Collect ALL narrative tool parts and combine them
            const allNarration: string[] = [];
            const allDialogs: Array<{ character: string; dialogue: string }> =
              [];

            if (message.parts && Array.isArray(message.parts)) {
              // First pass: collect narrative data from formatNarrativeTool parts
              for (const part of message.parts) {
                // Skip internal metadata parts (step-start, reasoning, etc.)
                if (
                  part.type === "step-start" ||
                  part.type === "reasoning" ||
                  (typeof part.type === "string" && part.type.startsWith("step-"))
                ) {
                  continue;
                }

                if (isNarrativeToolPart(part)) {
                  const extracted = extractNarrativeData(
                    part as NarrativeToolPart
                  );
                  if (extracted) {
                    // Combine narration arrays from all tool calls
                    if (extracted.narration && extracted.narration.length > 0) {
                      allNarration.push(...extracted.narration);
                    }
                    // Combine dialog arrays from all tool calls
                    if (extracted.dialogs && extracted.dialogs.length > 0) {
                      allDialogs.push(...extracted.dialogs);
                    }
                  }
                }
              }

              // Also collect text parts (they may come after tool calls)
              // Filter out reasoning text that shouldn't be displayed
              for (const part of message.parts) {
                if (
                  part.type === "text" &&
                  "text" in part &&
                  typeof part.text === "string" &&
                  part.text.trim().length > 0
                ) {
                  // Filter out reasoning text
                  if (!isReasoningText(part.text)) {
                    allNarration.push(part.text.trim());
                  }
                }
              }
            }

            // Deduplicate narration segments (normalize and compare)
            const normalizedNarration = allNarration.map((text) =>
              text.trim().toLowerCase().replace(/\s+/g, " ")
            );
            const uniqueNarration: string[] = [];
            const seen = new Set<string>();

            for (let i = 0; i < allNarration.length; i++) {
              const normalized = normalizedNarration[i];
              if (!seen.has(normalized)) {
                seen.add(normalized);
                uniqueNarration.push(allNarration[i]);
              }
            }

            // Create narrative data if we have any content
            const narrativeData: {
              narration: string[];
              dialogs?: Array<{ character: string; dialogue: string }>;
            } | null =
              uniqueNarration.length > 0
                ? {
                    narration: uniqueNarration,
                    dialogs: allDialogs.length > 0 ? allDialogs : undefined,
                  }
                : null;

            // Extract narration using the shared helper (fallback for old messages)
            const { narration } = extractNarration(message);

            // Render tool UI parts (skill checks, etc.) separately from narration
            const renderedToolParts = message.parts?.map((part, _i) => {
              // Skip narrative tool parts - they're rendered separately
              if (isNarrativeToolPart(part)) {
                return null;
              }
              // Render skill check as a custom typed part
              if (isSkillCheckPart(part)) {
                const skillCheckPart = part as SkillCheckToolPart;

                // CRITICAL: Check for output-available FIRST
                // Only show interactive component if NO output exists for this toolCallId
                // Output-available state: render a compact summary of the roll.
                if (skillCheckPart.state === "output-available") {
                  // Canonical v6: HITL payload is on `output`.
                  // `result` is an optional fallback for any older data.
                  const rawResult =
                    "output" in skillCheckPart
                      ? (
                          skillCheckPart as {
                            output?: unknown;
                          }
                        ).output
                      : "result" in skillCheckPart
                      ? (
                          skillCheckPart as {
                            result?: unknown;
                          }
                        ).result
                      : undefined;

                  let detailMeta: {
                    rollValue?: number;
                    statValue?: number;
                    total?: number;
                    difficulty?: number;
                    success?: boolean;
                    attribute?: string;
                  } = {};

                  if (rawResult && typeof rawResult === "object") {
                    const typedResult = rawResult as {
                      rollValue?: number;
                      statValue?: number;
                      total?: number;
                      difficulty?: number;
                      success?: boolean;
                      attribute?: string;
                    };
                    detailMeta = {
                      rollValue: typedResult.rollValue,
                      statValue: typedResult.statValue,
                      total: typedResult.total,
                      difficulty: typedResult.difficulty,
                      success: typedResult.success,
                      attribute: typedResult.attribute,
                    };
                  }

                  // Render result if we have all required data
                  if (
                    detailMeta.rollValue !== undefined &&
                    detailMeta.statValue !== undefined &&
                    detailMeta.total !== undefined &&
                    detailMeta.difficulty !== undefined &&
                    detailMeta.success !== undefined &&
                    detailMeta.attribute
                  ) {
                    return (
                      <div
                        key={`${message.id}-skill-check-result-${
                          skillCheckPart.toolCallId ?? "pending"
                        }`}
                        className="mt-2"
                      >
                        <SkillCheckResult
                          rollValue={detailMeta.rollValue}
                          statValue={detailMeta.statValue}
                          total={detailMeta.total}
                          difficulty={detailMeta.difficulty}
                          success={detailMeta.success}
                          attribute={detailMeta.attribute}
                        />
                      </div>
                    );
                  }
                }

                // Input-available state: show interactive dice UI ONLY if no output exists
                // Check if there's another part with output for this toolCallId
                const hasOutputForThisToolCallId = message.parts?.some(
                  (otherPart) => {
                    if (isSkillCheckPart(otherPart)) {
                      const otherSkillCheck = otherPart as SkillCheckToolPart;
                      return (
                        otherSkillCheck.toolCallId ===
                          skillCheckPart.toolCallId &&
                        otherSkillCheck.state === "output-available" &&
                        ("output" in otherSkillCheck ||
                          "result" in otherSkillCheck)
                      );
                    }
                    return false;
                  }
                );

                // Only show interactive if no output exists for this toolCallId
                if (
                  !hasOutputForThisToolCallId &&
                  skillCheckPart.state === "input-available" &&
                  skillCheckPart.input
                ) {
                  const { input } = skillCheckPart;
                  if (
                    input.attribute &&
                    typeof input.difficulty === "number" &&
                    typeof input.reason === "string"
                  ) {
                    const attribute = input.attribute;
                    const characterStat =
                      currentCharacter?.stats?.[
                        attribute as keyof typeof currentCharacter.stats
                      ];

                    return (
                      <div
                        key={`${message.id}-skill-check-${
                          skillCheckPart.toolCallId ?? "pending"
                        }`}
                        className="mt-2"
                      >
                        <SkillCheckInteractive
                          attribute={attribute}
                          difficulty={input.difficulty}
                          reason={input.reason}
                          characterStat={characterStat}
                          toolCallId={skillCheckPart.toolCallId ?? ""}
                          onSubmitRoll={(rollValue) =>
                            gameChat.submitSkillCheckResult(
                              rollValue,
                              skillCheckPart.toolCallId ?? ""
                            )
                          }
                        />
                      </div>
                    );
                  }
                }
              }

              // Handle other tool parts
              // Internal tools like advanceFront, logEvent, etc. should
              // not be rendered in the UI. We still keep them in the
              // message history for state updates, but they are hidden
              // from the player-facing chat.
              if (isToolUIPart(part)) {
                return null;
              }

              return null;
            });

            return (
              <div
                key={message.id}
                className={cn("flex", isUser ? "justify-end" : "justify-start")}
              >
                <Card
                  className={cn(
                    "max-w-[80%]",
                    isUser ? "bg-primary text-primary-foreground" : "bg-muted"
                  )}
                >
                  <CardContent className="p-4">
                    {/* Render structured narrative if available */}
                    {narrativeData ? (
                      <NarrativeContent data={narrativeData} />
                    ) : (
                      /* Fallback to plain text narration for old messages */
                      narration && (
                        <div className="prose prose-base dark:prose-invert max-w-none wrap-break-words prose-p:my-4 prose-p:leading-relaxed prose-headings:my-4 prose-headings:font-semibold prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg prose-strong:font-semibold prose-em:italic prose-code:text-sm prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-pre:bg-muted prose-pre:p-4 prose-pre:rounded-lg prose-pre:overflow-x-auto prose-ul:my-3 prose-ol:my-3 prose-li:my-2 prose-li:leading-relaxed prose-a:text-primary prose-a:underline hover:prose-a:text-primary/80 text-base leading-relaxed">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {narration}
                          </ReactMarkdown>
                        </div>
                      )
                    )}

                    {renderedToolParts}
                  </CardContent>
                </Card>
              </div>
            );
          })}

        {shouldShowLoader && (
          <div className="flex justify-start">
            <Card className="relative overflow-hidden bg-muted">
              <CardContent className="relative z-10 flex items-center gap-4 p-4 min-h-5rem">
                <div className="flex h-20 w-20 shrink-0 items-center justify-center">
                  <D20Anime className="h-20 w-20" />
                </div>
                <span
                  className="text-sm font-medium text-muted-foreground"
                  aria-live="polite"
                >
                  Game Master is thinking...
                </span>
              </CardContent>
            </Card>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}
