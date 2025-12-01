"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { D20Anime } from "@/components/hero/d20-anime";
import { useGameStore } from "@/lib/store/game-store";
import { useRef, useEffect } from "react";
import { animate } from "animejs";
import { cn } from "@/lib/utils";

type DiceRollerProps = {
  onSubmitRoll: (rollValue: number) => Promise<void>;
};

export function DiceRoller({ onSubmitRoll }: DiceRollerProps) {
  const { pendingSkillCheck, currentCharacter, isRolling } = useGameStore();
  const diceContainerRef = useRef<HTMLDivElement>(null);
  const rollAnimationRef = useRef<ReturnType<typeof animate> | null>(null);

  const handleRollDice = async () => {
    if (!pendingSkillCheck || !currentCharacter || isRolling) {
      return;
    }

    // Trigger roll animation
    if (diceContainerRef.current && rollAnimationRef.current) {
      rollAnimationRef.current.pause();
    }

    rollAnimationRef.current = animate(diceContainerRef.current, {
      rotate: [0, 360, 720],
      scale: [1, 1.2, 1],
      duration: 1500,
      easing: "easeOutElastic(1, 0.5)",
    });

    // Wait for animation to complete, then roll
    setTimeout(async () => {
      const rollValue = Math.floor(Math.random() * 20) + 1;
      await onSubmitRoll(rollValue);
    }, 1500);
  };

  // Reset animation when skill check changes
  useEffect(() => {
    if (rollAnimationRef.current) {
      rollAnimationRef.current.pause();
    }
    if (diceContainerRef.current) {
      diceContainerRef.current.style.transform = "";
      diceContainerRef.current.style.scale = "";
    }
  }, [pendingSkillCheck?.toolCallId]);

  return (
    <Card>
      <CardContent className="space-y-4 p-3">
        {pendingSkillCheck &&
        pendingSkillCheck.attribute &&
        pendingSkillCheck.difficulty ? (
          <>
            <div className="space-y-2">
              <div className="text-sm font-semibold">Skill Check Required</div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {pendingSkillCheck.attribute.toUpperCase()}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  DC {pendingSkillCheck.difficulty}
                </span>
              </div>
              {pendingSkillCheck.reason && (
                <div className="text-xs text-muted-foreground">
                  {pendingSkillCheck.reason}
                </div>
              )}
              {currentCharacter && pendingSkillCheck.attribute && (
                <div className="text-xs">
                  Your {pendingSkillCheck.attribute}:{" "}
                  <span className="font-semibold">
                    {currentCharacter.stats[pendingSkillCheck.attribute]}
                  </span>
                </div>
              )}
            </div>
            <div
              ref={diceContainerRef}
              onClick={handleRollDice}
              className={cn(
                "flex items-center justify-center h-32 w-full transition-transform cursor-pointer hover:scale-105 active:scale-95",
                isRolling && "pointer-events-none cursor-not-allowed"
              )}
            >
              <D20Anime className="w-24 h-24" />
            </div>
            <Button
              onClick={handleRollDice}
              disabled={isRolling}
              className="w-full"
            >
              {isRolling ? "Rolling..." : "Roll d20"}
            </Button>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-32 space-y-2">
            <div className="text-sm text-muted-foreground text-center">
              No active skill check
            </div>
            <div className="opacity-30">
              <D20Anime className="w-24 h-24" />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
