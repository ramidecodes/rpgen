import type { UIMessagePart } from "ai";
import { isToolUIPart, getToolName } from "ai";

/**
 * Type guard for skill check tool parts in AI SDK v6
 * Tool parts are identified by isToolUIPart and tool name
 */
export type SkillCheckToolPart = UIMessagePart & {
  type: string; // Tool parts have dynamic types like "tool-requestSkillCheck"
  toolCallId: string;
  state: "input-available" | "result";
  input?: {
    attribute: "strength" | "agility" | "intelligence" | "scholarship" | "intuition";
    difficulty: number;
    reason: string;
  };
  result?: unknown;
};

/**
 * Type guard to check if a part is a skill check tool part
 * Uses AI SDK's isToolUIPart and checks the tool name
 */
export function isSkillCheckPart(part: UIMessagePart): part is SkillCheckToolPart {
  if (!isToolUIPart(part)) {
    return false;
  }
  const toolName = getToolName(part);
  return toolName === "requestSkillCheck";
}

