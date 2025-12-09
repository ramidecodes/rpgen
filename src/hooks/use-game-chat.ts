"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useGameStore } from "@/lib/store/game-store";
import { useCallback, useEffect } from "react";
import type { UIMessage } from "ai";
import { isSkillCheckPart, type SkillCheckToolPart } from "@/types/skill-check";

type UseGameChatOptions = {
  runId: string;
  messages?: UIMessage[];
};

export function useGameChat({ runId, messages = [] }: UseGameChatOptions) {
  const { setPendingSkillCheck, currentCharacter } = useGameStore();

  const chat = useChat({
    id: runId, // Use runId as chat id to ensure each run gets a fresh chat instance
    transport: new DefaultChatTransport({
      api: "/api/chat",
      body: {
        runId,
      },
    }) as never,
    messages: messages as never, // AI SDK v6 uses 'messages' instead of 'initialMessages'
    // Type assertions needed due to version mismatch between AI SDK v6 beta and @ai-sdk/react v2
  });

  const { addToolOutput, sendMessage } = chat;
  // AI SDK v6 uses 'status' property, not 'isLoading'
  // Status can be: 'submitted', 'streaming', 'ready', or 'error'
  const status =
    "status" in chat && typeof chat.status === "string" ? chat.status : "ready";
  const isLoading = status === "submitted" || status === "streaming";

  // Monitor messages for tool calls that need HITL
  // We still track pendingSkillCheck for input area disabling
  useEffect(() => {
    const lastMessage = chat.messages[chat.messages.length - 1];
    if (!lastMessage || lastMessage.role !== "assistant") {
      return;
    }

    const toolParts = lastMessage.parts || [];
    for (const part of toolParts) {
      // Check for skill check tool part using typed part pattern
      if (isSkillCheckPart(part)) {
        const skillCheckPart = part as SkillCheckToolPart;
        if (
          skillCheckPart.state === "input-available" &&
          skillCheckPart.input
        ) {
          const { input } = skillCheckPart;
          if (
            input.attribute &&
            typeof input.difficulty === "number" &&
            typeof input.reason === "string"
          ) {
            setPendingSkillCheck({
              toolCallId: skillCheckPart.toolCallId ?? "",
              attribute: input.attribute,
              difficulty: input.difficulty,
              reason: input.reason,
            });
          }
        }
      }
    }
  }, [chat.messages, setPendingSkillCheck]);

  const submitSkillCheckResult = useCallback(
    async (rollValue: number, toolCallId: string) => {
      // Calculate total (roll + character stat modifier)
      if (!currentCharacter) {
        return;
      }

      // Get the pending skill check to get attribute and difficulty
      const { pendingSkillCheck } = useGameStore.getState();
      if (!pendingSkillCheck || pendingSkillCheck.toolCallId !== toolCallId) {
        return;
      }

      const statValue = currentCharacter.stats[pendingSkillCheck.attribute];
      // Simple modifier: stat value itself (1-20 range)
      // Could use (stat - 10) / 2 for D&D-style modifiers
      const total = rollValue + statValue;
      const checkSuccess = total >= pendingSkillCheck.difficulty;

      // Create tool result object
      const toolOutput = {
        rollValue,
        statValue,
        total,
        success: checkSuccess,
        attribute: pendingSkillCheck.attribute,
        difficulty: pendingSkillCheck.difficulty,
        message: `Rolled ${rollValue} + ${statValue} (${
          pendingSkillCheck.attribute
        }) = ${total} vs DC ${pendingSkillCheck.difficulty}. ${
          checkSuccess ? "Success!" : "Failure."
        }`,
      };

      // Submit tool output to complete the HITL flow using AI SDK v6 API
      addToolOutput({
        tool: "requestSkillCheck",
        toolCallId,
        output: toolOutput,
      });

      // Clear pending check after submitting result
      useGameStore.getState().clearPendingSkillCheck();

      // Trigger the agent to continue processing with the new tool result.
      // We send a lightweight, effectively empty user message to trigger the
      // next model call. This message is filtered from the visible chat UI and
      // from the sanitized model messages on the server.
      void sendMessage({ text: " " });
    },
    [addToolOutput, currentCharacter, sendMessage]
  );

  return {
    ...chat,
    isLoading,
    submitSkillCheckResult,
  };
}
