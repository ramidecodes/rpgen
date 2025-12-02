"use client";

import { useGameChat } from "@/hooks/use-game-chat";
import { Card, CardContent } from "@/components/ui/card";
import { isToolUIPart } from "ai";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { animate } from "animejs";
import { SkillCheckInteractive } from "@/components/game/skill-check-interactive";
import { useGameStore } from "@/lib/store/game-store";
import { isSkillCheckPart, type SkillCheckToolPart } from "@/types/skill-check";

type ChatInterfaceProps = {
  gameChat: ReturnType<typeof useGameChat>;
};

export function ChatInterface({ gameChat }: ChatInterfaceProps) {
  const { messages } = gameChat;
  const isLoading =
    "isLoading" in gameChat && typeof gameChat.isLoading === "boolean"
      ? gameChat.isLoading
      : false;
  const error =
    "error" in gameChat && gameChat.error ? gameChat.error : undefined;
  const { currentCharacter } = useGameStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const loaderRef = useRef<HTMLDivElement>(null);
  const diceContainerRef = useRef<HTMLDivElement>(null);
  const particleContainerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const loaderAnimationRefs = useRef<Array<ReturnType<typeof animate> | null>>(
    []
  );

  // Auto-scroll to bottom when new messages arrive
  const prevMessageCountRef = useRef(messages.length);
  useEffect(() => {
    if (messages.length !== prevMessageCountRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      prevMessageCountRef.current = messages.length;
    }
  }, [messages.length]);

  // AnimeJS dice-themed loader animation
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    if (!isLoading) {
      // Cleanup animations when not loading
      loaderAnimationRefs.current.forEach((anim) => {
        if (anim) {
          anim.pause();
        }
      });
      loaderAnimationRefs.current = [];
      return;
    }

    // Small delay to ensure DOM is ready
    timeoutId = setTimeout(() => {
      if (
        !diceContainerRef.current ||
        !particleContainerRef.current ||
        !textRef.current
      ) {
        return;
      }

      // Clear any existing animations
      loaderAnimationRefs.current.forEach((anim) => {
        if (anim) {
          anim.pause();
        }
      });
      loaderAnimationRefs.current = [];

      const dice = diceContainerRef.current.querySelectorAll(".dice-element");
      const particles =
        particleContainerRef.current.querySelectorAll(".particle");
      const text = textRef.current;
      const glow = glowRef.current;

      if (dice.length > 0) {
        // Staggered entrance animation for dice (start visible, just animate scale and rotation)
        dice.forEach((die, index) => {
          const entranceAnim = animate(die, {
            scale: [0.5, 1],
            rotate: [0, 360],
            duration: 600,
            delay: index * 100,
            easing: "easeOutElastic(1, 0.6)",
          });
          loaderAnimationRefs.current.push(entranceAnim);
        });

        // Continuous rotation animation for each die with different speeds
        dice.forEach((die, index) => {
          const rotationSpeed = 2000 + index * 500; // Different speeds for each die
          const rotationAnim = animate(die, {
            rotate: [0, 360],
            duration: rotationSpeed,
            easing: "linear",
            loop: true,
          });
          loaderAnimationRefs.current.push(rotationAnim);
        });

        // Pulsing scale animation for dice
        dice.forEach((die, index) => {
          const pulseAnim = animate(die, {
            scale: [1, 1.15, 1],
            duration: 1200 + index * 200,
            delay: index * 150,
            easing: "easeInOutSine",
            loop: true,
          });
          loaderAnimationRefs.current.push(pulseAnim);
        });

        // Floating/translating animation for dice
        dice.forEach((die, index) => {
          const floatAnim = animate(die, {
            translateY: [0, -8, 0],
            duration: 1500 + index * 200,
            delay: index * 100,
            easing: "easeInOutSine",
            loop: true,
          });
          loaderAnimationRefs.current.push(floatAnim);
        });

        // Particle trail animation with more dynamic movement
        if (particles.length > 0) {
          particles.forEach((particle, index) => {
            const baseDelay = index * 120;
            const randomOffset = Math.random() * 20;
            const particleAnim = animate(particle, {
              translateY: [0, -40 - randomOffset, -80 - randomOffset],
              translateX: [
                0,
                (Math.random() - 0.5) * 50,
                (Math.random() - 0.5) * 100,
              ],
              opacity: [0, 0.9, 0],
              scale: [0.3, 1.2, 0.3],
              duration: 1800,
              delay: baseDelay,
              easing: "easeOutQuad",
              loop: true,
            });
            loaderAnimationRefs.current.push(particleAnim);
          });
        }

        // Background glow pulsing animation
        if (glow) {
          const glowAnim = animate(glow, {
            opacity: [0.3, 0.6, 0.3],
            scale: [1, 1.05, 1],
            duration: 2000,
            easing: "easeInOutSine",
            loop: true,
          });
          loaderAnimationRefs.current.push(glowAnim);
        }

        // Text pulsing animation
        const textAnim = animate(text, {
          opacity: [0.6, 1, 0.6],
          scale: [1, 1.02, 1],
          duration: 1500,
          easing: "easeInOutSine",
          loop: true,
        });
        loaderAnimationRefs.current.push(textAnim);
      }
    }, 50);

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      // Cleanup on unmount
      loaderAnimationRefs.current.forEach((anim) => {
        if (anim) {
          anim.pause();
        }
      });
      loaderAnimationRefs.current = [];
    };
  }, [isLoading]);

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
            // Filter out empty user messages (used to trigger initial GM message)
            if (message.role === "user") {
              const content =
                "content" in message ? message.content : undefined;
              if (typeof content === "string") {
                return content.trim().length > 0;
              }
              if (Array.isArray(content)) {
                return content.length > 0;
              }
              // Check parts for empty text
              if (message.parts) {
                const textParts = message.parts.filter(
                  (p) => p.type === "text"
                );
                return textParts.some(
                  (p) =>
                    "text" in p &&
                    typeof p.text === "string" &&
                    p.text.trim().length > 0
                );
              }
              return false;
            }
            return true;
          })
          .map((message) => {
            const isUser = message.role === "user";

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
                    {message.parts?.map((part, i) => {
                      if (part.type === "text" && "text" in part) {
                        return (
                          <div
                            key={`${message.id}-part-${i}-text`}
                            className="prose prose-sm dark:prose-invert max-w-none wrap-break-words prose-p:my-2 prose-p:leading-relaxed prose-headings:my-3 prose-headings:font-semibold prose-h1:text-xl prose-h2:text-lg prose-h3:text-base prose-strong:font-semibold prose-em:italic prose-code:text-xs prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-pre:bg-muted prose-pre:p-3 prose-pre:rounded-lg prose-pre:overflow-x-auto prose-ul:my-2 prose-ol:my-2 prose-li:my-1 prose-li:leading-relaxed prose-a:text-primary prose-a:underline hover:prose-a:text-primary/80 text-sm"
                          >
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {part.text}
                            </ReactMarkdown>
                          </div>
                        );
                      }

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

                          let summaryMessage: string | null = null;
                          let detailMeta: {
                            rollValue?: number;
                            statValue?: number;
                            total?: number;
                            difficulty?: number;
                            success?: boolean;
                          } = {};

                          if (
                            rawResult &&
                            typeof rawResult === "object" &&
                            "message" in rawResult &&
                            typeof (rawResult as { message?: unknown })
                              .message === "string"
                          ) {
                            const typedResult = rawResult as {
                              message?: string;
                              rollValue?: number;
                              statValue?: number;
                              total?: number;
                              difficulty?: number;
                              success?: boolean;
                            };
                            summaryMessage = typedResult.message ?? null;
                            detailMeta = {
                              rollValue: typedResult.rollValue,
                              statValue: typedResult.statValue,
                              total: typedResult.total,
                              difficulty: typedResult.difficulty,
                              success: typedResult.success,
                            };
                          }

                          if (summaryMessage) {
                            return (
                              <div
                                key={`${message.id}-skill-check-result-${
                                  skillCheckPart.toolCallId ?? "pending"
                                }`}
                                className="mt-2 rounded-md border border-primary/40 bg-primary/5 px-3 py-2 text-xs text-primary-foreground/90"
                              >
                                <div className="font-semibold text-primary mb-1">
                                  Skill Check Result
                                </div>
                                <div className="text-muted-foreground">
                                  {summaryMessage}
                                </div>
                                {(detailMeta.rollValue !== undefined ||
                                  detailMeta.statValue !== undefined ||
                                  detailMeta.total !== undefined ||
                                  detailMeta.difficulty !== undefined) && (
                                  <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-muted-foreground/80">
                                    {detailMeta.rollValue !== undefined && (
                                      <span>Roll: {detailMeta.rollValue}</span>
                                    )}
                                    {detailMeta.statValue !== undefined && (
                                      <span>Stat: {detailMeta.statValue}</span>
                                    )}
                                    {detailMeta.total !== undefined && (
                                      <span>Total: {detailMeta.total}</span>
                                    )}
                                    {detailMeta.difficulty !== undefined && (
                                      <span>DC: {detailMeta.difficulty}</span>
                                    )}
                                    {detailMeta.success !== undefined && (
                                      <span>
                                        Outcome:{" "}
                                        {detailMeta.success
                                          ? "Success"
                                          : "Failure"}
                                      </span>
                                    )}
                                  </div>
                                )}
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
                    })}

                    {!message.parts &&
                      "content" in message &&
                      typeof message.content === "string" && (
                        <div className="prose prose-sm dark:prose-invert max-w-none wrap-break-words prose-p:my-2 prose-p:leading-relaxed prose-headings:my-3 prose-headings:font-semibold prose-h1:text-xl prose-h2:text-lg prose-h3:text-base prose-strong:font-semibold prose-em:italic prose-code:text-xs prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-pre:bg-muted prose-pre:p-3 prose-pre:rounded-lg prose-pre:overflow-x-auto prose-ul:my-2 prose-ol:my-2 prose-li:my-1 prose-li:leading-relaxed prose-a:text-primary prose-a:underline hover:prose-a:text-primary/80 text-sm">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {message.content}
                          </ReactMarkdown>
                        </div>
                      )}
                  </CardContent>
                </Card>
              </div>
            );
          })}

        {isLoading && (
          <div className="flex justify-start">
            <Card className="bg-muted relative overflow-hidden" ref={loaderRef}>
              {/* Background Glow Effect */}
              <div
                ref={glowRef}
                className="absolute inset-0 bg-primary/20 blur-xl pointer-events-none"
              />
              <CardContent className="p-4 relative z-10">
                <div className="flex items-center gap-4">
                  {/* Dice Container */}
                  <div
                    className="relative flex items-center gap-2 h-10"
                    ref={diceContainerRef}
                  >
                    {/* D6 - Cube */}
                    <div className="dice-element relative w-8 h-8 transform-gpu opacity-100">
                      <div className="absolute inset-0 bg-primary/90 rounded-sm shadow-lg border border-primary/30">
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-1.5 h-1.5 bg-primary-foreground rounded-full shadow-sm" />
                        </div>
                        <div className="absolute inset-0 bg-linear-to-br from-primary/40 to-transparent rounded-sm" />
                      </div>
                    </div>

                    {/* D8 - Octahedron */}
                    <div className="dice-element relative w-8 h-8 transform-gpu opacity-100">
                      <div className="absolute inset-0 bg-primary/80 rounded-sm shadow-lg border border-primary/30 rotate-45">
                        <div className="absolute inset-0 flex items-center justify-center -rotate-45">
                          <div className="w-1.5 h-1.5 bg-primary-foreground rounded-full shadow-sm" />
                        </div>
                        <div className="absolute inset-0 bg-linear-to-br from-primary/40 to-transparent rounded-sm" />
                      </div>
                    </div>

                    {/* D10 - Pentagonal Trapezohedron */}
                    <div className="dice-element relative w-8 h-8 transform-gpu opacity-100">
                      <div
                        className="absolute inset-0 bg-primary/70 rounded-sm shadow-lg border border-primary/30"
                        style={{
                          clipPath:
                            "polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)",
                        }}
                      >
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-1.5 h-1.5 bg-primary-foreground rounded-full shadow-sm" />
                        </div>
                        <div
                          className="absolute inset-0 bg-linear-to-br from-primary/40 to-transparent"
                          style={{
                            clipPath:
                              "polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)",
                          }}
                        />
                      </div>
                    </div>

                    {/* D12 - Dodecahedron */}
                    <div className="dice-element relative w-8 h-8 transform-gpu opacity-100">
                      <div
                        className="absolute inset-0 bg-primary/60 rounded-sm shadow-lg border border-primary/30"
                        style={{
                          clipPath:
                            "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)",
                        }}
                      >
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-1.5 h-1.5 bg-primary-foreground rounded-full shadow-sm" />
                        </div>
                        <div
                          className="absolute inset-0 bg-linear-to-br from-primary/40 to-transparent"
                          style={{
                            clipPath:
                              "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)",
                          }}
                        />
                      </div>
                    </div>

                    {/* D20 - Icosahedron */}
                    <div className="dice-element relative w-8 h-8 transform-gpu opacity-100">
                      <div
                        className="absolute inset-0 bg-primary/95 rounded-sm shadow-lg border border-primary/30"
                        style={{
                          clipPath:
                            "polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)",
                        }}
                      >
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-1.5 h-1.5 bg-primary-foreground rounded-full shadow-sm" />
                        </div>
                        <div
                          className="absolute inset-0 bg-linear-to-br from-primary/50 to-transparent"
                          style={{
                            clipPath:
                              "polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)",
                          }}
                        />
                      </div>
                    </div>

                    {/* Particle Container */}
                    <div
                      className="absolute inset-0 pointer-events-none overflow-visible"
                      ref={particleContainerRef}
                    >
                      {Array.from({ length: 12 }, (_, i) => {
                        const left = `${15 + (i % 5) * 20}%`;
                        const top = `${30 + Math.floor(i / 5) * 40}%`;
                        return (
                          <div
                            key={`loader-particle-${left}-${top}`}
                            className="particle absolute w-1.5 h-1.5 bg-primary/70 rounded-full blur-[1px]"
                            style={{
                              left,
                              top,
                            }}
                          />
                        );
                      })}
                    </div>
                  </div>

                  {/* Animated Text */}
                  <span
                    ref={textRef}
                    className="text-sm text-muted-foreground font-medium"
                  >
                    Game Master is thinking...
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}
