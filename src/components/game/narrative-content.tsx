"use client";

import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { NarrativeData, NarrativeDialog } from "@/types/narrative";

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
  dialog: NarrativeDialog;
  className?: string;
};

/**
 * Renders a character dialog with distinct visual styling
 */
function DialogBlock({ dialog, className }: DialogBlockProps) {
  return (
    <div
      className={cn(
        "border-l-4 border-primary/40 bg-muted/30 dark:bg-primary/5 pl-4 pr-3 py-3 my-3 rounded-r-md",
        className
      )}
    >
      <div className="font-semibold text-primary/90 text-base mb-1">
        {dialog.character}
      </div>
      <div className="text-foreground text-base leading-relaxed">
        "{dialog.dialogue}"
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
 * Combines narration segments and dialogs in the correct order
 */
export function NarrativeContent({ data, className }: NarrativeContentProps) {
  const { narration, dialogs } = data;

  // If we have both narration and dialogs, we need to interleave them
  // For now, we'll render all narration first, then all dialogs
  // In the future, we could enhance this to support interleaved content
  // by having the tool return a more structured format with ordering

  return (
    <div className={cn("space-y-2", className)}>
      {narration.map((narrationText, index) => (
        <NarrationBlock key={`narration-${index}`} text={narrationText} />
      ))}
      {dialogs?.map((dialog, index) => (
        <DialogBlock key={`dialog-${index}`} dialog={dialog} />
      ))}
    </div>
  );
}
