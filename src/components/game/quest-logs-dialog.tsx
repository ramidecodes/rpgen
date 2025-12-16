"use client";

import { useCallback, useEffect, useState } from "react";

import { getQuestsAction } from "@/app/actions/quests";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { Quest } from "@/lib/db/schema";

type QuestLogsDialogProps = {
  runId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function QuestLogsDialog({
  runId,
  open,
  onOpenChange,
}: QuestLogsDialogProps) {
  const [quests, setQuests] = useState<Quest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const selectedStatus: "all" | "active" | "completed" | "failed" | "dormant" =
    "all";

  const loadQuests = useCallback(async () => {
    try {
      setLoading(true);
      const result = await getQuestsAction(runId);
      if (result.success && result.quests) {
        setQuests(result.quests as Quest[]);
      } else {
        console.error("Error loading quests:", result.error);
      }
    } catch (error) {
      console.error("Error loading quests:", error);
    } finally {
      setLoading(false);
    }
  }, [runId]);

  useEffect(() => {
    if (open && runId) {
      void loadQuests();
    }
  }, [open, runId, loadQuests]);

  const filteredQuests = quests.filter((quest) => {
    const matchesSearch =
      searchQuery === "" ||
      quest.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      quest.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      selectedStatus === "all" || quest.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  const questsByStatus = {
    active: quests.filter((q) => q.status === "active"),
    completed: quests.filter((q) => q.status === "completed"),
    failed: quests.filter((q) => q.status === "failed"),
    dormant: quests.filter((q) => q.status === "dormant"),
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Quest Logs</DialogTitle>
          <DialogDescription>
            View all quests, clues, and event logs for this campaign
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 flex flex-col min-h-0 space-y-4">
          {/* Search and Filter */}
          <div className="flex gap-2">
            <Input
              placeholder="Search quests..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
            />
          </div>

          {/* Quest Summary */}
          <div className="flex gap-2 text-sm text-muted-foreground">
            <span>
              Total: {quests.length} | Active: {questsByStatus.active.length} |
              Completed: {questsByStatus.completed.length} | Failed:{" "}
              {questsByStatus.failed.length}
            </span>
          </div>

          {/* Quest List */}
          <div className="flex-1 overflow-y-auto space-y-4">
            {loading ? (
              <div className="text-center text-muted-foreground py-8">
                Loading quests...
              </div>
            ) : filteredQuests.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                {searchQuery || selectedStatus !== "all"
                  ? "No quests match your filters"
                  : "No quests yet"}
              </div>
            ) : (
              <Accordion
                type="single"
                collapsible
                className="space-y-2"
                defaultValue={
                  filteredQuests.length > 0 ? filteredQuests[0]?.id : undefined
                }
              >
                {filteredQuests.map((quest) => {
                  const statusVariant =
                    quest.status === "active"
                      ? "default"
                      : quest.status === "completed"
                        ? "secondary"
                        : quest.status === "failed"
                          ? "destructive"
                          : "outline";
                  return (
                    <AccordionItem
                      key={quest.id}
                      value={quest.id}
                      className="rounded-lg border bg-card"
                    >
                      <AccordionTrigger className="px-4 py-3 hover:no-underline">
                        <div className="flex w-full flex-col gap-1 text-left">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-2">
                              <h3 className="text-sm font-semibold">
                                {quest.title}
                              </h3>
                              <Badge variant={statusVariant}>
                                {quest.status}
                              </Badge>
                            </div>
                            <span className="text-[11px] text-muted-foreground">
                              Updated:{" "}
                              {new Date(quest.updatedAt).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                            <span>Clues: {quest.clues.length}</span>
                            <span>Logs: {quest.logs.length}</span>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-4 pb-4">
                        <div className="space-y-4 text-sm">
                          <p className="leading-6 text-foreground">
                            {quest.description}
                          </p>

                          <div className="space-y-2">
                            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                              Clues ({quest.clues.length})
                            </div>
                            {quest.clues.length > 0 ? (
                              <div className="space-y-2">
                                {quest.clues.map((clue, index) => (
                                  <div
                                    key={`${quest.id}-clue-${index}`}
                                    className="rounded-md border bg-muted/40 px-3 py-2"
                                  >
                                    {clue}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-xs text-muted-foreground">
                                No clues yet.
                              </p>
                            )}
                          </div>

                          <div className="space-y-2">
                            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                              Logs ({quest.logs.length})
                            </div>
                            {quest.logs.length > 0 ? (
                              <div className="max-h-48 space-y-2 overflow-y-auto pr-1">
                                {quest.logs.map((log, index) => (
                                  <div
                                    key={`${quest.id}-log-${index}`}
                                    className="rounded-md border-l-4 border-muted bg-muted/30 px-3 py-2"
                                  >
                                    {log}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-xs text-muted-foreground">
                                No logs yet.
                              </p>
                            )}
                          </div>

                          <div className="text-[11px] text-muted-foreground">
                            Created:{" "}
                            {new Date(quest.createdAt).toLocaleString()} •
                            Updated:{" "}
                            {new Date(quest.updatedAt).toLocaleString()}
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
