"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import type { Run, Campaign } from "@/lib/db/schema";

type CampaignDetailsDialogProps = {
  run: Run;
  campaign: Campaign;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function CampaignDetailsDialog({
  run,
  campaign,
  open,
  onOpenChange,
}: CampaignDetailsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Campaign State</DialogTitle>
          <DialogDescription>
            Current state of {campaign.name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Campaign Info */}
          <div>
            <h3 className="text-lg font-semibold mb-2">{campaign.name}</h3>
            {campaign.description && (
              <p className="text-sm text-muted-foreground">
                {campaign.description}
              </p>
            )}
            <div className="flex flex-wrap gap-2 mt-3">
              {campaign.genres.map((genre) => (
                <Badge key={genre} variant="outline">
                  {genre}
                </Badge>
              ))}
            </div>
          </div>

          {/* Active Fronts */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Active Fronts</h3>
            <div className="space-y-3">
              {run.state.activeFronts.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No active fronts
                </p>
              ) : (
                run.state.activeFronts.map((front, index) => {
                  const doomProgress = front.doomClock / front.maxDoom;
                  const isDoomed = front.doomClock >= front.maxDoom;
                  const isNearDoom = doomProgress >= 0.7;
                  return (
                    <div
                      key={`${front.name}-${index}`}
                      className={`border rounded-lg p-3 space-y-2 ${
                        isDoomed
                          ? "border-red-500/50 bg-red-500/5"
                          : isNearDoom
                          ? "border-yellow-500/50 bg-yellow-500/5"
                          : ""
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold">{front.name}</h4>
                        <Badge
                          variant={
                            isDoomed
                              ? "destructive"
                              : isNearDoom
                              ? "outline"
                              : "outline"
                          }
                        >
                          {front.doomClock}/{front.maxDoom}
                        </Badge>
                      </div>
                      {front.description && (
                        <p className="text-sm text-muted-foreground">
                          {front.description}
                        </p>
                      )}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">
                            Doom Clock
                          </span>
                          <span className="font-semibold">
                            {Math.round(doomProgress * 100)}%
                          </span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-2 rounded-full transition-all ${
                              isDoomed
                                ? "bg-red-500"
                                : isNearDoom
                                ? "bg-yellow-500"
                                : "bg-primary"
                            }`}
                            style={{
                              width: `${Math.min(100, doomProgress * 100)}%`,
                            }}
                          />
                        </div>
                      </div>
                      {isDoomed && (
                        <Badge variant="destructive" className="text-xs">
                          ⚠️ DOOM TRIGGERED
                        </Badge>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Narrative Vectors */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Narrative Vectors</h3>
            <div className="space-y-2">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm">Hope</span>
                  <span className="text-sm font-semibold">
                    {(run.state.narrativeVectors.hope * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full"
                    style={{
                      width: `${run.state.narrativeVectors.hope * 100}%`,
                    }}
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm">Chaos</span>
                  <span className="text-sm font-semibold">
                    {(run.state.narrativeVectors.chaos * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-destructive h-2 rounded-full"
                    style={{
                      width: `${run.state.narrativeVectors.chaos * 100}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Quest Threads */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Quest Threads</h3>
            <div className="space-y-3">
              {run.state.questThreads.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No active quest threads
                </p>
              ) : (
                run.state.questThreads.map((quest, index) => (
                  <div
                    key={`${quest.title}-${index}`}
                    className="border rounded-lg p-3 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold">{quest.title}</h4>
                      <Badge
                        variant={
                          quest.status === "active"
                            ? "default"
                            : quest.status === "completed"
                            ? "secondary"
                            : quest.status === "failed"
                            ? "destructive"
                            : "outline"
                        }
                      >
                        {quest.status}
                      </Badge>
                    </div>
                    {quest.description && (
                      <p className="text-sm text-muted-foreground">
                        {quest.description}
                      </p>
                    )}
                    {quest.clues && quest.clues.length > 0 && (
                      <div className="mt-2 space-y-1">
                        <p className="text-xs font-semibold text-muted-foreground">
                          Clues Discovered:
                        </p>
                        <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 pl-2">
                          {quest.clues.map((clue) => (
                            <li key={clue}>{clue}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Knowledge Graph */}
          {run.state.knowledgeGraph && (
            <div>
              <h3 className="text-lg font-semibold mb-3">Knowledge Graph</h3>
              <div className="space-y-4">
                <div className="text-sm text-muted-foreground">
                  {run.state.knowledgeGraph.nodes.length} entities,{" "}
                  {run.state.knowledgeGraph.edges.length} relationships
                </div>

                {/* Nodes */}
                {run.state.knowledgeGraph.nodes.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Entities</h4>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {run.state.knowledgeGraph.nodes.map((node, index) => (
                        <div
                          key={`${node.id}-${index}`}
                          className="border rounded-lg p-2 space-y-1"
                        >
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {node.type}
                            </Badge>
                            <span className="font-semibold text-sm">
                              {node.label}
                            </span>
                          </div>
                          {node.description && (
                            <p className="text-xs text-muted-foreground">
                              {node.description}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Edges */}
                {run.state.knowledgeGraph.edges.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2">
                      Relationships
                    </h4>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {run.state.knowledgeGraph.edges.map((edge, index) => {
                        const sourceNode = run.state.knowledgeGraph.nodes.find(
                          (n) => n.id === edge.source
                        );
                        const targetNode = run.state.knowledgeGraph.nodes.find(
                          (n) => n.id === edge.target
                        );
                        return (
                          <div
                            key={`${edge.source}-${edge.target}-${edge.relation}-${index}`}
                            className="border rounded-lg p-2 space-y-1"
                          >
                            <div className="flex items-center gap-2 flex-wrap text-sm">
                              <span className="font-semibold">
                                {sourceNode?.label || edge.source}
                              </span>
                              <span className="text-muted-foreground">→</span>
                              <Badge variant="outline" className="text-xs">
                                {edge.relation}
                              </Badge>
                              <span className="text-muted-foreground">→</span>
                              <span className="font-semibold">
                                {targetNode?.label || edge.target}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">
                                Strength:
                              </span>
                              <div className="flex-1 bg-muted rounded-full h-1.5 max-w-[100px]">
                                <div
                                  className="bg-primary h-1.5 rounded-full"
                                  style={{
                                    width: `${edge.weight * 100}%`,
                                  }}
                                />
                              </div>
                              <span className="text-xs font-semibold">
                                {Math.round(edge.weight * 100)}%
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Current Context */}
          {run.state.currentContext && (
            <div>
              <h3 className="text-lg font-semibold mb-2">Current Context</h3>
              <p className="text-sm text-muted-foreground">
                {run.state.currentContext}
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
