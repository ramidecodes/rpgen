"use client";

import { useState, KeyboardEvent } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Send, Loader2 } from "lucide-react";
import { useGameStore } from "@/lib/store/game-store";

type InputAreaProps = {
  onSendMessage: (message: string) => void;
  isLoading: boolean;
};

export function InputArea({ onSendMessage, isLoading }: InputAreaProps) {
  const [input, setInput] = useState("");
  const { isRolling, pendingSkillCheck } = useGameStore();

  const handleSubmit = () => {
    const trimmedInput = input.trim();
    if (!trimmedInput || isLoading || isRolling) {
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

  const isDisabled = isLoading || isRolling || !!pendingSkillCheck;

  return (
    <div className="border-t bg-background p-4">
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
