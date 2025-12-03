"use client";

import { ToolResultCard } from "@/components/game/tool-result-card";
import { Badge } from "@/components/ui/badge";

type QuestCreatedCardProps = {
  result: {
    success: boolean;
    message: string;
  };
  questTitle?: string;
  questDescription?: string;
  questType?: string;
};

export function QuestCreatedCard({
  result,
  questTitle,
  questDescription,
  questType,
}: QuestCreatedCardProps) {
  const details = (
    <div className="space-y-2">
      {questTitle && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold">{questTitle}</span>
          {questType && (
            <Badge variant="outline" className="text-xs">
              {questType}
            </Badge>
          )}
        </div>
      )}
      {questDescription && (
        <p className="text-xs text-muted-foreground italic">
          {questDescription}
        </p>
      )}
    </div>
  );

  return (
    <ToolResultCard
      title="Quest Created"
      icon="📜"
      message={result.message}
      details={details}
      variant="success"
    />
  );
}
