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

type ChatInterfaceProps = {
  gameChat: ReturnType<typeof useGameChat>;
};

/**
 * Extract visible narration from a UIMessage following AI SDK v6 patterns.
 * AI SDK v6 uses parts array exclusively - extract text parts only.
 * Returns both the narration string (or null) and a boolean indicating
 * whether the message has any visible content.
 */
function extractNarration(message: UIMessage): {
  narration: string | null;
  hasVisibleContent: boolean;
} {
  // Collect all non-empty text parts from message.parts (AI SDK v6 format)
  const textParts: string[] = [];
  if (message.parts && Array.isArray(message.parts)) {
    for (const part of message.parts) {
      if (
        part.type === "text" &&
        "text" in part &&
        typeof part.text === "string" &&
        part.text.trim().length > 0
      ) {
        textParts.push(part.text);
      }
    }
  }

  // Return narration from text parts
  if (textParts.length > 0) {
    return {
      narration: textParts.join("\n\n"),
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
              // Check if message has any visible tool parts (like skill checks)
              const hasVisibleToolParts = message.parts?.some((part) => {
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
                    (skillCheckPart.state === "result" ||
                      skillCheckPart.state === "output-available") &&
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

            // Extract narration using the shared helper
            const { narration } = extractNarration(message);

            // Render tool UI parts (skill checks, etc.) separately from narration
            const renderedToolParts = message.parts?.map((part, _i) => {
              // Render skill check as a custom typed part
              if (isSkillCheckPart(part)) {
                const skillCheckPart = part as SkillCheckToolPart;

                // Input-available state: show interactive dice UI
                if (
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

                // Result state: render a compact summary of the roll.
                if (
                  skillCheckPart.state === "result" ||
                  skillCheckPart.state === "output-available"
                ) {
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
                    {narration && (
                      <div className="prose prose-sm dark:prose-invert max-w-none wrap-break-words prose-p:my-2 prose-p:leading-relaxed prose-headings:my-3 prose-headings:font-semibold prose-h1:text-xl prose-h2:text-lg prose-h3:text-base prose-strong:font-semibold prose-em:italic prose-code:text-xs prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-pre:bg-muted prose-pre:p-3 prose-pre:rounded-lg prose-pre:overflow-x-auto prose-ul:my-2 prose-ol:my-2 prose-li:my-1 prose-li:leading-relaxed prose-a:text-primary prose-a:underline hover:prose-a:text-primary/80 text-sm">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {narration}
                        </ReactMarkdown>
                      </div>
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
