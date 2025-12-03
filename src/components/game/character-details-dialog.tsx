"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import type { Character } from "@/lib/db/schema";

type CharacterDetailsDialogProps = {
  character: Character;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function CharacterDetailsDialog({
  character,
  open,
  onOpenChange,
}: CharacterDetailsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Character Details</DialogTitle>
          <DialogDescription>
            Full information about {character.name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Character Header */}
          <div className="flex items-start gap-4">
            <Avatar className="h-24 w-24">
              <AvatarImage
                src={character.properties?.imageUrl}
                alt={character.name}
              />
              <AvatarFallback className="text-2xl font-semibold">
                {character.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h2 className="text-2xl font-bold">{character.name}</h2>
              <p className="text-muted-foreground">
                {character.properties?.profession || "Adventurer"}
              </p>
              {character.properties?.origin && (
                <p className="text-sm text-muted-foreground mt-1">
                  Origin: {character.properties.origin}
                </p>
              )}
              {character.properties?.factionName && (
                <Badge variant="outline" className="mt-2">
                  {character.properties.factionName}
                </Badge>
              )}
            </div>
          </div>

          {/* Stats */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Attributes</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">STRENGTH</div>
                <div className="text-2xl font-bold">
                  {character.stats.strength}
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">AGILITY</div>
                <div className="text-2xl font-bold">
                  {character.stats.agility}
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">
                  INTELLIGENCE
                </div>
                <div className="text-2xl font-bold">
                  {character.stats.intelligence}
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">SCHOLARSHIP</div>
                <div className="text-2xl font-bold">
                  {character.stats.scholarship}
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">INTUITION</div>
                <div className="text-2xl font-bold">
                  {character.stats.intuition}
                </div>
              </div>
            </div>
          </div>

          {/* Appearance */}
          {character.properties?.appearance && (
            <div>
              <h3 className="text-lg font-semibold mb-2">Appearance</h3>
              <p className="text-sm text-muted-foreground">
                {character.properties.appearance}
              </p>
            </div>
          )}

          {/* Backstory */}
          {character.properties?.backstory && (
            <div>
              <h3 className="text-lg font-semibold mb-2">Backstory</h3>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {character.properties.backstory}
              </p>
            </div>
          )}

          {/* Personality Traits */}
          {character.properties?.personalityTraits &&
            character.properties.personalityTraits.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-2">
                  Personality Traits
                </h3>
                <div className="flex flex-wrap gap-2">
                  {character.properties.personalityTraits.map((trait) => (
                    <Badge key={trait} variant="secondary">
                      {trait}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
