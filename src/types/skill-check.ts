import type { UIMessagePart, UIDataTypes, UITools } from "ai";
import { isToolUIPart, getToolName } from "ai";

/**
 * Skill check tool part structure for AI SDK v6 HITL
 * Tool parts with state "input-available" contain the tool arguments in the input property
 */
export type SkillCheckToolPart = UIMessagePart<UIDataTypes, UITools> & {
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
  part: UIMessagePart<UIDataTypes, UITools>
): part is SkillCheckToolPart {
  if (!isToolUIPart(part)) {
    return false;
  }

  const toolName = getToolName(part);

  // Treat any tool UI part with the requestSkillCheck tool name as a
  // SkillCheckToolPart. More specific validation (state, input shape, etc.)
  // is handled where the part is consumed.
  return toolName === "requestSkillCheck";
}
