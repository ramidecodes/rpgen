"use client";

import { ToolResultCard } from "@/components/game/tool-result-card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type FrontAdvancementCardProps = {
  result: {
    success: boolean;
    newDoomClock?: number;
    isDoomed?: boolean;
    message: string;
  };
  maxDoom?: number;
};

export function FrontAdvancementCard({
  result,
  maxDoom,
}: FrontAdvancementCardProps) {
  const variant = result.isDoomed
    ? "danger"
    : result.newDoomClock && maxDoom && result.newDoomClock / maxDoom > 0.7
      ? "warning"
      : "default";

  const details = (
    <div className="space-y-2">
      {result.newDoomClock !== undefined && maxDoom !== undefined && (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Doom Clock</span>
            <span className="font-semibold">
              {result.newDoomClock}/{maxDoom}
            </span>
          </div>
          <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
            <div
              className={cn(
                "h-2 rounded-full transition-all",
                result.isDoomed
                  ? "bg-red-500"
                  : result.newDoomClock / maxDoom > 0.7
                    ? "bg-yellow-500"
                    : "bg-primary"
              )}
              style={{
                width: `${Math.min(
                  100,
                  (result.newDoomClock / maxDoom) * 100
                )}%`,
              }}
            />
          </div>
        </div>
      )}
      {result.isDoomed && (
        <Badge variant="destructive" className="text-xs">
          ⚠️ DOOM TRIGGERED
        </Badge>
      )}
    </div>
  );

  return (
    <ToolResultCard
      title="Front Advanced"
      icon="⏰"
      message={result.message}
      details={details}
      variant={variant}
    />
  );
}
