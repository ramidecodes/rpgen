"use client";

import { createRun } from "@/app/actions/run";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Play, User } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";

interface CharacterOption {
  id: string;
  name: string;
  profession: string;
}

interface CampaignStartFormProps {
  campaignId: string;
  characters: CharacterOption[];
}

export function CampaignStartForm({
  campaignId,
  characters,
}: CampaignStartFormProps) {
  const [isPending, startTransition] = useTransition();
  const [selectedCharacterId, setSelectedCharacterId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedCharacterId) {
      setError("Please select a character.");
      return;
    }

    startTransition(async () => {
      try {
        await createRun({ campaignId, characterId: selectedCharacterId });
      } catch (err) {
        console.error(err);
        setError("Failed to start run. Please try again.");
      }
    });
  };

  if (characters.length === 0) {
    return (
      <div className="text-center space-y-4 p-4 border rounded-lg bg-muted/50">
        <p className="text-sm text-muted-foreground">
          You don't have any characters in this universe yet.
        </p>
        <Link href="/universe">
          <Button variant="secondary" size="sm" className="w-full">
            <User className="w-4 h-4 mr-2" /> Create Character
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="character-select">Choose Your Hero</Label>
        <Select
          value={selectedCharacterId}
          onValueChange={setSelectedCharacterId}
          disabled={isPending}
        >
          <SelectTrigger id="character-select">
            <SelectValue placeholder="Select character..." />
          </SelectTrigger>
          <SelectContent>
            {characters.map((char) => (
              <SelectItem key={char.id} value={char.id}>
                <span className="font-medium">{char.name}</span>
                <span className="text-muted-foreground text-xs ml-2">
                  ({char.profession})
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {error && (
        <div className="text-sm text-destructive font-medium px-1">
          {error}
        </div>
      )}

      <Button
        type="submit"
        className="w-full"
        disabled={isPending || !selectedCharacterId}
      >
        {isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Preparing World...
          </>
        ) : (
          <>
            <Play className="mr-2 h-4 w-4" />
            Start Campaign
          </>
        )}
      </Button>
    </form>
  );
}

