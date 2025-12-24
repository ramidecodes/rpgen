import type { ToolUIPart } from "@/types/ui-message";

/**
 * Character dialog structure
 */
export type NarrativeDialog = {
  character: string;
  dialogue: string;
};

/**
 * Structured narrative data returned by formatNarrativeTool
 */
export type NarrativeData = {
  narration: string[];
  dialogs?: NarrativeDialog[];
};

/**
 * Tool part for formatNarrative tool result
 */
export type NarrativeToolPart = ToolUIPart & {
  toolName: "formatNarrative";
  result?: NarrativeData;
};

/**
 * Type guard to validate that an object matches the NarrativeDialog structure
 * Ensures character and dialogue are non-empty strings
 */
function isValidNarrativeDialog(value: unknown): value is NarrativeDialog {
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
 * Extract narrative data from a tool part
 * Handles different result structures from AI SDK v6
 * For non-HITL tools, the result can be in various places depending on execution state
 */
export function extractNarrativeData(
  part: NarrativeToolPart
): NarrativeData | null {
  const typedPart = part as {
    result?: unknown;
    output?: unknown;
    [key: string]: unknown;
  };

  // For non-HITL tools that execute immediately, the result is typically in:
  // 1. `result` field (most common for tool-result parts)
  // 2. Direct properties on the part (for some AI SDK v6 structures)
  // 3. `output` field (less common for non-HITL, but check anyway)
  // 4. Nested in the tool execution result structure

  // Try result first (standard for non-HITL tool results)
  let data: unknown = typedPart.result;

  // If no result field, check if the part itself has the narrative structure
  if (!data) {
    // Check if narration/dialogs are directly on the part
    if (
      "narration" in typedPart &&
      Array.isArray(typedPart.narration) &&
      typedPart.narration.every((item) => typeof item === "string")
    ) {
      return {
        narration: typedPart.narration as string[],
        dialogs: Array.isArray(typedPart.dialogs)
          ? typedPart.dialogs.filter(isValidNarrativeDialog)
          : undefined,
      };
    }
  }

  // Fallback to output (for HITL tools, though formatNarrative is non-HITL)
  if (!data) {
    data = typedPart.output;
  }

  // Process the data if we found it
  if (data && typeof data === "object") {
    const result = data as Record<string, unknown>;

    // Check if it has the expected structure directly
    if (
      Array.isArray(result.narration) &&
      result.narration.every((item) => typeof item === "string")
    ) {
      return {
        narration: result.narration as string[],
        dialogs: Array.isArray(result.dialogs)
          ? result.dialogs.filter(isValidNarrativeDialog)
          : undefined,
      };
    }

    // Also check if the result is wrapped in a success/response structure
    // Some tools return { success: true, narration: [...], dialogs: [...] }
    if (
      "success" in result &&
      Array.isArray(result.narration) &&
      result.narration.every((item) => typeof item === "string")
    ) {
      return {
        narration: result.narration as string[],
        dialogs: Array.isArray(result.dialogs)
          ? result.dialogs.filter(isValidNarrativeDialog)
          : undefined,
      };
    }
  }

  // Final fallback: check if the part itself has output with state "output-available"
  // This handles cases where the structure is: { type: "tool-formatNarrative", state: "output-available", output: {...} }
  // Also check output field directly (it might be set even if we didn't find it earlier)
  if ("output" in typedPart && typedPart.output) {
    const outputData = typedPart.output;
    if (outputData && typeof outputData === "object") {
      const output = outputData as Record<string, unknown>;

      // Check if it has the expected structure directly
      if (
        Array.isArray(output.narration) &&
        output.narration.every((item) => typeof item === "string")
      ) {
        return {
          narration: output.narration as string[],
          dialogs: Array.isArray(output.dialogs)
            ? output.dialogs.filter(isValidNarrativeDialog)
            : undefined,
        };
      }

      // Check if wrapped in success structure
      if (
        "success" in output &&
        Array.isArray(output.narration) &&
        output.narration.every((item) => typeof item === "string")
      ) {
        return {
          narration: output.narration as string[],
          dialogs: Array.isArray(output.dialogs)
            ? output.dialogs.filter(isValidNarrativeDialog)
            : undefined,
        };
      }
    }
  }

  return null;
}
