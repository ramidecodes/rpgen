"use client";

import { useState, useEffect } from "react";
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
}

export function SceneVisualizer({
  scene,
  isLoading = false,
  error = null,
  onRetry,
  className,
}: SceneVisualizerProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { pendingSceneId } = useGameStore();

  // Check if this scene is pending generation
  const isPending = scene?.id === pendingSceneId || !scene?.imageUrl;

  // Reset image state when scene changes
  useEffect(() => {
    setImageLoaded(false);
    setImageError(false);
  }, [scene?.id]);

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
    return (
      <Card className={className}>
        <CardContent className="space-y-3 pt-6">
          <div className="aspect-video w-full rounded-md bg-muted animate-pulse flex items-center justify-center">
            <p className="text-sm text-muted-foreground">Generating scene...</p>
          </div>
          <div className="space-y-2">
            <div className="h-4 w-3/4 bg-muted animate-pulse rounded" />
            <div className="h-4 w-1/2 bg-muted animate-pulse rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error || imageError || (!scene && !isLoading)) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>
                {error || imageError
                  ? "Failed to load scene image"
                  : "No scene available"}
              </span>
              {onRetry && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onRetry}
                  className="ml-2"
                >
                  Retry
                </Button>
              )}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // No scene available
  if (!scene) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <div className="aspect-video bg-muted rounded-md flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <ImageIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No scene generated yet</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Pending state - scene is being generated
  if (!scene.imageUrl) {
    return (
      <Card className={className}>
        <CardContent className="space-y-3 pt-6">
          <div className="aspect-video w-full rounded-md bg-muted animate-pulse flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <ImageIcon className="h-8 w-8 mx-auto mb-2 opacity-50 animate-pulse" />
              <p className="text-sm">Generating scene...</p>
            </div>
          </div>
          <div className="space-y-1 text-xs text-muted-foreground">
            <p className="line-clamp-2">
              <strong>Scene:</strong> {scene.narrativeContext}
            </p>
            <p>
              <strong>Status:</strong> Pending generation
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className={cn(
        className,
        isPending && "relative border-2 border-primary/30 animate-pulse"
      )}
    >
      <CardContent className="space-y-3 pt-6">
        {/* Scene Image */}
        <div className="relative aspect-video overflow-hidden rounded-md bg-muted">
          {!imageLoaded && (
            <div className="absolute inset-0 z-10 bg-muted animate-pulse" />
          )}
          <Image
            src={scene.imageUrl}
            alt="Current scene"
            fill
            className={`object-cover transition-opacity duration-300 ${
              imageLoaded ? "opacity-100" : "opacity-0"
            }`}
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
                className="absolute top-2 right-2 opacity-75 hover:opacity-100"
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
        </div>

        {/* Scene Metadata */}
        <div className="space-y-1 text-xs text-muted-foreground">
          <p className="line-clamp-2">
            <strong>Scene:</strong> {scene.narrativeContext}
          </p>
          <p>
            <strong>Generated:</strong>{" "}
            {new Date(scene.createdAt).toLocaleDateString()}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
