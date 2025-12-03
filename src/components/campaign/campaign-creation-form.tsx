"use client";

import { createCampaign } from "@/app/actions/campaign";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { Loader2, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

interface UniverseOption {
  id: string;
  name: string;
  description: string;
}

interface CampaignCreationFormProps {
  universes: UniverseOption[];
}

const AVAILABLE_GENRES = ["Fantasy", "Sci-Fi", "Slice of Life", "Horror"];

export function CampaignCreationForm({ universes }: CampaignCreationFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedUniverseId, setSelectedUniverseId] = useState<string>("");
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [isPublic, setIsPublic] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenreToggle = (genre: string) => {
    setSelectedGenres((prev) => {
      if (prev.includes(genre)) {
        return prev.filter((g) => g !== genre);
      }
      if (prev.length >= 3) {
        return prev;
      }
      return [...prev, genre];
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedUniverseId) {
      setError("Please select a universe.");
      return;
    }

    if (selectedGenres.length === 0) {
      setError("Please select at least one genre.");
      return;
    }

    startTransition(async () => {
      try {
        await createCampaign({
          name,
          description: description || undefined,
          universeId: selectedUniverseId,
          genres: selectedGenres,
          isPublic,
        });
      } catch (err) {
        console.error(err);
        setError("Failed to create campaign. Please try again.");
      }
    });
  };

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-lg border-border/50">
      <CardHeader>
        <CardTitle className="text-2xl">Start a New Campaign</CardTitle>
        <CardDescription>
          Design your adventure's setting and tone.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-6">
          {/* Universe Selection */}
          <div className="space-y-2">
            <Label htmlFor="universe">Select Universe</Label>
            <Select
              value={selectedUniverseId}
              onValueChange={setSelectedUniverseId}
              disabled={isPending}
            >
              <SelectTrigger id="universe">
                <SelectValue placeholder="Choose a world..." />
              </SelectTrigger>
              <SelectContent>
                {universes.length === 0 ? (
                  <div className="p-2 text-sm text-muted-foreground text-center">
                    No universes found. Create one first!
                  </div>
                ) : (
                  universes.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            <p className="text-[0.8rem] text-muted-foreground">
              The setting where your story will unfold.
            </p>
          </div>

          {/* Basic Details */}
          <div className="space-y-2">
            <Label htmlFor="name">Campaign Name</Label>
            <Input
              id="name"
              placeholder="e.g., The Shadow over Neo-Tokyo"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={isPending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              placeholder="A brief summary of your adventure..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isPending}
            />
          </div>

          {/* Genres */}
          <div className="space-y-2">
            <Label>Genres (Max 3)</Label>
            <div className="flex flex-wrap gap-2">
              {AVAILABLE_GENRES.map((genre) => {
                const isSelected = selectedGenres.includes(genre);
                return (
                  <Button
                    key={genre}
                    type="button"
                    variant={isSelected ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleGenreToggle(genre)}
                    disabled={isPending}
                    className={cn(
                      "transition-all",
                      isSelected && "ring-2 ring-primary ring-offset-2"
                    )}
                  >
                    {genre}
                  </Button>
                );
              })}
            </div>
            <p className="text-[0.8rem] text-muted-foreground">
              Selected: {selectedGenres.join(", ") || "None"}
            </p>
          </div>

          {/* Visibility */}
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label className="text-base">Public Campaign</Label>
              <div className="text-[0.8rem] text-muted-foreground">
                Allow others to view your campaign log (read-only).
              </div>
            </div>
            <Switch
              checked={isPublic}
              onCheckedChange={setIsPublic}
              disabled={isPending}
            />
          </div>

          {error && (
            <div className="text-sm text-destructive font-medium px-1">
              {error}
            </div>
          )}
        </CardContent>

        <CardFooter className="flex justify-end gap-4">
          <Button
            type="button"
            variant="ghost"
            onClick={() => router.back()}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={
              isPending || !selectedUniverseId || selectedGenres.length === 0
            }
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating World State...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Create Campaign
              </>
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
