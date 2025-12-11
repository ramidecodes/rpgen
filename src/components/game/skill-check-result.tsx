"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type SkillCheckResultProps = {
  rollValue: number;
  statValue: number;
  total: number;
  difficulty: number;
  success: boolean;
  attribute: string;
};

export function SkillCheckResult({
  rollValue,
  statValue,
  total,
  difficulty,
  success,
  attribute,
}: SkillCheckResultProps) {
  return (
    <Card className="border-primary/40 bg-primary/5">
      <CardContent className="p-4 space-y-3">
        {/* Success/Failure Header */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Badge
              variant={success ? "default" : "destructive"}
              className={cn(
                "text-sm font-semibold",
                success
                  ? "bg-green-600/20 border-green-500/50 text-green-400"
                  : "bg-red-600/20 border-red-500/50 text-red-400"
              )}
            >
              {success ? "✓ Success" : "✗ Failure"}
            </Badge>
            <Badge
              variant="outline"
              className="text-xs font-mono border-primary/50 bg-primary/10 text-primary"
            >
              {attribute.toUpperCase()}
            </Badge>
          </div>
        </div>

        {/* Calculation and DC Comparison in Single Row */}
        <div className="flex items-center gap-2 flex-wrap text-sm">
          <span className="text-muted-foreground">Roll:</span>
          <Badge variant="secondary" className="font-mono text-sm px-3 py-1">
            {rollValue}
          </Badge>
          <span className="text-muted-foreground">+</span>
          <span className="text-muted-foreground">Stat:</span>
          <Badge variant="secondary" className="font-mono text-sm px-3 py-1">
            {statValue}
          </Badge>
          <span className="text-muted-foreground">=</span>
          <span className="text-muted-foreground">Total:</span>
          <Badge
            variant="outline"
            className="font-mono text-sm px-3 py-1 font-semibold border-primary/50 bg-primary/10 text-primary"
          >
            {total}
          </Badge>
          <span className="text-muted-foreground">vs DC:</span>
          <Badge variant="secondary" className="font-mono text-sm px-3 py-1">
            {difficulty}
          </Badge>
          <span className="text-muted-foreground">
            {total >= difficulty ? "≥" : "<"}
          </span>
          <span
            className={cn(
              "font-medium",
              success ? "text-green-400" : "text-red-400"
            )}
          >
            {success ? "Passed" : "Failed"}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
