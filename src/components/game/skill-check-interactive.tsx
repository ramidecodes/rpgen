"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  const badgeRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const diceContainerRef = useRef<HTMLButtonElement>(null);
  const [isRolling, setIsRolling] = useState(false);
  const rollAnimationRef = useRef<ReturnType<typeof animate> | null>(null);

  useEffect(() => {
    if (!containerRef.current || !badgeRef.current) {
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

    // Pulse animation for the badge
    const pulseAnim = animate(badgeRef.current, {
      scale: [1, 1.05, 1],
      duration: 1500,
      easing: "easeInOutSine",
      loop: true,
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
      pulseAnim.pause();
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
        className="absolute inset-0 bg-primary/10 blur-xl rounded-lg pointer-events-none"
      />
      <Card className="relative border-primary/30 bg-primary/5">
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            <div ref={badgeRef} className="inline-block">
              <Badge
                variant="outline"
                className="text-sm font-semibold border-primary/50 bg-primary/10 text-primary"
              >
                🎲 Skill Check Required
              </Badge>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground">
                  Attribute:
                </span>
                <Badge variant="secondary" className="font-mono text-xs">
                  {attribute.toUpperCase()}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground">
                  DC:
                </span>
                <Badge variant="secondary" className="font-mono text-xs">
                  {difficulty}
                </Badge>
              </div>
              {characterStat !== undefined && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-muted-foreground">
                    Your {attribute}:
                  </span>
                  <Badge variant="secondary" className="font-mono text-xs">
                    {characterStat}
                  </Badge>
                </div>
              )}
            </div>

            {reason && (
              <div className="text-sm text-muted-foreground italic border-l-2 border-primary/30 pl-3">
                {reason}
              </div>
            )}
          </div>

          {/* Interactive Die */}
          <div className="flex flex-col items-center gap-3 pt-2">
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
                "flex items-center justify-center h-32 w-full transition-transform cursor-pointer hover:scale-105 active:scale-95",
                isRolling && "pointer-events-none cursor-not-allowed"
              )}
            >
              <D20Anime className="w-24 h-24" />
            </button>
            <Button
              onClick={handleRollDice}
              disabled={isRolling}
              className="w-full"
            >
              {isRolling ? "Rolling..." : "Roll d20"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
