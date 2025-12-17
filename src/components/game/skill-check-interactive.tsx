"use client";

import { Button } from "@/components/ui/button";
import { D20Anime } from "@/components/hero/d20-anime";
import { useRef, useEffect, useState } from "react";
import { animate } from "animejs";
import { cn } from "@/lib/utils";

type SkillCheckInteractiveProps = {
  attribute: string;
  difficulty: number;
  reason: string;
  characterStat?: number;
  toolCallId: string;
  onSubmitRoll: (rollValue: number) => Promise<void>;
};

export function SkillCheckInteractive({
  attribute,
  difficulty,
  reason,
  characterStat,
  toolCallId,
  onSubmitRoll,
}: SkillCheckInteractiveProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const diceContainerRef = useRef<HTMLButtonElement>(null);
  const [isRolling, setIsRolling] = useState(false);
  const rollAnimationRef = useRef<ReturnType<typeof animate> | null>(null);

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    // Entrance animation for the skill check message
    const entranceAnim = animate(containerRef.current, {
      opacity: [0, 1],
      scale: [0.95, 1],
      translateY: [-10, 0],
      duration: 500,
      easing: "easeOutElastic(1, 0.6)",
    });

    // Glow animation if glow element exists
    if (glowRef.current) {
      const _glowAnim = animate(glowRef.current, {
        opacity: [0.3, 0.6, 0.3],
        scale: [1, 1.02, 1],
        duration: 2000,
        easing: "easeInOutSine",
        loop: true,
      });
    }

    return () => {
      entranceAnim.pause();
    };
  }, []);

  // Reset animation when toolCallId changes
  useEffect(() => {
    // Re-run this reset logic whenever the toolCallId changes so a new
    // incoming skill check starts from a clean animation state.
    const _currentToolCallId = toolCallId;
    if (rollAnimationRef.current) {
      rollAnimationRef.current.pause();
    }
    if (diceContainerRef.current) {
      diceContainerRef.current.style.transform = "";
      diceContainerRef.current.style.scale = "";
    }
    setIsRolling(false);
  }, [toolCallId]);

  const handleRollDice = async () => {
    if (isRolling) {
      return;
    }

    setIsRolling(true);

    // Trigger roll animation
    if (diceContainerRef.current && rollAnimationRef.current) {
      rollAnimationRef.current.pause();
    }

    if (diceContainerRef.current) {
      rollAnimationRef.current = animate(diceContainerRef.current, {
        rotate: [0, 360, 720],
        scale: [1, 1.2, 1],
        duration: 1500,
        easing: "easeOutElastic(1, 0.5)",
      });
    }

    // Wait for animation to complete, then roll
    setTimeout(async () => {
      const rollValue = Math.floor(Math.random() * 20) + 1;
      await onSubmitRoll(rollValue);
      setIsRolling(false);
    }, 1500);
  };

  return (
    <div ref={containerRef} className="relative">
      {/* Background Glow Effect */}
      <div
        ref={glowRef}
        className="pointer-events-none absolute inset-0 rounded-lg bg-primary/10 blur-2xl"
      />
      <div className="relative overflow-hidden rounded-lg bg-card p-6 shadow-[0_0_25px_rgba(0,255,200,0.12)]">
        {/* Glowing border effect */}
        <div
          className="pointer-events-none absolute inset-0 rounded-lg border-2 border-primary/80 shadow-[0_0_20px_hsl(var(--primary)/0.3)]"
          style={{
            boxShadow:
              "0 0 20px hsl(var(--primary) / 0.3), inset 0 0 16px hsl(var(--primary) / 0.14)",
          }}
        />

        <div className="relative z-10">
          {/* Top Badges */}
          <div className="mb-6 flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
              <span>{attribute.toUpperCase()}</span>
              {characterStat !== undefined && (
                <span className="rounded-full bg-primary-foreground/20 px-2 py-0.5 text-xs font-semibold text-primary-foreground">
                  {characterStat}
                </span>
              )}
            </div>
          </div>

          {/* Info Section */}
          <div className="mb-6 space-y-3">
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">DC:</span>
                <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-muted shadow-inner">
                  <span className="text-lg font-bold text-foreground">
                    {difficulty}
                  </span>
                </div>
              </div>
            </div>

            {reason && (
              <div className="border-l-2 border-primary/50 pl-4 text-sm italic text-muted-foreground">
                {reason}
              </div>
            )}
          </div>

          {/* Interactive Die */}
          <div className="flex flex-col items-center gap-4">
            <button
              ref={diceContainerRef}
              onClick={handleRollDice}
              type="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  void handleRollDice();
                }
              }}
              className={cn(
                "flex items-center justify-center transition-transform cursor-pointer hover:scale-105 active:scale-95",
                isRolling && "pointer-events-none cursor-not-allowed"
              )}
            >
              <D20Anime className="h-20 w-20" />
            </button>
            <Button
              onClick={handleRollDice}
              disabled={isRolling}
              className="w-full cursor-pointer bg-primary text-primary-foreground font-semibold hover:bg-primary/90"
            >
              {isRolling ? "Rolling..." : "Roll d20"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
