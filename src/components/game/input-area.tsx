"use client";

import { useState, KeyboardEvent, useMemo } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Send, Loader2 } from "lucide-react";
import { useGameStore } from "@/lib/store/game-store";
import type { UIMessage } from "@/types/ui-message";
import { type SuggestedActionsToolPart } from "@/types/suggested-actions";
import { isToolUIPart, getToolName } from "ai";

type InputAreaProps = {
  onSendMessage: (message: string) => void;
  isLoading: boolean;
  messages?: UIMessage[];
};

export function InputArea({
  onSendMessage,
  isLoading,
  messages = [],
}: InputAreaProps) {
  const [input, setInput] = useState("");
  const { pendingSkillCheck } = useGameStore();

  // Extract suggested actions from assistant messages
  // Check ALL assistant messages (not just the last one) to handle skill check scenarios
  const suggestedActions = useMemo(() => {
    // Find all assistant messages (most recent first)
    const assistantMessages = messages
      .filter((msg) => msg.role === "assistant")
      .reverse();

    if (assistantMessages.length === 0) {
      return [];
    }

    // Helper function to extract suggestions from a tool result
    // Handles different result structures (direct suggestions, nested in result object, etc.)
    const extractSuggestionsFromResult = (result: unknown): string[] | null => {
      if (!result || typeof result !== "object") {
        return null;
      }

      const resultObj = result as {
        suggestions?: string[];
        [key: string]: unknown;
      };

      // Check for suggestions directly in result object
      if (
        resultObj.suggestions &&
        Array.isArray(resultObj.suggestions) &&
        resultObj.suggestions.length >= 2
      ) {
        const filtered = resultObj.suggestions.filter(
          (s): s is string => typeof s === "string" && s.trim().length > 0
        );
        if (filtered.length >= 2) {
          return filtered;
        }
      }

      // Also check if result itself is an array of suggestions (edge case)
      if (Array.isArray(result) && result.length >= 2) {
        const filtered = result.filter(
          (s): s is string => typeof s === "string" && s.trim().length > 0
        );
        if (filtered.length >= 2) {
          return filtered;
        }
      }

      return null;
    };

    // Check all assistant messages for suggestActions tool results
    // This ensures we find suggestions even if they're in a different message (e.g., after skill check)
    for (const assistantMessage of assistantMessages) {
      if (!assistantMessage.parts || !Array.isArray(assistantMessage.parts)) {
        continue;
      }

      // Check all parts for suggestActions tool results
      // Following AI SDK v6 best practices: use isToolUIPart and getToolName utilities
      for (const part of assistantMessage.parts) {
        // Use AI SDK utility to check if this is a tool part
        if (!isToolUIPart(part)) {
          continue;
        }

        // Use AI SDK utility to get tool name (works for both tool-call and tool-result)
        const toolName = getToolName(part);
        const isSuggestActions = toolName === "suggestActions";

        // Get tool result - prioritize output (canonical) over result (legacy)
        const toolPart = part as {
          toolCallId?: string;
          result?: unknown;
          output?: unknown;
          [key: string]: unknown;
        };

        const toolResult = toolPart.output ?? toolPart.result;

        // Check if result contains suggestions array
        const hasSuggestionsInResult =
          toolResult &&
          typeof toolResult === "object" &&
          "suggestions" in toolResult &&
          Array.isArray((toolResult as { suggestions?: unknown }).suggestions);

        // Only process if this is a suggestActions tool or has suggestions in result
        if (!isSuggestActions && !hasSuggestionsInResult) {
          continue;
        }

        // Extract suggestions from output (canonical) or result (legacy fallback)
        const suggestions = extractSuggestionsFromResult(toolResult);
        if (suggestions) {
          return suggestions;
        }

        // Also check for suggestions directly in the part (fallback)
        const actionsPart = part as SuggestedActionsToolPart;
        if (
          actionsPart.suggestions &&
          Array.isArray(actionsPart.suggestions) &&
          actionsPart.suggestions.length >= 2
        ) {
          const filtered = actionsPart.suggestions.filter(
            (s): s is string => typeof s === "string" && s.trim().length > 0
          );
          if (filtered.length >= 2) {
            return filtered;
          }
        }
      }
    }

    return [];
  }, [messages]);

  const handleSuggestionClick = (suggestion: string) => {
    // Populate input and send immediately
    onSendMessage(suggestion);
    setInput("");
  };

  const handleSubmit = () => {
    const trimmedInput = input.trim();
    if (!trimmedInput || isLoading) {
      return;
    }

    onSendMessage(trimmedInput);
    setInput("");
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const isDisabled = isLoading || !!pendingSkillCheck;

  return (
    <div className="border-t bg-background p-4">
      {/* Suggested Actions */}
      {suggestedActions.length >= 2 && !isLoading && !pendingSkillCheck && (
        <div className="mb-3 space-y-2">
          <div className="text-xs text-muted-foreground font-medium">
            💡 Suggested actions:
          </div>
          <div className="flex flex-col gap-2">
            {suggestedActions.map((suggestion, index) => (
              <Button
                key={`suggestion-${index}`}
                variant="secondary"
                size="sm"
                onClick={() => handleSuggestionClick(suggestion)}
                disabled={isDisabled}
                className="w-full justify-start text-left h-auto py-2 px-3 whitespace-normal cursor-pointer hover:bg-muted/80 hover:scale-[1.02] transition-all"
                aria-label={`Use suggested action: ${suggestion}`}
              >
                {suggestion}
              </Button>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            pendingSkillCheck
              ? "Complete the skill check first..."
              : "Type your action..."
          }
          disabled={isDisabled}
          className="min-h-[60px] resize-none"
        />
        <Button
          onClick={handleSubmit}
          disabled={isDisabled}
          size="icon"
          className="h-[60px] w-[60px] shrink-0"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
      {pendingSkillCheck && (
        <div className="mt-2 text-xs text-muted-foreground">
          ⚠️ A skill check is pending. Roll the dice to continue.
        </div>
      )}
    </div>
  );
}
