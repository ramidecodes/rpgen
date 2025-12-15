"use client";

import { Header } from "@/components/layout/header";
import { ChatInterface } from "@/components/game/chat-interface";
import { InputArea } from "@/components/game/input-area";
import { CharacterDetailsDialog } from "@/components/game/character-details-dialog";
import { CampaignDetailsDialog } from "@/components/game/campaign-details-dialog";
import { SceneVisualizer } from "@/components/game/scene-visualizer";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useGameStore } from "@/lib/store/game-store";
import { useGameChat } from "@/hooks/use-game-chat";
import { useEffect, useRef, useState } from "react";
import type {
  Run,
  Character,
  Campaign,
  Universe,
  Scene,
} from "@/lib/db/schema";
import type { UIMessage } from "@/types/ui-message";
import type { QuestThread, CampaignState } from "@/lib/db/schemas/campaign";
import { cn } from "@/lib/utils";
import { getCurrentSceneAction } from "@/app/actions/scenes";
import { getRunStateAction } from "@/app/actions/game";
import {
  detectStateChanges,
  notifyStateChanges,
} from "@/lib/utils/campaign-state-toasts";

type GamePlayClientProps = {
  run: Run;
  character: Character;
  campaign: Campaign;
  universe: Universe;
  messages: UIMessage[];
  currentScene?: Scene | null;
};

export function GamePlayClient({
  run,
  character,
  campaign,
  universe,
  messages,
  currentScene,
}: GamePlayClientProps) {
  const { setCurrentRun, setCurrentCharacter, setPendingSceneId } =
    useGameStore();
  const gameChat = useGameChat({
    runId: run.id,
    messages,
  });
  const hasTriggeredInitialMessage = useRef(false);
  const [characterDialogOpen, setCharacterDialogOpen] = useState(false);
  const [campaignDialogOpen, setCampaignDialogOpen] = useState(false);
  const [currentSceneState, setCurrentSceneState] = useState<Scene | null>(
    currentScene || null
  );
  const previousCampaignStateRef = useRef<CampaignState>(run.state);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setCurrentRun(run);
    setCurrentCharacter(character);
  }, [run, character, setCurrentRun, setCurrentCharacter]);

  // Subscribe to SSE for real-time scene updates
  useEffect(() => {
    // Only subscribe when game is active (not loading)
    if (gameChat.isLoading) {
      return;
    }

    const eventSource = new EventSource(`/api/runs/${run.id}/scene-events`);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "scene-updated") {
          const { sceneId, imageUrl } = data.data;

          // Clear pending state when scene is updated
          setPendingSceneId(null);

          // Fetch the full scene data to ensure we have the latest state
          getCurrentSceneAction(run.id)
            .then(({ scene }) => {
              if (scene) {
                setCurrentSceneState(scene);
                // Ensure pending state is cleared
                if (scene.imageUrl) {
                  setPendingSceneId(null);
                }
              } else if (imageUrl) {
                // If scene fetch fails but we have imageUrl, update current scene
                setCurrentSceneState((prevScene) => {
                  if (prevScene && prevScene.id === sceneId) {
                    return {
                      ...prevScene,
                      imageUrl,
                    } as Scene;
                  }
                  return prevScene;
                });
                setPendingSceneId(null);
              }
            })
            .catch((error) => {
              console.error("Error fetching scene after SSE update:", error);
              // Fallback: update imageUrl if we have it and it matches current scene
              setCurrentSceneState((prevScene) => {
                if (prevScene && prevScene.id === sceneId && imageUrl) {
                  return {
                    ...prevScene,
                    imageUrl,
                  } as Scene;
                }
                return prevScene;
              });
              setPendingSceneId(null);
            });
        }
      } catch (error) {
        console.error("Error parsing SSE event:", error);
      }
    };

    eventSource.onerror = (error) => {
      console.error("SSE connection error:", error);
      // EventSource will automatically reconnect
    };

    // Cleanup on unmount
    return () => {
      eventSource.close();
    };
  }, [run.id, gameChat.isLoading, setPendingSceneId]);

  // Update scene state when prop changes (initial load or server-side updates)
  useEffect(() => {
    setCurrentSceneState(currentScene || null);
    // Track pending state: if scene has no imageUrl, it's pending
    if (currentScene && !currentScene.imageUrl) {
      setPendingSceneId(currentScene.id);
    } else if (currentScene?.imageUrl) {
      // Clear pending state when image is available
      setPendingSceneId(null);
    }
  }, [currentScene, setPendingSceneId]);

  // Poll for campaign state changes and show toast notifications
  useEffect(() => {
    // Initialize previous state
    previousCampaignStateRef.current = run.state;

    // Poll for state updates every 5 seconds
    const pollState = async () => {
      try {
        const result = await getRunStateAction(run.id);
        if (result.success && result.state) {
          const newState = result.state;
          const oldState = previousCampaignStateRef.current;

          // Detect changes
          const changes = detectStateChanges(oldState, newState);
          if (changes.length > 0) {
            // Show toast notifications
            notifyStateChanges(changes);
            // Update previous state
            previousCampaignStateRef.current = newState;
          }
        }
      } catch (error) {
        console.error("Error polling campaign state:", error);
      }
    };

    // Poll immediately, then every 5 seconds
    pollState();
    pollingIntervalRef.current = setInterval(pollState, 5000);

    // Cleanup on unmount
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [run.id, run.state]);

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
          {/* Campaign Header */}
          <div className="mb-4">
            <h1 className="text-2xl font-bold">{campaign.name}</h1>
            <p className="text-sm text-muted-foreground">
              Playing as <span className="font-semibold">{character.name}</span>{" "}
              in <span className="font-semibold">{universe.name}</span>
            </p>
          </div>

          {/* Two-Column Layout */}
          <div className="flex-1 grid gap-4 md:grid-cols-[1fr_1fr] min-h-0 overflow-hidden">
            {/* Left Column - Chat Area */}
            <div className="flex flex-col min-h-0 bg-background rounded-lg border shadow-sm overflow-hidden">
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

            {/* Right Column - Game Information Panel */}
            <div className="flex flex-col gap-4 min-h-0 overflow-hidden">
              {/* Top Section - Scene Visualizer */}
              <div className="shrink-0">
                <SceneVisualizer
                  scene={currentSceneState}
                  isLoading={false}
                  className="h-auto"
                />
              </div>

              {/* Bottom Section - Campaign Details */}
              <div className="flex-1 min-h-0 overflow-y-auto space-y-2">
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
                          (q: QuestThread) => q.status === "active"
                        ).length
                      }{" "}
                      quests
                    </div>
                    <div className="flex gap-2 text-xs">
                      <div>
                        Hope:{" "}
                        {(run.state.narrativeVectors.hope * 100).toFixed(0)}%
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
