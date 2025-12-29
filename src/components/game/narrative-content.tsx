"use client";

import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { NarrativeData } from "@/types/narrative";

type NarrationBlockProps = {
  text: string;
  className?: string;
};

/**
 * Renders a single narration segment with improved typography
 */
function NarrationBlock({ text, className }: NarrationBlockProps) {
  return (
    <div
      className={cn("prose prose-base dark:prose-invert max-w-none", className)}
    >
      <div className="prose-p:my-4 prose-p:leading-relaxed prose-headings:my-4 prose-headings:font-semibold prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg prose-strong:font-semibold prose-em:italic prose-code:text-sm prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-pre:bg-muted prose-pre:p-4 prose-pre:rounded-lg prose-pre:overflow-x-auto prose-ul:my-3 prose-ol:my-3 prose-li:my-2 prose-li:leading-relaxed prose-a:text-primary prose-a:underline hover:prose-a:text-primary/80 text-base leading-relaxed">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
      </div>
    </div>
  );
}

type DialogBlockProps = {
  character: string;
  dialogue: string;
  className?: string;
};

/**
 * Renders a character dialog in traditional D&D style with structured dialog box
 */
function DialogBlock({ character, dialogue, className }: DialogBlockProps) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border/50 bg-muted/50 dark:bg-muted/30",
        "shadow-sm my-4 overflow-hidden",
        className
      )}
    >
      {/* Left border accent */}
      <div className="border-l-4 border-primary pl-4 pr-5 py-4">
        {/* Character nameplate */}
        <div className="mb-2">
          <span className="text-primary font-bold text-sm uppercase tracking-wide">
            {character}
          </span>
        </div>

        {/* Dialogue text */}
        <div className="text-foreground text-base leading-relaxed italic">
          "{dialogue}"
        </div>
      </div>
    </div>
  );
}

type NarrativeContentProps = {
  data: NarrativeData;
  className?: string;
};

/**
 * Main component that renders structured narrative content
 * Renders ordered segments preserving the sequence of narration and dialogs
 */
export function NarrativeContent({ data, className }: NarrativeContentProps) {
  const { segments } = data;

  if (segments.length === 0) {
    return null;
  }

  return (
    <div className={cn("space-y-2", className)}>
      {segments.map((segment, index) => {
        if (segment.type === "narration") {
          return (
            <NarrationBlock
              key={`segment-narration-${index}`}
              text={segment.text}
            />
          );
        } else {
          return (
            <DialogBlock
              key={`segment-dialog-${index}`}
              character={segment.character}
              dialogue={segment.dialogue}
            />
          );
        }
      })}
    </div>
  );
}
