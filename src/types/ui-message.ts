/**
 * AI SDK v6 UI Message Types
 * Proper type definitions for UIMessage and related types
 */

// Base UIMessage structure based on AI SDK v6
export interface UIMessage {
  id?: string;
  role: "system" | "user" | "assistant";
  parts?: UIMessagePart[];
}

// Base UIMessagePart structure
export interface UIMessagePart {
  type: string;
  [key: string]: unknown;
}

// Text part
export interface TextUIPart extends UIMessagePart {
  type: "text";
  text: string;
}

// Tool part
export interface ToolUIPart extends UIMessagePart {
  type: "tool-call" | "tool-result";
  toolCallId: string;
  toolName?: string;
  args?: unknown;
  result?: unknown;
}

// Data part
export interface DataUIPart extends UIMessagePart {
  type: "data";
  data: unknown;
}

// File part
export interface FileUIPart extends UIMessagePart {
  type: "file";
  file: {
    name: string;
    type: string;
    size: number;
    url: string;
  };
}

// Reasoning part
export interface ReasoningUIPart extends UIMessagePart {
  type: "reasoning";
  text: string;
}

// Union type for all UI parts
export type UIMessagePartUnion =
  | TextUIPart
  | ToolUIPart
  | DataUIPart
  | FileUIPart
  | ReasoningUIPart;

// Type guards
export function isTextUIPart(part: UIMessagePart): part is TextUIPart {
  return part.type === "text";
}

export function isToolUIPart(part: UIMessagePart): part is ToolUIPart {
  return part.type === "tool-call" || part.type === "tool-result";
}

export function isDataUIPart(part: UIMessagePart): part is DataUIPart {
  return part.type === "data";
}

export function isFileUIPart(part: UIMessagePart): part is FileUIPart {
  return part.type === "file";
}

export function isReasoningUIPart(
  part: UIMessagePart
): part is ReasoningUIPart {
  return part.type === "reasoning";
}
