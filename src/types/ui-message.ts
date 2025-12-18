/**
 * AI SDK v6 UI Message Types
 * Re-exported from 'ai' package with optional id for messages that haven't been persisted yet
 */

import type {
  UIMessage as AISDKUIMessage,
  UIMessagePart as AISDKUIMessagePart,
  TextUIPart as AISDKTextUIPart,
  ToolUIPart as AISDKToolUIPart,
  DataUIPart as AISDKDataUIPart,
  FileUIPart as AISDKFileUIPart,
  ReasoningUIPart as AISDKReasoningUIPart,
  UIDataTypes,
  UITools,
} from "ai";
import {
  isTextUIPart as aiIsTextUIPart,
  isToolUIPart as aiIsToolUIPart,
  isDataUIPart as aiIsDataUIPart,
  isFileUIPart as aiIsFileUIPart,
  isReasoningUIPart as aiIsReasoningUIPart,
} from "ai";

/**
 * UIMessage with optional id (for messages that haven't been persisted to DB yet)
 * Extends AI SDK v6's UIMessage but makes id optional
 */
export type UIMessage = Omit<AISDKUIMessage, "id"> & {
  id?: string;
};

/**
 * UIMessagePart - re-exported directly from AI SDK v6 with default generics
 */
export type UIMessagePart = AISDKUIMessagePart<UIDataTypes, UITools>;

/**
 * TextUIPart - re-exported directly from AI SDK v6
 */
export type TextUIPart = AISDKTextUIPart;

/**
 * ToolUIPart - re-exported directly from AI SDK v6 with default generics
 */
export type ToolUIPart = AISDKToolUIPart<UITools>;

/**
 * DataUIPart - re-exported directly from AI SDK v6 with default generics
 */
export type DataUIPart = AISDKDataUIPart<UIDataTypes>;

/**
 * FileUIPart - re-exported directly from AI SDK v6
 */
export type FileUIPart = AISDKFileUIPart;

/**
 * ReasoningUIPart - re-exported directly from AI SDK v6
 */
export type ReasoningUIPart = AISDKReasoningUIPart;

/**
 * Union type for all UI parts - re-exported from AI SDK v6
 */
export type UIMessagePartUnion = UIMessagePart;

// Re-export type guards from AI SDK v6
export const isTextUIPart = aiIsTextUIPart;
export const isToolUIPart = aiIsToolUIPart;
export const isDataUIPart = aiIsDataUIPart;
export const isFileUIPart = aiIsFileUIPart;
export const isReasoningUIPart = aiIsReasoningUIPart;
