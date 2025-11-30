"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createCharacterAction } from "@/app/actions/character";
import { type Universe } from "@/lib/db/schema";
import { Loader2, Dices } from "lucide-react";
import { useRouter } from "next/navigation";

interface Props {
  universe: Universe;
}

export function CharacterCreationForm({ universe }: Props) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  // State for form fields
  const [name, setName] = useState("");
  const [profession, setProfession] = useState("");
  const [backstoryPrompt, setBackstoryPrompt] = useState("");
  const [factionName, setFactionName] = useState<string>("");
  
  // Stats State
  const [stats, setStats] = useState({
    strength: 10,
    agility: 10,
    intelligence: 10,
    scholarship: 10,
    intuition: 10,
  });
  const [hasRolled, setHasRolled] = useState(false);

  const rollStats = () => {
    setStats({
      strength: Math.floor(Math.random() * 20) + 1,
      agility: Math.floor(Math.random() * 20) + 1,
      intelligence: Math.floor(Math.random() * 20) + 1,
      scholarship: Math.floor(Math.random() * 20) + 1,
      intuition: Math.floor(Math.random() * 20) + 1,
    });
    setHasRolled(true);
  };

  const handleSubmit = async () => {
    if (!hasRolled) {
      setError("You must roll for stats before creating a character.");
      return;
    }
    if (!name || !profession) {
      setError("Please fill in all required fields.");
      return;
    }
    setError(null);

    startTransition(async () => {
      const result = await createCharacterAction({
        universeId: universe.id,
        name,
        profession,
        stats,
        backstoryPrompt: backstoryPrompt || undefined,
        factionName: factionName || undefined,
      });

      if (result.success) {
        // Redirect happens in action revalidate but we can also push
        // For now, let's assume we go to profile or the character sheet
        // The action revalidates /profile, so redirecting there is safe
        if (result.character) {
            router.push(`/character/${result.character.id}`);
        } else {
            router.push("/profile");
        }
      } else {
        setError(result.error || "Failed to create character");
      }
    });
  };

  return (
    <div className="space-y-8">
      <div className="grid gap-6 md:grid-cols-2">
        {/* Left Column: Identity */}
        <Card>
          <CardHeader>
            <CardTitle>Identity</CardTitle>
            <CardDescription>Define who your character is.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Character Name</Label>
              <Input
                id="name"
                placeholder="e.g. Zareth the Unbound"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profession">Profession / Class</Label>
              <Input
                id="profession"
                placeholder="e.g. Cyber-Knight, Hedge Wizard"
                value={profession}
                onChange={(e) => setProfession(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Choose something that fits the universe ontology ({universe.ontology.timeframe}, {universe.ontology.magicLevel}).
              </p>
            </div>
            
            {universe.factions && universe.factions.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="faction">Faction Alignment (Optional)</Label>
                <Select value={factionName} onValueChange={setFactionName}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a faction..." />
                  </SelectTrigger>
                  <SelectContent>
                    {universe.factions.map((faction: any, idx: number) => (
                      <SelectItem key={idx} value={faction.name}>
                        {faction.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Aligning with a faction gives you starting relationships.
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="prompt">Backstory Prompt (Optional)</Label>
              <Textarea
                id="prompt"
                placeholder="Give the AI a hint: 'A disgraced noble seeking redemption...' "
                value={backstoryPrompt}
                onChange={(e) => setBackstoryPrompt(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Right Column: Stats */}
        <Card>
          <CardHeader>
            <CardTitle>Attributes</CardTitle>
            <CardDescription>Roll the dice to determine your potential.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4 text-center">
              <StatDisplay label="Strength" value={stats.strength} />
              <StatDisplay label="Agility" value={stats.agility} />
              <StatDisplay label="Intelligence" value={stats.intelligence} />
              <StatDisplay label="Scholarship" value={stats.scholarship} />
              <StatDisplay label="Intuition" value={stats.intuition} />
            </div>
            
            <div className="flex justify-center pt-4">
              <Button 
                variant="outline" 
                onClick={rollStats}
                className="w-full"
                type="button"
              >
                <Dices className="w-4 h-4 mr-2" />
                {hasRolled ? "Re-Roll Stats" : "Roll Stats"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {error && (
        <div className="p-3 text-sm text-red-500 rounded-md bg-red-50">
          {error}
        </div>
      )}

      <div className="flex justify-end">
        <Button 
          onClick={handleSubmit} 
          disabled={isPending || !hasRolled}
          size="lg"
        >
          {isPending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Forging Character...
            </>
          ) : (
            "Create Character"
          )}
        </Button>
      </div>
    </div>
  );
}

function StatDisplay({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col items-center p-3 border rounded-lg bg-muted/30">
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
        {label}
      </span>
      <span className="text-3xl font-bold tabular-nums text-primary">
        {value}
      </span>
    </div>
  );
}
