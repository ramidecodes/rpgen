"use client";

import { Header } from "@/components/layout/header";
import { ChatInterface } from "@/components/game/chat-interface";
import { InputArea } from "@/components/game/input-area";
import { CharacterDetailsDialog } from "@/components/game/character-details-dialog";
import { CampaignDetailsDialog } from "@/components/game/campaign-details-dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useGameStore } from "@/lib/store/game-store";
import { useGameChat } from "@/hooks/use-game-chat";
import { useEffect, useRef, useState } from "react";
import type { Run, Character, Campaign, Universe } from "@/lib/db/schema";
import type { UIMessage } from "ai";
import { cn } from "@/lib/utils";

type GamePlayClientProps = {
  run: Run;
  character: Character;
  campaign: Campaign;
  universe: Universe;
  messages: UIMessage[];
};

export function GamePlayClient({
  run,
  character,
  campaign,
  universe,
  messages,
}: GamePlayClientProps) {
  const { setCurrentRun, setCurrentCharacter } = useGameStore();
  const gameChat = useGameChat({
    runId: run.id,
    messages,
  });
  const hasTriggeredInitialMessage = useRef(false);
  const [characterDialogOpen, setCharacterDialogOpen] = useState(false);
  const [campaignDialogOpen, setCampaignDialogOpen] = useState(false);

  useEffect(() => {
    setCurrentRun(run);
    setCurrentCharacter(character);
  }, [run, character, setCurrentRun, setCurrentCharacter]);

  // Trigger initial GM introduction when campaign has no messages
  // Only trigger if there are truly no messages (neither messages prop nor chat messages)
  useEffect(() => {
    if (
      !hasTriggeredInitialMessage.current &&
      messages.length === 0 &&
      gameChat.messages.length === 0 &&
      !gameChat.isLoading
    ) {
      hasTriggeredInitialMessage.current = true;
      // Automatically trigger the GM's initial introduction
      // The API route will detect this as empty and generate an opening scene
      // The UI will filter out empty messages, so this remains hidden
      gameChat.sendMessage({
        text: " ",
      });
    }
  }, [
    messages.length,
    gameChat.messages.length,
    gameChat.isLoading,
    gameChat.sendMessage,
  ]);

  const handleSendMessage = (message: string) => {
    const trimmed = message.trim();
    if (!trimmed) {
      return;
    }
    gameChat.sendMessage({ text: trimmed });
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <Header />
      <main className="flex-1 flex flex-col bg-muted/30 overflow-hidden">
        <div className="container px-4 md:px-6 flex-1 flex flex-col max-w-7xl mx-auto py-4 overflow-hidden">
          <div className="grid gap-4 lg:grid-cols-[1fr_300px] flex-1 min-h-0 overflow-hidden">
            {/* Main Chat Area */}
            <div className="flex flex-col min-h-0 bg-background rounded-lg border shadow-sm overflow-hidden">
              <div className="p-4 border-b shrink-0">
                <h1 className="text-2xl font-bold">{campaign.name}</h1>
                <p className="text-sm text-muted-foreground">
                  Playing as{" "}
                  <span className="font-semibold">{character.name}</span> in{" "}
                  <span className="font-semibold">{universe.name}</span>
                </p>
              </div>
              <div className="flex-1 min-h-0 overflow-hidden">
                <ChatInterface gameChat={gameChat} />
              </div>
              <div className="shrink-0">
                <InputArea
                  onSendMessage={handleSendMessage}
                  isLoading={gameChat.isLoading}
                />
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-2 overflow-y-auto">
              {/* Character Stats - Compact and Clickable */}
              <Card
                className={cn(
                  "cursor-pointer transition-colors hover:bg-muted/50",
                  characterDialogOpen && "ring-2 ring-ring"
                )}
                onClick={() => setCharacterDialogOpen(true)}
              >
                <CardContent className="p-3">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-10 w-10 shrink-0">
                      <AvatarImage
                        src={character.properties?.imageUrl}
                        alt={character.name}
                      />
                      <AvatarFallback className="text-xs font-semibold">
                        {character.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .toUpperCase()
                          .slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold truncate">
                        {character.name}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {character.properties?.profession || "Adventurer"}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Campaign State - Compact and Clickable */}
              <Card
                className={cn(
                  "cursor-pointer transition-colors hover:bg-muted/50",
                  campaignDialogOpen && "ring-2 ring-ring"
                )}
                onClick={() => setCampaignDialogOpen(true)}
              >
                <CardContent className="p-3 space-y-2">
                  <div className="text-xs font-semibold">Campaign</div>
                  <div className="text-xs text-muted-foreground">
                    {run.state.activeFronts.length} fronts,{" "}
                    {
                      run.state.questThreads.filter(
                        (q) => q.status === "active"
                      ).length
                    }{" "}
                    quests
                  </div>
                  <div className="flex gap-2 text-xs">
                    <div>
                      Hope: {(run.state.narrativeVectors.hope * 100).toFixed(0)}
                      %
                    </div>
                    <div>
                      Chaos:{" "}
                      {(run.state.narrativeVectors.chaos * 100).toFixed(0)}%
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>

      {/* Dialogs */}
      <CharacterDetailsDialog
        character={character}
        open={characterDialogOpen}
        onOpenChange={setCharacterDialogOpen}
      />
      <CampaignDetailsDialog
        run={run}
        campaign={campaign}
        open={campaignDialogOpen}
        onOpenChange={setCampaignDialogOpen}
      />
    </div>
  );
}
