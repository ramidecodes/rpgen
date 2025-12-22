"use client";

import { Header } from "@/components/layout/header";
import { ChatInterface } from "@/components/game/chat-interface";
import { InputArea } from "@/components/game/input-area";
import { CharacterDetailsDialog } from "@/components/game/character-details-dialog";
import { CampaignDetailsDialog } from "@/components/game/campaign-details-dialog";
import { QuestLogsDialog } from "@/components/game/quest-logs-dialog";
import { RelationshipsDialog } from "@/components/game/relationships-dialog";
import { SceneVisualizer } from "@/components/game/scene-visualizer";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useGameStore } from "@/lib/store/game-store";
import { useGameChat } from "@/hooks/use-game-chat";
import { useEffect, useRef, useState, useCallback } from "react";
import type {
  Run,
  Character,
  Campaign,
  Universe,
  Scene,
} from "@/lib/db/schema";
import type { UIMessage } from "@/types/ui-message";
import type { CampaignState, KnowledgeGraph } from "@/lib/db/schemas/campaign";
import type { Quest } from "@/lib/db/schema";
import { cn } from "@/lib/utils";
import { getCurrentSceneAction } from "@/app/actions/scenes";
import {
  detectStateChanges,
  notifyStateChanges,
} from "@/lib/utils/campaign-state-toasts";
import { BookOpen, ScrollText, Network } from "lucide-react";

type GamePlayClientProps = {
  run: Run;
  character: Character;
  campaign: Campaign;
  universe: Universe;
  messages: UIMessage[];
  currentScene?: Scene | null;
  quests: Quest[];
};

export function GamePlayClient({
  run,
  character,
  campaign,
  universe,
  messages,
  currentScene,
  quests,
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
  const [questsDialogOpen, setQuestsDialogOpen] = useState(false);
  const [relationshipsDialogOpen, setRelationshipsDialogOpen] = useState(false);
  const [currentSceneState, setCurrentSceneState] = useState<Scene | null>(
    currentScene || null
  );
  const currentSceneStateRef = useRef<Scene | null>(currentScene || null);
  const pendingStartRef = useRef<number | null>(null);
  const pendingClearTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // Build CampaignState from separate columns for state change detection
  const buildCampaignState = useCallback<() => CampaignState>(() => {
    const EMPTY_KNOWLEDGE_GRAPH: KnowledgeGraph = { nodes: [], edges: [] };
    const rawKnowledgeGraph =
      (run.relationships as KnowledgeGraph | null) ?? EMPTY_KNOWLEDGE_GRAPH;

    return {
      activeFronts: run.activeFronts || [],
      narrativeVectors: run.narrativeVectors || { hope: 0.5, chaos: 0.5 },
      knowledgeGraph: rawKnowledgeGraph,
      currentContext: run.currentContext || null,
    };
  }, [
    run.activeFronts,
    run.narrativeVectors,
    run.relationships,
    run.currentContext,
  ]);
  const previousCampaignStateRef = useRef<CampaignState>(buildCampaignState());

  useEffect(() => {
    setCurrentRun(run);
    setCurrentCharacter(character);
  }, [run, character, setCurrentRun, setCurrentCharacter]);

  // Subscribe to SSE for real-time scene updates
  // Only recreate connection when run.id changes
  useEffect(() => {
    // Get last event ID from localStorage for catch-up
    const lastEventIdKey = `sse-last-event-id-${run.id}`;
    const lastEventId = localStorage.getItem(lastEventIdKey);
    const eventSourceUrl = lastEventId
      ? `/api/runs/${run.id}/scene-events?lastEventId=${lastEventId}`
      : `/api/runs/${run.id}/scene-events`;
    const eventSource = new EventSource(eventSourceUrl);

    // Track processed event IDs to prevent duplicates
    const processedEventIds = new Set<string>();

    // Handle typed events using addEventListener (cleaner than onmessage)
    eventSource.addEventListener("scene-updated", (event) => {
      try {
        // EventSource automatically sets event.lastEventId from the id: field
        const eventId = event.lastEventId || (event as { id?: string }).id;
        if (eventId && processedEventIds.has(eventId)) {
          // Skip duplicate event
          return;
        }
        if (eventId) {
          processedEventIds.add(eventId);
          localStorage.setItem(lastEventIdKey, eventId);
        }

        const data = JSON.parse(event.data);
        const { sceneId, imageUrl } = data;

        // Clear pending after a minimal delay to ensure the UI renders the pulse
        const clearPending = () => setPendingSceneId(null);
        if (pendingClearTimeoutRef.current) {
          clearTimeout(pendingClearTimeoutRef.current);
        }
        const startedAt = pendingStartRef.current;
        if (startedAt) {
          const elapsed = Date.now() - startedAt;
          const remaining = Math.max(300 - elapsed, 0);
          pendingClearTimeoutRef.current = setTimeout(clearPending, remaining);
        } else {
          clearPending();
        }

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
      } catch (error) {
        console.error("Error parsing scene-updated event:", error);
      }
    });

    eventSource.addEventListener("scene-generation-started", (event) => {
      try {
        const eventId = event.lastEventId || (event as { id?: string }).id;
        if (eventId && processedEventIds.has(eventId)) {
          return;
        }
        if (eventId) {
          processedEventIds.add(eventId);
          localStorage.setItem(lastEventIdKey, eventId);
        }

        const data = JSON.parse(event.data);
        const { sceneId } = data || {};
        if (typeof sceneId === "string") {
          pendingStartRef.current = Date.now();
          if (pendingClearTimeoutRef.current) {
            clearTimeout(pendingClearTimeoutRef.current);
          }
          // Always set to ensure the pulse triggers even for repeated ids
          setPendingSceneId(sceneId);
          // Only fetch if we don't have a scene yet; otherwise keep the current image visible
          if (!currentSceneStateRef.current) {
            getCurrentSceneAction(run.id)
              .then(({ scene }) => {
                if (scene) {
                  setCurrentSceneState(scene);
                  currentSceneStateRef.current = scene;
                }
              })
              .catch((error) => {
                console.error(
                  "Error fetching scene after pending event:",
                  error
                );
              });
          }

          // Fallback: clear pending if nothing changes after a timeout for placeholder ids
          if (sceneId.startsWith("pending-")) {
            setTimeout(() => {
              const currentPending = useGameStore.getState().pendingSceneId;
              if (currentPending === sceneId) {
                setPendingSceneId(null);
              }
            }, 60000);
          }
        }
      } catch (error) {
        console.error("Error parsing scene-generation-started event:", error);
      }
    });

    eventSource.addEventListener("scene-generation-cancelled", (event) => {
      try {
        const eventId = event.lastEventId || (event as { id?: string }).id;
        if (eventId && processedEventIds.has(eventId)) {
          return;
        }
        if (eventId) {
          processedEventIds.add(eventId);
          localStorage.setItem(lastEventIdKey, eventId);
        }

        const data = JSON.parse(event.data);
        const { placeholderId } = data || {};
        if (placeholderId) {
          const currentPending = useGameStore.getState().pendingSceneId;
          if (currentPending === placeholderId) {
            setPendingSceneId(null);
          }
        }
      } catch (error) {
        console.error("Error parsing scene-generation-cancelled event:", error);
      }
    });

    eventSource.addEventListener("campaign-state-updated", (event) => {
      try {
        const eventId = event.lastEventId || (event as { id?: string }).id;
        if (eventId && processedEventIds.has(eventId)) {
          return;
        }
        if (eventId) {
          processedEventIds.add(eventId);
          localStorage.setItem(lastEventIdKey, eventId);
        }

        const data = JSON.parse(event.data);
        if (data?.state) {
          const newState = data.state as CampaignState;
          const oldState = previousCampaignStateRef.current;
          const changes = detectStateChanges(oldState, newState);
          if (changes.length > 0) {
            notifyStateChanges(changes);
            previousCampaignStateRef.current = newState;
          }
        }
      } catch (error) {
        console.error("Error parsing campaign-state-updated event:", error);
      }
    });

    // Fallback handler for any untyped events (shouldn't happen with proper SSE format)
    eventSource.onmessage = (event) => {
      try {
        const eventId = event.lastEventId || (event as { id?: string }).id;
        if (eventId && processedEventIds.has(eventId)) {
          return;
        }
        if (eventId) {
          processedEventIds.add(eventId);
          localStorage.setItem(lastEventIdKey, eventId);
        }
        // Try to parse as JSON and handle based on data structure
        const data = JSON.parse(event.data);
        console.warn("[SSE] Received untyped event, using fallback handler", {
          data,
          eventId,
        });
      } catch (error) {
        console.error("Error parsing untyped SSE event:", error);
      }
    };

    eventSource.onerror = (error) => {
      console.error("SSE connection error:", error);
      // EventSource will automatically reconnect
      // On reconnect, it will use the lastEventId from localStorage
    };

    // Cleanup on unmount or when run.id changes
    return () => {
      eventSource.close();
    };
  }, [run.id, setPendingSceneId]);

  // Update scene state when prop changes (initial load or server-side updates)
  useEffect(() => {
    setCurrentSceneState(currentScene || null);
    currentSceneStateRef.current = currentScene || null;
    // Track pending state: if scene has no imageUrl, it's pending
    if (currentScene && !currentScene.imageUrl) {
      setPendingSceneId(currentScene.id);
    } else if (currentScene?.imageUrl) {
      // Clear pending state when image is available
      setPendingSceneId(null);
    }
  }, [currentScene, setPendingSceneId]);

  // Initialize previous state reference once
  useEffect(() => {
    previousCampaignStateRef.current = buildCampaignState();
  }, [buildCampaignState]);

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
              <div className="shrink-0 overflow-hidden rounded-xl">
                <SceneVisualizer
                  key={currentSceneState?.id}
                  scene={currentSceneState}
                  isLoading={false}
                  className="h-[360px] md:h-[440px]"
                  fullBleed
                />
              </div>

              {/* Bottom Section - Campaign Details */}
              <div className="flex flex-1 flex-col gap-2">
                {/* Character Stats - Compact and Clickable */}
                <Card
                  className={cn(
                    "cursor-pointer transition-colors hover:bg-muted/50",
                    characterDialogOpen && "ring-2 ring-ring"
                  )}
                  onClick={() => setCharacterDialogOpen(true)}
                >
                  <CardContent className="p-2">
                    <div className="flex items-center gap-3">
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
                      <div className="flex min-w-0 flex-1 items-center gap-2 text-sm">
                        <span className="font-semibold truncate">
                          {character.name}
                        </span>
                        <span className="text-muted-foreground truncate">
                          · {character.properties?.profession || "Adventurer"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="flex flex-col items-center">
                          <span className="text-xs font-semibold">
                            {character.stats.strength}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            STR
                          </span>
                        </div>
                        <div className="flex flex-col items-center">
                          <span className="text-xs font-semibold">
                            {character.stats.agility}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            AGI
                          </span>
                        </div>
                        <div className="flex flex-col items-center">
                          <span className="text-xs font-semibold">
                            {character.stats.intelligence}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            INT
                          </span>
                        </div>
                        <div className="flex flex-col items-center">
                          <span className="text-xs font-semibold">
                            {character.stats.scholarship}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            SCH
                          </span>
                        </div>
                        <div className="flex flex-col items-center">
                          <span className="text-xs font-semibold">
                            {character.stats.intuition}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            INTU
                          </span>
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
                  <CardContent className="p-2">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <BookOpen className="size-4 shrink-0" />
                        <span className="font-semibold">Campaign</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-muted-foreground">
                          {(run.activeFronts || []).length} fronts
                        </span>
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-muted-foreground w-10 shrink-0">
                              Hope
                            </span>
                            <div className="w-16 bg-muted rounded-full h-2 overflow-hidden">
                              <div
                                className="h-2 rounded-full transition-all"
                                style={{
                                  width: `${Math.min(
                                    100,
                                    (run.narrativeVectors?.hope || 0.5) * 100
                                  )}%`,
                                  backgroundColor: "hsl(168 50% 45% / 0.7)",
                                }}
                              />
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-muted-foreground w-10 shrink-0">
                              Chaos
                            </span>
                            <div className="w-16 bg-muted rounded-full h-2 overflow-hidden">
                              <div
                                className="h-2 rounded-full transition-all"
                                style={{
                                  width: `${Math.min(
                                    100,
                                    (run.narrativeVectors?.chaos || 0.5) * 100
                                  )}%`,
                                  backgroundColor: "hsl(348 50% 45% / 0.7)",
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Quests - Compact and Clickable */}
                <Card
                  className={cn(
                    "cursor-pointer transition-colors hover:bg-muted/50",
                    questsDialogOpen && "ring-2 ring-ring"
                  )}
                  onClick={() => setQuestsDialogOpen(true)}
                >
                  <CardContent className="p-2">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <ScrollText className="size-4 shrink-0" />
                        <span className="font-semibold">Quests</span>
                      </div>
                      <span className="text-muted-foreground">
                        {quests.filter((q) => q.status === "active").length}{" "}
                        active · {quests.length} total
                      </span>
                    </div>
                  </CardContent>
                </Card>

                {/* Relationships - Compact and Clickable */}
                <Card
                  className={cn(
                    "cursor-pointer transition-colors hover:bg-muted/50",
                    relationshipsDialogOpen && "ring-2 ring-ring"
                  )}
                  onClick={() => setRelationshipsDialogOpen(true)}
                >
                  <CardContent className="p-2">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <Network className="size-4 shrink-0" />
                        <span className="font-semibold">Relationships</span>
                      </div>
                      <span className="text-muted-foreground">
                        {(run.relationships?.nodes || []).length} entities ·{" "}
                        {(run.relationships?.edges || []).length} connections
                      </span>
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
      <QuestLogsDialog
        runId={run.id}
        open={questsDialogOpen}
        onOpenChange={setQuestsDialogOpen}
      />
      <RelationshipsDialog
        run={run}
        open={relationshipsDialogOpen}
        onOpenChange={setRelationshipsDialogOpen}
      />
    </div>
  );
}
