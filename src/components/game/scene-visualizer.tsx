"use client";

import { useState, type ReactNode } from "react";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ZoomIn, AlertCircle, ImageIcon } from "lucide-react";
import type { Scene } from "@/lib/db/schema";
import { useGameStore } from "@/lib/store/game-store";
import { cn } from "@/lib/utils";

interface SceneVisualizerProps {
  scene?: Scene | null;
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  className?: string;
  fullBleed?: boolean;
}

export function SceneVisualizer({
  scene,
  isLoading = false,
  error = null,
  onRetry,
  className,
  fullBleed = false,
}: SceneVisualizerProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { pendingSceneId } = useGameStore();

  // Check if this scene is pending generation
  const isPending = Boolean(pendingSceneId);
  const pendingCardClass = cn(className, isPending && "relative");

  const renderWrapper = (
    body: ReactNode,
    metadata?: ReactNode,
    containerClassName?: string
  ) => {
    if (fullBleed) {
      return (
        <div
          className={cn(
            "relative h-full w-full overflow-hidden rounded-xl bg-muted",
            className,
            containerClassName
          )}
        >
          {isPending && (
            <div className="pointer-events-none absolute inset-0 rounded-xl border-2 border-primary/50 animate-pulse" />
          )}
          <div className="flex h-full flex-col gap-2">
            <div className="relative flex-1">{body}</div>
            {metadata}
          </div>
        </div>
      );
    }

    return (
      <Card className={pendingCardClass}>
        {isPending && (
          <div className="pointer-events-none absolute inset-0 rounded-lg border-2 border-primary/50 animate-pulse" />
        )}
        <CardContent className="space-y-3 pt-6">
          {body}
          {metadata}
        </CardContent>
      </Card>
    );
  };

  const handleImageLoad = () => {
    setImageLoaded(true);
    setImageError(false);
  };

  const handleImageError = () => {
    setImageError(true);
    setImageLoaded(false);
  };

  // Loading state
  if (isLoading) {
    return renderWrapper(
      <div className="flex h-full min-h-[260px] items-center justify-center rounded-xl bg-muted">
        <p className="text-sm text-muted-foreground">Generating scene...</p>
      </div>
    );
  }

  // Error state
  if (error || imageError || (!scene && !isLoading)) {
    return renderWrapper(
      <div className="flex h-full min-h-[260px] items-center justify-center rounded-xl bg-muted/80">
        <Alert variant="destructive" className="w-full max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>
              {error || imageError
                ? "Failed to load scene image"
                : "No scene available"}
            </span>
            {onRetry && (
              <Button variant="outline" size="sm" onClick={onRetry} className="ml-2">
                Retry
              </Button>
            )}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // No scene available
  if (!scene) {
    return renderWrapper(
      <div className="flex h-full min-h-[260px] items-center justify-center rounded-xl bg-muted">
        <div className="text-center text-muted-foreground">
          <ImageIcon className="mx-auto mb-2 h-8 w-8 opacity-50" />
          <p className="text-sm">No scene generated yet</p>
        </div>
      </div>
    );
  }

  // Pending state - scene is being generated
  if (!scene.imageUrl) {
    const body = (
      <div className="flex h-full min-h-[260px] items-center justify-center rounded-xl bg-muted animate-pulse">
        <div className="text-center text-muted-foreground">
          <ImageIcon className="mx-auto mb-2 h-8 w-8 opacity-50 animate-pulse" />
          <p className="text-sm">Generating scene...</p>
        </div>
      </div>
    );

    const metadata = (
      <div className="text-xs text-muted-foreground">
        <p className="line-clamp-2">{scene.narrativeContext}</p>
        <p>Status: Pending generation</p>
      </div>
    );

    return renderWrapper(body, metadata);
  }

  return (
    renderWrapper(
      <div className="relative h-full min-h-[260px] w-full overflow-hidden rounded-xl bg-muted">
        {!imageLoaded && (
          <div className="absolute inset-0 z-10 bg-muted animate-pulse" />
        )}
        <Image
          src={scene.imageUrl}
          alt="Current scene"
          fill
          className={cn(
            "object-cover transition-opacity duration-300",
            imageLoaded ? "opacity-100" : "opacity-0"
          )}
          onLoad={handleImageLoad}
          onError={handleImageError}
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />

        {/* Zoom Button */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button
              variant="secondary"
              size="sm"
              className="absolute right-2 top-2 opacity-75 hover:opacity-100"
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl">
            <DialogTitle className="sr-only">
              Scene Image - Full Size
            </DialogTitle>
            <div className="relative aspect-video">
              <Image
                src={scene.imageUrl}
                alt="Current scene - full size"
                fill
                className="object-contain"
                onLoad={handleImageLoad}
                onError={handleImageError}
                sizes="100vw"
              />
            </div>
          </DialogContent>
        </Dialog>

        {fullBleed ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent p-4 text-xs text-white">
            <p className="line-clamp-2">{scene.narrativeContext}</p>
          </div>
        ) : null}
      </div>,
      !fullBleed ? (
        <div className="space-y-1 text-xs text-muted-foreground">
          <p className="line-clamp-2">{scene.narrativeContext}</p>
        </div>
      ) : undefined
    )
  );
}
