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
              {campaign.genres.map((genre, i) => (
                <Badge key={i} variant="outline">
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
                run.state.activeFronts.map((front, i) => (
                  <div key={i} className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold">{front.name}</h4>
                      <Badge variant="outline">
                        {front.doomClock}/{front.maxDoom}
                      </Badge>
                    </div>
                    {front.description && (
                      <p className="text-sm text-muted-foreground">
                        {front.description}
                      </p>
                    )}
                  </div>
                ))
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
            <div className="space-y-2">
              {run.state.questThreads.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No active quest threads
                </p>
              ) : (
                run.state.questThreads.map((quest, i) => (
                  <div key={i} className="border rounded-lg p-3 space-y-1">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold">{quest.title}</h4>
                      <Badge
                        variant={
                          quest.status === "active"
                            ? "default"
                            : quest.status === "completed"
                              ? "secondary"
                              : "outline"
                        }
                      >
                        {quest.status}
                      </Badge>
                    </div>
                    {quest.clues && quest.clues.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs text-muted-foreground mb-1">
                          Clues:
                        </p>
                        <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                          {quest.clues.map((clue, j) => (
                            <li key={j}>{clue}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Knowledge Graph Summary */}
          {run.state.knowledgeGraph && (
            <div>
              <h3 className="text-lg font-semibold mb-2">Knowledge Graph</h3>
              <p className="text-sm text-muted-foreground">
                {run.state.knowledgeGraph.nodes.length} nodes,{" "}
                {run.state.knowledgeGraph.edges.length} connections
              </p>
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
