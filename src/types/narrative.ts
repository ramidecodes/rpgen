import type { ToolUIPart } from "@/types/ui-message";

/**
 * Ordered narrative segment that can be either narration or dialog
 * Used to preserve the order of narrative content as it appears in tool calls
 */
export type NarrativeSegment =
  | { type: "narration"; text: string }
  | { type: "dialog"; character: string; dialogue: string };

/**
 * Structured narrative data returned by formatNarrativeTool
 * Uses ordered segments to preserve the sequence of narration and dialogs
 */
export type NarrativeData = {
  segments: NarrativeSegment[];
};

/**
 * Tool part for formatNarrative tool result
 */
export type NarrativeToolPart = ToolUIPart & {
  toolName: "formatNarrative";
  result?: NarrativeData;
};

/**
 * Type guard to validate that an object matches the dialog segment structure
 * Ensures character and dialogue are non-empty strings
 */
function isValidDialogSegment(value: unknown): value is {
  character: string;
  dialogue: string;
} {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const dialog = value as Record<string, unknown>;

  // Check that character exists and is a non-empty string
  if (
    !("character" in dialog) ||
    typeof dialog.character !== "string" ||
    dialog.character.trim().length === 0
  ) {
    return false;
  }

  // Check that dialogue exists and is a non-empty string
  if (
    !("dialogue" in dialog) ||
    typeof dialog.dialogue !== "string" ||
    dialog.dialogue.trim().length === 0
  ) {
    return false;
  }

  return true;
}

/**
 * Type guard to check if a part is a narrative tool part
 * Handles both tool-call and tool-result parts
 * AI SDK v6 can use different type formats: "tool-formatNarrative" or "tool-result" with toolName
 */
export function isNarrativeToolPart(part: unknown): part is NarrativeToolPart {
  if (typeof part !== "object" || part === null) {
    return false;
  }

  const typedPart = part as {
    toolName?: string;
    type?: string;
    [key: string]: unknown;
  };

  // Check if it's a formatNarrative tool part by toolName
  if (typedPart.toolName === "formatNarrative") {
    return true;
  }

  // Check for type-based identification (AI SDK v6 format: "tool-formatNarrative")
  if (typedPart.type === "tool-formatNarrative") {
    return true;
  }

  // Also check for tool-result parts with formatNarrative
  if (
    typedPart.type === "tool-result" &&
    "toolName" in typedPart &&
    typedPart.toolName === "formatNarrative"
  ) {
    return true;
  }

  // Check if type starts with "tool-" and contains "formatNarrative" (flexible matching)
  if (
    typeof typedPart.type === "string" &&
    typedPart.type.startsWith("tool-") &&
    typedPart.type.includes("formatNarrative")
  ) {
    return true;
  }

  return false;
}

/**
 * Extract narrative data from a tool part and convert to ordered segments
 * Handles different result structures from AI SDK v6
 * Always returns segments format, converting old format if needed
 */
export function extractNarrativeData(
  part: NarrativeToolPart
): NarrativeData | null {
  const typedPart = part as {
    result?: unknown;
    output?: unknown;
    [key: string]: unknown;
  };

  // Try result first (standard for non-HITL tool results)
  let data: unknown = typedPart.result;

  // Fallback to output field
  if (!data) {
    data = typedPart.output;
  }

  // Check if the part itself has the narrative structure directly
  if (!data && "narration" in typedPart) {
    data = typedPart;
  }

  // Process the data if we found it
  if (data && typeof data === "object") {
    const result = data as Record<string, unknown>;
    const segments: NarrativeSegment[] = [];

    // Check for new format (segments) first
    if (Array.isArray(result.segments)) {
      const validSegments = result.segments.filter(
        (seg): seg is NarrativeSegment => {
          if (typeof seg !== "object" || seg === null) return false;
          const s = seg as Record<string, unknown>;

          if (s.type === "narration") {
            return typeof s.text === "string" && s.text.trim().length > 0;
          }
          if (s.type === "dialog") {
            return isValidDialogSegment({
              character: s.character,
              dialogue: s.dialogue,
            });
          }
          return false;
        }
      );

      if (validSegments.length > 0) {
        return { segments: validSegments };
      }
    }

    // Convert old format (narration/dialogs arrays) to segments
    const narration: string[] = [];
    const dialogs: Array<{ character: string; dialogue: string }> = [];

    // Extract narration array
    if (Array.isArray(result.narration)) {
      narration.push(
        ...result.narration.filter(
          (item): item is string =>
            typeof item === "string" && item.trim().length > 0
        )
      );
    }

    // Extract dialogs array (may be wrapped in success structure)
    let dialogsData = result.dialogs;
    if (
      !dialogsData &&
      "success" in result &&
      typeof result.success === "boolean"
    ) {
      dialogsData = (result as { dialogs?: unknown }).dialogs;
    }

    if (Array.isArray(dialogsData)) {
      dialogs.push(...dialogsData.filter(isValidDialogSegment));
    }

    // Convert to segments: narration first, then dialogs (preserves order within tool call)
    for (const text of narration) {
      segments.push({ type: "narration", text });
    }
    for (const dialog of dialogs) {
      segments.push({
        type: "dialog",
        character: dialog.character,
        dialogue: dialog.dialogue,
      });
    }

    if (segments.length > 0) {
      return { segments };
    }
  }

  return null;
}
