import type { UIMessagePart, ToolUIPart } from "@/types/ui-message";
import { isToolUIPart as isAISDKToolUIPart, getToolName } from "ai";

/**
 * Skill check tool part structure for AI SDK v6 HITL
 * Tool parts with state "input-available" contain the tool arguments in the input property
 */
export type SkillCheckToolPart = ToolUIPart & {
  // Tool UI parts always have a toolCallId, but we keep this optional at the
  // type level to avoid over-constraining the runtime shape.
  toolCallId?: string;
  // AI SDK v6 currently uses "input-available" and "output-available" for HITL,
  // but we accept any string here so the type guard can be more permissive.
  state?: string;
  input?: {
    attribute:
      | "strength"
      | "agility"
      | "intelligence"
      | "scholarship"
      | "intuition";
    difficulty: number;
    reason: string;
  };
  // Canonical v6 HITL payload from addToolOutput lives on `output`.
  // `result` is kept only as an optional fallback for any older data.
  output?: unknown;
  result?: unknown;
};

/**
 * Type guard to check if a part is a skill check tool part with input-available state
 * Uses AI SDK's isToolUIPart and checks the tool name, then verifies state and input structure
 */
export function isSkillCheckPart(
  part: UIMessagePart
): part is SkillCheckToolPart {
  // Use AI SDK's isToolUIPart which works with the actual runtime shape
  // even though TypeScript types don't align perfectly
  if (!isAISDKToolUIPart(part as never)) {
    return false;
  }

  const toolName = getToolName(part as never);

  // Treat any tool UI part with the requestSkillCheck tool name as a
  // SkillCheckToolPart. More specific validation (state, input shape, etc.)
  // is handled where the part is consumed.
  return toolName === "requestSkillCheck";
}
