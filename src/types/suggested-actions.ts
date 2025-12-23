import type { UIMessagePart, ToolUIPart } from "@/types/ui-message";
import { isToolUIPart, getToolName } from "ai";

/**
 * Suggested actions tool part structure for AI SDK v6
 * Tool parts contain suggestions array with 2-3 action strings
 */
export type SuggestedActionsToolPart = ToolUIPart & {
  toolCallId?: string;
  suggestions?: string[]; // Array of 2-3 suggested action strings
};

/**
 * Type guard to check if a part is a suggested actions tool part
 * Uses AI SDK's isToolUIPart and checks the tool name
 */
export function isSuggestedActionsPart(
  part: UIMessagePart
): part is SuggestedActionsToolPart {
  if (!isToolUIPart(part)) {
    return false;
  }
  return getToolName(part) === "suggestActions";
}
