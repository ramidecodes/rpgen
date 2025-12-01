"use client";

import {
  getCharacterAction,
  updateCharacterAction,
  regenerateCharacterPortraitAction,
} from "@/app/actions/character";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import Link from "next/link";
import {
  ArrowLeft,
  BookOpen,
  Shield,
  User,
  Zap,
  Save,
  X,
  Edit2,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { useState, useTransition, useEffect } from "react";
import Image from "next/image";
import { Character } from "@/lib/db/schema";
import { Universe } from "@/lib/db/schema";

type GetCharacterResult =
  | { success: true; character: Character; universe: Universe }
  | { success: false; error: string };

// This needs to be a client component now because of the editing state
export default function CharacterPageWrapper({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [data, setData] = useState<GetCharacterResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    params.then(async ({ id }) => {
      const result = await getCharacterAction(id);
      if (result.success) {
        setData(result as GetCharacterResult);
      } else {
        setError(result.error || "Failed to load");
      }
      setLoading(false);
    });
  }, [params]);

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !data || !data.success) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <h1 className="text-2xl font-bold text-destructive">Error</h1>
            <p className="text-muted-foreground">
              {error || "Character not found"}
            </p>
            <Link href="/characters">
              <Button>Return to Characters</Button>
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <CharacterDetailView character={data.character} universe={data.universe} />
  );
}

function CharacterDetailView({
  character: initialCharacter,
  universe,
}: {
  character: Character;
  universe: Universe;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, startTransition] = useTransition();
  const [isRegenerating, startRegenTransition] = useTransition();
  const [character, setCharacter] = useState(initialCharacter);

  // Form State
  const [formData, setFormData] = useState({
    name: initialCharacter.name,
    profession: initialCharacter.properties?.profession || "",
    factionName: initialCharacter.properties?.factionName || "",
    appearance: initialCharacter.properties?.appearance || "",
    backstory: initialCharacter.properties?.backstory || "",
    personalityTraits: (
      initialCharacter.properties?.personalityTraits || []
    ).join(", "),
  });

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = () => {
    startTransition(async () => {
      const traitsArray = formData.personalityTraits
        .split(",")
        .map((t: string) => t.trim())
        .filter(Boolean);

      const result = await updateCharacterAction(character.id, {
        name: formData.name,
        profession: formData.profession,
        factionName: formData.factionName,
        appearance: formData.appearance,
        backstory: formData.backstory,
        personalityTraits: traitsArray,
      });

      if (result.success && result.character) {
        setCharacter(result.character);
        setIsEditing(false);
      } else {
        // Handle error (toast ideally)
        alert("Failed to save changes");
      }
    });
  };

  const handleRegeneratePortrait = () => {
    if (!confirm("This will replace the current portrait. Are you sure?"))
      return;

    startRegenTransition(async () => {
      const result = await regenerateCharacterPortraitAction(character.id);
      if (result.success && result.imageUrl) {
        setCharacter((prev) => ({
          ...prev,
          properties: prev.properties
            ? {
                ...prev.properties,
                imageUrl: result.imageUrl,
              }
            : {
                profession: "",
                imageUrl: result.imageUrl,
              },
        }));
      } else {
        alert("Failed to regenerate portrait");
      }
    });
  };

  const cancelEdit = () => {
    setFormData({
      name: character.name,
      profession: character.properties?.profession || "",
      factionName: character.properties?.factionName || "",
      appearance: character.properties?.appearance || "",
      backstory: character.properties?.backstory || "",
      personalityTraits: (character.properties?.personalityTraits || []).join(
        ", "
      ),
    });
    setIsEditing(false);
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 py-12">
        <div className="container max-w-5xl">
          <div className="flex items-center justify-between mb-6">
            <Link
              href="/characters"
              className="inline-flex items-center text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to Characters
            </Link>
            <div className="flex gap-2">
              {isEditing ? (
                <>
                  <Button
                    variant="ghost"
                    onClick={cancelEdit}
                    disabled={isSaving}
                  >
                    <X className="w-4 h-4 mr-2" /> Cancel
                  </Button>
                  <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Save className="w-4 h-4 mr-2" />
                    )}
                    Save Changes
                  </Button>
                </>
              ) : (
                <Button variant="outline" onClick={() => setIsEditing(true)}>
                  <Edit2 className="w-4 h-4 mr-2" /> Edit Character
                </Button>
              )}
            </div>
          </div>

          <div className="grid gap-8 md:grid-cols-12">
            {/* Left Column: Portrait & Identity */}
            <div className="md:col-span-4 space-y-6">
              <Card className="overflow-hidden">
                <div className="aspect-square relative bg-muted flex items-center justify-center">
                  {character.properties?.imageUrl ? (
                    <Image
                      src={character.properties.imageUrl}
                      alt={character.name}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <User className="w-20 h-20 text-muted-foreground opacity-20" />
                  )}
                  {isRegenerating && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center backdrop-blur-sm">
                      <Loader2 className="w-8 h-8 text-white animate-spin" />
                    </div>
                  )}
                </div>
                <CardFooter className="p-4 bg-muted/30 flex justify-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full"
                    onClick={handleRegeneratePortrait}
                    disabled={isRegenerating || isEditing}
                  >
                    <RefreshCw className="w-3 h-3 mr-2" /> Regenerate Portrait
                  </Button>
                </CardFooter>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  {isEditing ? (
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <Label>Name</Label>
                        <Input
                          name="name"
                          value={formData.name}
                          onChange={handleInputChange}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label>Profession</Label>
                        <Input
                          name="profession"
                          value={formData.profession}
                          onChange={handleInputChange}
                        />
                      </div>
                    </div>
                  ) : (
                    <>
                      <CardTitle>{character.name}</CardTitle>
                      <CardDescription>
                        {character.properties?.profession}
                      </CardDescription>
                    </>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Universe</span>
                      <Link
                        href={`/universes/${universe.id}`}
                        className="font-medium hover:underline"
                      >
                        {universe.name}
                      </Link>
                    </div>

                    {isEditing ? (
                      <div className="space-y-1">
                        <Label className="text-xs">Faction</Label>
                        <Input
                          name="factionName"
                          value={formData.factionName}
                          onChange={handleInputChange}
                          placeholder="None"
                        />
                      </div>
                    ) : (
                      character.properties?.factionName && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Faction</span>
                          <Badge variant="outline">
                            {character.properties.factionName}
                          </Badge>
                        </div>
                      )
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Shield className="w-4 h-4" /> Attributes
                  </CardTitle>
                  <CardDescription>Base stats are immutable</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <StatRow label="Strength" value={character.stats.strength} />
                  <StatRow label="Agility" value={character.stats.agility} />
                  <StatRow
                    label="Intelligence"
                    value={character.stats.intelligence}
                  />
                  <StatRow
                    label="Scholarship"
                    value={character.stats.scholarship}
                  />
                  <StatRow
                    label="Intuition"
                    value={character.stats.intuition}
                  />
                </CardContent>
              </Card>
            </div>

            {/* Right Column: Lore & Details */}
            <div className="md:col-span-8 space-y-6">
              <Card className="h-full">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-primary" />
                    <CardTitle>Character Sheet</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-8">
                  <div className="space-y-2">
                    <Label className="text-base font-semibold flex items-center gap-2">
                      Backstory
                    </Label>
                    {isEditing ? (
                      <Textarea
                        name="backstory"
                        value={formData.backstory}
                        onChange={handleInputChange}
                        className="min-h-[200px]"
                      />
                    ) : (
                      <div className="prose dark:prose-invert text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground">
                        {character.properties?.backstory ||
                          "No backstory recorded."}
                      </div>
                    )}
                  </div>

                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label className="text-base font-semibold flex items-center gap-2">
                        <User className="w-4 h-4" /> Appearance
                      </Label>
                      {isEditing ? (
                        <Textarea
                          name="appearance"
                          value={formData.appearance}
                          onChange={handleInputChange}
                          className="min-h-[100px]"
                        />
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          {character.properties?.appearance ||
                            "No description available."}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label className="text-base font-semibold flex items-center gap-2">
                        <Zap className="w-4 h-4" /> Personality Traits
                      </Label>
                      {isEditing ? (
                        <>
                          <Input
                            name="personalityTraits"
                            value={formData.personalityTraits}
                            onChange={handleInputChange}
                            placeholder="Brave, Stoic, Curious (comma separated)"
                          />
                          <p className="text-xs text-muted-foreground">
                            Separate traits with commas
                          </p>
                        </>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {character.properties?.personalityTraits?.map(
                            (trait: string) => (
                              <Badge key={trait} variant="secondary">
                                {trait}
                              </Badge>
                            )
                          ) || (
                            <span className="text-sm text-muted-foreground">
                              Unknown
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

function StatRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="font-mono font-medium text-primary">{value}</span>
    </div>
  );
}
