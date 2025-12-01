"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, isToolUIPart, getToolName } from "ai";
import { useGameStore } from "@/lib/store/game-store";
import { useCallback, useEffect } from "react";
import type { CoreMessage, UIMessage } from "ai";
import { isSkillCheckPart } from "@/types/skill-check";

type UseGameChatOptions = {
  runId: string;
  initialMessages?: CoreMessage[];
};

export function useGameChat({
  runId,
  initialMessages = [],
}: UseGameChatOptions) {
  const { setPendingSkillCheck, setIsRolling, currentCharacter } =
    useGameStore();

  const chat = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
      body: {
        runId,
      },
    }),
    // @ts-expect-error - initialMessages is not in the type definition but is supported by useChat
    initialMessages: initialMessages as unknown as UIMessage[],
  });

  const { addToolResult } = chat;

  // Monitor messages for tool calls that need HITL
  useEffect(() => {
    const lastMessage = chat.messages[chat.messages.length - 1];
    if (!lastMessage || lastMessage.role !== "assistant") {
      return;
    }

    const toolParts = lastMessage.parts || [];
    for (const part of toolParts) {
      // Check for skill check tool part using typed part pattern
      if (isSkillCheckPart(part) && part.state === "input-available") {
        const { input } = part;
        if (input?.attribute && input?.difficulty && input?.reason) {
          setPendingSkillCheck({
            toolCallId: part.toolCallId,
            attribute: input.attribute,
            difficulty: input.difficulty,
            reason: input.reason,
          });
          setIsRolling(true);
        }
      }
    }
  }, [chat.messages, setPendingSkillCheck, setIsRolling]);

  const submitSkillCheckResult = useCallback(
    async (rollValue: number) => {
      const { pendingSkillCheck } = useGameStore.getState();
      if (!pendingSkillCheck) {
        return;
      }

      // Calculate total (roll + character stat modifier)
      if (!currentCharacter) {
        return;
      }

      const statValue = currentCharacter.stats[pendingSkillCheck.attribute];
      // Simple modifier: stat value itself (1-20 range)
      // Could use (stat - 10) / 2 for D&D-style modifiers
      const total = rollValue + statValue;
      const checkSuccess = total >= pendingSkillCheck.difficulty;

      // Create tool result object
      const toolResult = {
        rollValue,
        statValue,
        total,
        success: checkSuccess,
        attribute: pendingSkillCheck.attribute,
        difficulty: pendingSkillCheck.difficulty,
        message: `Rolled ${rollValue} + ${statValue} (${pendingSkillCheck.attribute}) = ${total} vs DC ${pendingSkillCheck.difficulty}. ${checkSuccess ? "Success!" : "Failure."}`,
      };

      // Submit tool result to complete the HITL flow
      await addToolResult({
        toolCallId: pendingSkillCheck.toolCallId,
        toolName: "requestSkillCheck",
        result: toolResult,
      });

      // Clear pending check and reset rolling state after submitting result
      useGameStore.getState().clearPendingSkillCheck();
    },
    [addToolResult, currentCharacter]
  );

  return {
    ...chat,
    submitSkillCheckResult,
  };
}
