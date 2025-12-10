"use client";

import { ToolResultCard } from "@/components/game/tool-result-card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type EventLoggedCardProps = {
  result: {
    success: boolean;
    message: string;
  };
  eventType?: string;
  importance?: "low" | "medium" | "high" | "critical";
};

export function EventLoggedCard({
  result,
  eventType,
  importance,
}: EventLoggedCardProps) {
  const importanceColors = {
    low: "bg-gray-500/20 text-gray-600 dark:text-gray-400",
    medium: "bg-blue-500/20 text-blue-600 dark:text-blue-400",
    high: "bg-orange-500/20 text-orange-600 dark:text-orange-400",
    critical: "bg-red-500/20 text-red-600 dark:text-red-400",
  };

  const details = (
    <div className="flex items-center gap-2 flex-wrap">
      {eventType && (
        <Badge variant="outline" className="text-xs">
          {eventType}
        </Badge>
      )}
      {importance && (
        <Badge
          variant="outline"
          className={cn("text-xs", importanceColors[importance])}
        >
          {importance.toUpperCase()}
        </Badge>
      )}
    </div>
  );

  const variant =
    importance === "critical"
      ? "danger"
      : importance === "high"
        ? "warning"
        : "default";

  return (
    <ToolResultCard
      title="Event Logged"
      icon="📝"
      message={result.message}
      details={details}
      variant={variant}
    />
  );
}
