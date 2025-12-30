"use client";

import { useGameChat } from "@/hooks/use-game-chat";
import { Card, CardContent } from "@/components/ui/card";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
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
  type NarrativeSegment,
  type NarrativeData,
} from "@/types/narrative";
import { NarrativeContent } from "@/components/game/narrative-content";

type ChatInterfaceProps = {
  gameChat: ReturnType<typeof useGameChat>;
};

/**
 * Minimal safety net filter for obvious non-narrative text.
 * NOTE: This is a minimal safety net only. The primary defense against reasoning leaks
 * is the system prompt in game-master.ts. If reasoning leaks occur, fix the prompt, not this filter.
 */
function isReasoningText(text: string): boolean {
  const trimmed = text.trim();

  // Only catch very obvious standalone confirmation words (clearly not narrative)
  const confirmationPatterns = [/^yes$/i, /^no$/i, /^ok$/i, /^okay$/i];

  if (confirmationPatterns.some((pattern) => pattern.test(trimmed))) {
    return true;
  }

  // Only catch very obvious reasoning starters (clearly not narrative)
  const obviousReasoningPatterns = [/^i think/i, /^looking at/i];

  return obviousReasoningPatterns.some((pattern) => pattern.test(trimmed));
}

/**
 * Minimal safety net filter for obvious tool/mechanics meta-commentary.
 * NOTE: This is a minimal safety net only. The primary defense against reasoning leaks
 * is the system prompt in game-master.ts. If reasoning leaks occur, fix the prompt, not this filter.
 */
function isToolRelatedText(text: string): boolean {
  const trimmed = text.trim();

  // Only catch parenthetical text that contains mechanics keywords (obvious meta-commentary)
  // Example: "(Agility check requested, DC 18: ...)"
  if (/^\(.*\)$/.test(trimmed)) {
    const hasMechanicsKeywords =
      /(DC|check|roll|difficulty|skill|attribute)/i.test(trimmed);
    if (hasMechanicsKeywords) {
      return true;
    }
  }

  // Only catch very obvious tool execution meta-commentary (clearly not narrative)
  const obviousToolMetaPatterns = [
    /^tool response/i,
    /^tool execution/i,
    /^last tool/i,
    /^final output/i,
  ];

  return obviousToolMetaPatterns.some((pattern) => pattern.test(trimmed));
}

/**
 * Extract visible narration from a UIMessage following AI SDK v6 patterns.
 * Checks for structured narrative data from formatNarrativeTool and text parts.
 * Returns both the narration string (or null) and a boolean indicating
 * whether the message has any visible content.
 */
function extractNarration(message: UIMessage): {
  narration: string | null;
  hasVisibleContent: boolean;
} {
  // Collect narration segments from narrative tool parts and text parts
  const narrationTexts: string[] = [];

  if (message.parts && Array.isArray(message.parts)) {
    for (const part of message.parts) {
      if (isNarrativeToolPart(part)) {
        const extracted = extractNarrativeData(part as NarrativeToolPart);
        if (extracted) {
          // Extract only narration segments (not dialogs) for the fallback text
          for (const segment of extracted.segments) {
            if (segment.type === "narration") {
              narrationTexts.push(segment.text);
            }
          }
        }
      } else if (
        part.type === "text" &&
        "text" in part &&
        typeof part.text === "string" &&
        part.text.trim().length > 0
      ) {
        // Filter out reasoning text and tool-related text (skill check descriptions, mechanics mentions, etc.)
        if (!isReasoningText(part.text) && !isToolRelatedText(part.text)) {
          narrationTexts.push(part.text.trim());
        }
      }
    }
  }

  // Deduplicate narration segments
  const normalizedNarration = narrationTexts.map((text) =>
    text.trim().toLowerCase().replace(/\s+/g, " ")
  );
  const uniqueNarration: string[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < narrationTexts.length; i++) {
    const normalized = normalizedNarration[i];
    if (!seen.has(normalized)) {
      seen.add(normalized);
      uniqueNarration.push(narrationTexts[i]);
    }
  }

  if (uniqueNarration.length > 0) {
    return {
      narration: uniqueNarration.join("\n\n"),
      hasVisibleContent: true,
    };
  }

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
                  if (extracted && extracted.segments.length > 0) {
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

            // Extract structured narrative data from formatNarrativeTool
            // Process parts in order to preserve tool call sequence
            const orderedSegments: NarrativeSegment[] = [];

            if (message.parts && Array.isArray(message.parts)) {
              // Process parts in sequence to preserve order
              for (const part of message.parts) {
                // Skip internal metadata parts (step-start, reasoning, etc.)
                if (
                  part.type === "step-start" ||
                  part.type === "reasoning" ||
                  (typeof part.type === "string" &&
                    part.type.startsWith("step-"))
                ) {
                  continue;
                }

                if (isNarrativeToolPart(part)) {
                  const extracted = extractNarrativeData(
                    part as NarrativeToolPart
                  );
                  if (extracted && extracted.segments.length > 0) {
                    orderedSegments.push(...extracted.segments);
                  }
                } else if (
                  part.type === "text" &&
                  "text" in part &&
                  typeof part.text === "string" &&
                  part.text.trim().length > 0
                ) {
                  // Text parts are treated as narration and added in order
                  // Filter out reasoning text and tool-related text (skill check descriptions, mechanics mentions, etc.)
                  if (
                    !isReasoningText(part.text) &&
                    !isToolRelatedText(part.text)
                  ) {
                    orderedSegments.push({
                      type: "narration",
                      text: part.text.trim(),
                    });
                  }
                }
              }
            }

            // Deduplicate segments (normalize and compare)
            const normalizedSegments = orderedSegments.map((seg) => {
              if (seg.type === "narration") {
                return seg.text.trim().toLowerCase().replace(/\s+/g, " ");
              } else {
                return `${seg.character}:${seg.dialogue}`
                  .trim()
                  .toLowerCase()
                  .replace(/\s+/g, " ");
              }
            });
            const uniqueSegments: NarrativeSegment[] = [];
            const seen = new Set<string>();

            for (let i = 0; i < orderedSegments.length; i++) {
              const normalized = normalizedSegments[i];
              if (!seen.has(normalized)) {
                seen.add(normalized);
                uniqueSegments.push(orderedSegments[i]);
              }
            }

            // Create narrative data with ordered segments
            const narrativeData: NarrativeData | null =
              uniqueSegments.length > 0 ? { segments: uniqueSegments } : null;

            // Render tool UI parts (skill checks, etc.) separately from narration
            const renderedToolParts = message.parts?.map((part) => {
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
                    {narrativeData && <NarrativeContent data={narrativeData} />}

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
