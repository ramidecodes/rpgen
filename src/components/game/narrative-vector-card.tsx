"use client";

import { ToolResultCard } from "@/components/game/tool-result-card";

type NarrativeVectorCardProps = {
  result: {
    success: boolean;
    newHope?: number;
    newChaos?: number;
    message: string;
  };
};

export function NarrativeVectorCard({ result }: NarrativeVectorCardProps) {
  const details = (
    <div className="space-y-2">
      {result.newHope !== undefined && (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Hope</span>
            <span className="font-semibold">
              {(result.newHope * 100).toFixed(0)}%
            </span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full"
              style={{
                width: `${result.newHope * 100}%`,
              }}
            />
          </div>
        </div>
      )}
      {result.newChaos !== undefined && (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Chaos</span>
            <span className="font-semibold">
              {(result.newChaos * 100).toFixed(0)}%
            </span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div
              className="bg-destructive h-2 rounded-full"
              style={{
                width: `${result.newChaos * 100}%`,
              }}
            />
          </div>
        </div>
      )}
    </div>
  );

  return (
    <ToolResultCard
      title="Narrative Shift"
      icon="🌊"
      message={result.message}
      details={details}
      variant="default"
    />
  );
}
