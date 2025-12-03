"use client";

import { ToolResultCard } from "@/components/game/tool-result-card";
import { Badge } from "@/components/ui/badge";

type RelationshipCardProps = {
  result: {
    success: boolean;
    message: string;
  };
  sourceId?: string;
  targetId?: string;
  relationType?: string;
  value?: number;
};

export function RelationshipCard({
  result,
  sourceId,
  targetId,
  relationType,
  value,
}: RelationshipCardProps) {
  const details = (
    <div className="space-y-2">
      {(sourceId || targetId) && (
        <div className="flex items-center gap-2 flex-wrap text-xs">
          {sourceId && (
            <Badge variant="outline" className="font-mono">
              {sourceId}
            </Badge>
          )}
          {relationType && (
            <span className="text-muted-foreground">→ {relationType} →</span>
          )}
          {targetId && (
            <Badge variant="outline" className="font-mono">
              {targetId}
            </Badge>
          )}
        </div>
      )}
      {value !== undefined && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Strength:</span>
          <div className="flex-1 bg-muted rounded-full h-2 max-w-[100px]">
            <div
              className="bg-primary h-2 rounded-full"
              style={{
                width: `${value * 100}%`,
              }}
            />
          </div>
          <span className="text-xs font-semibold">
            {(value * 100).toFixed(0)}%
          </span>
        </div>
      )}
    </div>
  );

  return (
    <ToolResultCard
      title="Relationship Updated"
      icon="🔗"
      message={result.message}
      details={details}
      variant="default"
    />
  );
}
