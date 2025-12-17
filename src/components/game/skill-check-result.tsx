"use client";

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
    <div className="relative overflow-hidden rounded-lg bg-card p-6 shadow-[0_0_25px_rgba(0,255,200,0.12)]">
      {/* Glowing border effect */}
      <div
        className={cn(
          "pointer-events-none absolute inset-0 rounded-lg border-2",
          success
            ? "border-primary/80 shadow-[0_0_20px_hsl(var(--primary)/0.3)]"
            : "border-destructive/80 shadow-[0_0_20px_hsl(var(--destructive)/0.3)]"
        )}
        style={{
          boxShadow: success
            ? "0 0 20px hsl(var(--primary) / 0.3), inset 0 0 16px hsl(var(--primary) / 0.14)"
            : "0 0 20px hsl(var(--destructive) / 0.3), inset 0 0 16px hsl(var(--destructive) / 0.14)",
        }}
      />

      <div className="relative z-10">
        {/* Top Badges */}
        <div className="mb-6 flex items-center gap-3">
          <div
            className={cn(
              "flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-semibold",
              success
                ? "bg-primary text-primary-foreground"
                : "bg-destructive text-destructive-foreground"
            )}
          >
            {success ? (
              <svg
                className="h-3 w-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <title>Success</title>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            ) : (
              <svg
                className="h-3 w-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <title>Failure</title>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            )}
            <span>{success ? "Success" : "Failure"}</span>
          </div>
          <div className="rounded-full border border-primary/50 bg-primary/20 px-2.5 py-1 text-xs font-semibold text-primary">
            {attribute.toUpperCase()}
          </div>
        </div>

        {/* Main Equation Section */}
        <div className="flex items-center justify-center gap-3">
          {/* The Roll */}
          <div className="flex flex-col items-center gap-1.5">
            <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-muted shadow-inner">
              <span className="text-lg font-bold text-foreground">
                {rollValue}
              </span>
            </div>
            <span className="text-xs font-medium text-muted-foreground">
              The Roll
            </span>
          </div>

          {/* Plus Operator */}
          <div
            className={cn(
              "flex h-14 w-5 items-center justify-center text-xl font-bold",
              success ? "text-primary" : "text-destructive"
            )}
          >
            +
          </div>

          {/* Character Attribute */}
          <div className="flex flex-col items-center gap-1.5">
            <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-muted shadow-inner">
              <span className="text-lg font-bold text-foreground">
                {statValue}
              </span>
            </div>
            <span className="text-xs font-medium text-muted-foreground">
              Attribute
            </span>
          </div>

          {/* Equals Operator */}
          <div
            className={cn(
              "flex h-14 w-5 items-center justify-center text-xl font-bold",
              success ? "text-primary" : "text-destructive"
            )}
          >
            =
          </div>

          {/* Total (Highlighted) */}
          <div className="flex flex-col items-center gap-1.5">
            <div
              className={cn(
                "flex h-14 w-14 items-center justify-center rounded-lg shadow-lg",
                success
                  ? "bg-primary text-primary-foreground"
                  : "bg-destructive text-destructive-foreground"
              )}
            >
              <span className="text-lg font-bold">{total}</span>
            </div>
            <span className="text-xs font-medium text-muted-foreground">
              Total
            </span>
          </div>

          {/* Greater Than or Equal Operator */}
          <div
            className={cn(
              "flex h-14 w-5 items-center justify-center text-xl font-bold",
              success ? "text-primary" : "text-destructive"
            )}
          >
            {total >= difficulty ? "≥" : "<"}
          </div>

          {/* Difficulty */}
          <div className="flex flex-col items-center gap-1.5">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted shadow-inner">
              <span className="text-lg font-bold text-foreground">
                {difficulty}
              </span>
            </div>
            <span className="text-xs font-medium text-muted-foreground">
              Difficulty
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
