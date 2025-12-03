"use client";

import { getUserRunsAction } from "@/app/actions/run-queries";
import { deleteRun } from "@/app/actions/run";
import { Header } from "@/components/layout/header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useUser } from "@clerk/nextjs";
import { BookOpen, Calendar, MapPin, Play, Trash2, User } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface Run {
  id: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  campaignName: string;
  campaignDescription: string | null;
  campaignCoverImage: string | null;
  campaignGenres: string[];
  characterName: string;
  characterProfession: string;
  universeName: string;
}

export default function RunsPage() {
  const { user, isLoaded } = useUser();
  const [runs, setRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isLoaded && user) {
      const fetchRuns = async () => {
        const result = await getUserRunsAction();
        if (result.success && result.runs) {
          setRuns(result.runs);
        }
        setLoading(false);
      };
      fetchRuns();
    }
  }, [isLoaded, user]);

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex flex-1 items-center justify-center">
          <div className="size-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </main>
      </div>
    );
  }

  const activeRuns = runs.filter((run) => run.status === "active");
  const completedRuns = runs.filter((run) => run.status === "completed");
  const otherRuns = runs.filter(
    (run) => run.status !== "active" && run.status !== "completed"
  );

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 py-12 md:py-20 bg-muted/30">
        <div className="container">
          <div className="mx-auto max-w-6xl">
            <div className="mb-8">
              <div className="space-y-1">
                <h1 className="font-bold text-3xl tracking-tight md:text-4xl">
                  Your Runs
                </h1>
                <p className="text-muted-foreground">
                  Active game sessions and completed adventures.
                </p>
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center py-12">
                <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : runs.length > 0 ? (
              <div className="space-y-8">
                {activeRuns.length > 0 && (
                  <div>
                    <h2 className="text-xl font-semibold mb-4">Active Runs</h2>
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                      {activeRuns.map((run) => (
                        <RunCard
                          key={run.id}
                          run={run}
                          onDelete={async () => {
                            const result = await getUserRunsAction();
                            if (result.success && result.runs) {
                              setRuns(result.runs);
                            }
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {completedRuns.length > 0 && (
                  <div>
                    <h2 className="text-xl font-semibold mb-4">Completed</h2>
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                      {completedRuns.map((run) => (
                        <RunCard
                          key={run.id}
                          run={run}
                          onDelete={async () => {
                            const result = await getUserRunsAction();
                            if (result.success && result.runs) {
                              setRuns(result.runs);
                            }
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {otherRuns.length > 0 && (
                  <div>
                    <h2 className="text-xl font-semibold mb-4">Other</h2>
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                      {otherRuns.map((run) => (
                        <RunCard
                          key={run.id}
                          run={run}
                          onDelete={async () => {
                            const result = await getUserRunsAction();
                            if (result.success && result.runs) {
                              setRuns(result.runs);
                            }
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed rounded-xl bg-muted/10">
                <div className="bg-muted p-4 rounded-full mb-4">
                  <Play className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-semibold mb-2">No runs yet</h3>
                <p className="text-muted-foreground max-w-sm mb-6">
                  Start a new run from a campaign to begin your adventure.
                </p>
                <Link href="/campaigns">
                  <Button>Browse Campaigns</Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function RunCard({
  run,
  onDelete,
}: {
  run: Run;
  onDelete: () => Promise<void>;
}) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const result = await deleteRun(run.id);
      if (result.success) {
        await onDelete();
      }
    } catch (error) {
      console.error("Error deleting run:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCardClick = () => {
    router.push(`/runs/${run.id}`);
  };

  return (
    <Card className="group overflow-hidden border-border/50 hover:shadow-lg transition-all duration-300 flex flex-col h-full relative">
      <button
        type="button"
        className="relative aspect-video w-full bg-muted overflow-hidden cursor-pointer"
        onClick={handleCardClick}
      >
        {run.campaignCoverImage ? (
          <Image
            src={run.campaignCoverImage}
            alt={run.campaignName}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex items-center justify-center h-full bg-secondary/20">
            <BookOpen className="w-12 h-12 text-muted-foreground/30" />
          </div>
        )}
        <div className="absolute inset-0 bg-linear-to-t from-black/90 via-black/40 to-transparent opacity-80" />

        <div className="absolute bottom-0 left-0 p-4 w-full">
          <h3 className="font-bold text-xl text-white leading-tight shadow-black drop-shadow-md mb-1">
            {run.campaignName}
          </h3>
          <div className="flex items-center text-white/80 text-xs gap-2">
            <MapPin className="w-3 h-3" />
            <span>{run.universeName}</span>
          </div>
        </div>
      </button>

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            variant="destructive"
            size="icon"
            className="absolute top-3 right-3 h-8 w-8 bg-background/20 backdrop-blur-md border-white/20 text-white hover:bg-destructive/90 hover:text-white"
            disabled={isDeleting}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Run</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this run? This action cannot be
              undone. All messages and game state associated with this run will
              be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <CardContent
        className="flex flex-col flex-1 p-4 pt-5 cursor-pointer"
        onClick={handleCardClick}
      >
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded-full">
            <User className="w-3 h-3" />
            {run.characterName}
          </div>
          <span className="text-xs text-muted-foreground">
            ({run.characterProfession})
          </span>
          <Badge
            variant={run.status === "active" ? "default" : "secondary"}
            className="capitalize ml-auto"
          >
            {run.status}
          </Badge>
        </div>

        <p className="text-sm text-muted-foreground line-clamp-2 mb-4 flex-1">
          {run.campaignDescription}
        </p>

        <div className="flex flex-wrap items-center gap-1.5 mt-auto">
          {run.campaignGenres.slice(0, 3).map((genre) => (
            <span
              key={genre}
              className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground border px-1.5 py-0.5 rounded"
            >
              {genre}
            </span>
          ))}
          <div className="flex items-center text-xs text-muted-foreground ml-auto">
            <Calendar className="w-3 h-3 mr-1" />
            {new Date(run.updatedAt).toLocaleDateString()}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
