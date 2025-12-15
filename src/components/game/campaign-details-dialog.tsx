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
import type { Front } from "@/lib/db/schemas/campaign";

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
              {(run.activeFronts || []).length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No active fronts
                </p>
              ) : (
                (run.activeFronts || []).map((front: Front, index: number) => {
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
                    {((run.narrativeVectors?.hope || 0.5) * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full"
                    style={{
                      width: `${(run.narrativeVectors?.hope || 0.5) * 100}%`,
                    }}
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm">Chaos</span>
                  <span className="text-sm font-semibold">
                    {((run.narrativeVectors?.chaos || 0.5) * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-destructive h-2 rounded-full"
                    style={{
                      width: `${(run.narrativeVectors?.chaos || 0.5) * 100}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Current Context */}
          {run.currentContext && (
            <div>
              <h3 className="text-lg font-semibold mb-2">Current Context</h3>
              <p className="text-sm text-muted-foreground">
                {run.currentContext}
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
