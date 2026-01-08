"use client";

import { deleteUniverse } from "@/app/actions/universe";
import { getUserProfileAction } from "@/app/actions/user-profile";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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
import { Heart, Sparkles, Trash2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { Universe } from "@/lib/db/schema";

type UniverseCardProps = {
  universe: Universe;
  showLikes?: boolean;
  isStarter?: boolean;
  canDelete?: boolean;
};

export function UniverseCard({
  universe,
  showLikes = false,
  isStarter = false,
  canDelete = false,
}: UniverseCardProps) {
  const { user, isLoaded: isUserLoaded } = useUser();
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [userProfileId, setUserProfileId] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);

  // Fetch user profile ID to check ownership
  useEffect(() => {
    if (isUserLoaded && user && canDelete) {
      const fetchUserProfile = async () => {
        try {
          const result = await getUserProfileAction();
          if (result.success && result.data) {
            setUserProfileId(result.data.id);
            setIsOwner(universe.userId === result.data.id);
          }
        } catch (error) {
          console.error("Error fetching user profile:", error);
        }
      };
      fetchUserProfile();
    }
  }, [isUserLoaded, user, canDelete, universe.userId]);

  const handleCardClick = () => {
    router.push(`/universes/${universe.id}`);
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const result = await deleteUniverse(universe.id);
      if (result.success) {
        router.refresh();
      }
    } catch (error) {
      console.error("Error deleting universe:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  // Only show delete button if:
  // 1. canDelete prop is true (user's own universes tab)
  // 2. User is the owner
  // 3. Not a starter template
  const showDeleteButton =
    canDelete && isOwner && !isStarter && universe.userId;

  return (
    <Card className="overflow-hidden flex flex-col h-full hover:shadow-md transition-shadow border-primary/10 group cursor-pointer relative">
      <div className="relative aspect-video w-full bg-muted overflow-hidden">
        <button
          type="button"
          className="h-full w-full cursor-pointer text-left"
          onClick={handleCardClick}
        >
          {universe.coverImage ? (
            <Image
              src={universe.coverImage}
              alt={universe.name}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground bg-secondary/30">
              <Sparkles className="h-8 w-8 opacity-20" />
            </div>
          )}
        </button>
        {/* Keep "Official" badge in top-right for starter templates */}
        {isStarter && (
          <div className="absolute top-2 right-2 z-10">
            <span className="bg-primary/80 text-primary-foreground px-2 py-1 rounded text-xs backdrop-blur-sm font-bold flex items-center gap-1">
              <Sparkles className="h-3 w-3" /> Official
            </span>
          </div>
        )}

        {showDeleteButton && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="destructive"
                size="icon"
                className="absolute top-3 right-3 h-8 w-8 bg-background/20 backdrop-blur-md border-white/20 text-white hover:bg-destructive/90 hover:text-white z-20"
                onClick={(e) => {
                  e.stopPropagation();
                }}
                disabled={isDeleting}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent onClick={(e) => e.stopPropagation()}>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Universe</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete this universe? This action
                  cannot be undone. All associated characters, campaigns, runs,
                  and their messages will be permanently deleted, and all files
                  in storage will be removed.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete();
                  }}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  disabled={isDeleting}
                >
                  {isDeleting ? "Deleting..." : "Delete"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      <Link href={`/universes/${universe.id}`}>
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start gap-2">
            <h3 className="text-xl font-bold line-clamp-1 group-hover:text-primary transition-colors">
              {universe.name}
            </h3>
            {showLikes && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                <Heart className="h-3 w-3 fill-current" />
                {universe.likesCount || 0}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="grow pb-4">
          <p className="text-sm text-foreground/75 line-clamp-3 mb-3">
            {universe.description}
          </p>
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ring-primary/20 bg-primary/5 text-primary">
              {universe.ontology.timeframe}
            </span>
            <span className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ring-primary/20 bg-primary/5 text-primary">
              {universe.ontology.magicLevel}
            </span>
            <span className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ring-secondary-foreground/20 bg-secondary/50 text-secondary-foreground">
              {universe.ontology.socialStructure}
            </span>
          </div>
        </CardContent>
      </Link>
    </Card>
  );
}
