"use client";

import { getUserCharactersAction } from "@/app/actions/character";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useUser } from "@clerk/nextjs";
import { BookOpen, Calendar, Plus, Shield, User, Zap } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import Image from "next/image";
import type { Character } from "@/lib/db/schema";

type CharacterListItem = {
  character: Character;
  universeName: string;
  universeImage: string | null;
};

export default function CharactersPage() {
  const { user, isLoaded } = useUser();
  const [characters, setCharacters] = useState<CharacterListItem[]>([]);
  const [loadingCharacters, setLoadingCharacters] = useState(true);

  useEffect(() => {
    if (isLoaded && user) {
      const fetchCharacters = async () => {
        const result = await getUserCharactersAction();
        if (result.success) {
          setCharacters(result.characters || []);
        }
        setLoadingCharacters(false);
      };
      fetchCharacters();
    }
  }, [isLoaded, user]);

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex flex-1 items-center justify-center">
          <div className="size-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 py-12 md:py-20">
        <div className="container">
          <div className="mx-auto max-w-5xl">
            <div className="flex items-center justify-between mb-8">
              <div className="space-y-1">
                <h1 className="font-bold text-3xl tracking-tight md:text-4xl">
                  Your Characters
                </h1>
                <p className="text-muted-foreground">
                  Heroes you've forged across the multiverse
                </p>
              </div>
              <Link href="/universes">
                <Button>
                  <Plus className="w-4 h-4 mr-2" /> New Character
                </Button>
              </Link>
            </div>

            <Card>
              <CardContent className="p-6">
                {loadingCharacters ? (
                  <div className="flex justify-center py-12">
                    <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  </div>
                ) : characters.length > 0 ? (
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {characters.map(({ character, universeName }) => {
                      const imageUrl = character.properties?.imageUrl;
                      const stats = character.stats;
                      const properties = character.properties;
                      const totalStats = stats
                        ? stats.strength +
                          stats.agility +
                          stats.intelligence +
                          stats.scholarship +
                          stats.intuition
                        : 0;
                      const personalityTraits =
                        properties?.personalityTraits || [];
                      const backstory = properties?.backstory || "";
                      const backstoryPreview = backstory
                        ? backstory.length > 60
                          ? `${backstory.substring(0, 60)}...`
                          : backstory
                        : null;

                      return (
                        <Link
                          key={character.id}
                          href={`/characters/${character.id}`}
                        >
                          <div className="flex flex-col border rounded-lg bg-card hover:border-primary/50 transition-colors overflow-hidden group h-full shadow-sm hover:shadow-md cursor-pointer">
                            <div className="relative aspect-square w-full bg-muted">
                              {imageUrl ? (
                                <Image
                                  src={imageUrl}
                                  alt={character.name}
                                  fill
                                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                                />
                              ) : (
                                <div className="flex items-center justify-center h-full text-muted-foreground/20">
                                  <User className="w-24 h-24" />
                                </div>
                              )}
                              <div className="absolute inset-0 bg-linear-to-t from-black/80 via-transparent to-transparent opacity-60" />

                              <div className="absolute bottom-0 left-0 p-4 w-full">
                                <div className="flex justify-between items-end">
                                  <h3 className="font-bold text-xl text-white leading-none shadow-black drop-shadow-md">
                                    {character.name}
                                  </h3>
                                  <Badge
                                    variant="secondary"
                                    className="text-xs shadow-sm bg-background/20 text-white backdrop-blur-sm border-white/20"
                                  >
                                    Lvl 1
                                  </Badge>
                                </div>
                                <p className="text-white/80 text-sm mt-1 font-medium truncate shadow-black drop-shadow-sm">
                                  {properties?.profession || ""}
                                </p>
                              </div>
                            </div>

                            <div className="flex flex-col flex-1 p-3 space-y-2">
                              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <BookOpen className="size-3 shrink-0" />
                                <span className="truncate">{universeName}</span>
                              </div>

                              {backstoryPreview && (
                                <p className="text-xs text-muted-foreground line-clamp-1 leading-snug">
                                  {backstoryPreview}
                                </p>
                              )}

                              {personalityTraits.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                  {personalityTraits
                                    .slice(0, 2)
                                    .map((trait: string, idx: number) => (
                                      <Badge
                                        key={`${character.id}-trait-${idx}`}
                                        variant="outline"
                                        className="text-[10px] px-1.5 py-0.5"
                                      >
                                        {trait}
                                      </Badge>
                                    ))}
                                  {personalityTraits.length > 2 && (
                                    <Badge
                                      variant="outline"
                                      className="text-[10px] px-1.5 py-0.5 text-muted-foreground"
                                    >
                                      +{personalityTraits.length - 2}
                                    </Badge>
                                  )}
                                </div>
                              )}

                              <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1 border-t">
                                {properties?.factionName && (
                                  <div className="flex items-center gap-1">
                                    <Shield className="w-3 h-3 shrink-0" />
                                    <span className="truncate">
                                      {properties.factionName}
                                    </span>
                                  </div>
                                )}
                                {properties?.origin && (
                                  <div className="flex items-center gap-1">
                                    <Zap className="w-3 h-3 shrink-0" />
                                    <span className="truncate">
                                      {properties.origin}
                                    </span>
                                  </div>
                                )}
                                {stats && (
                                  <div className="flex items-center gap-1 ml-auto">
                                    <Zap className="w-3 h-3" />
                                    <span className="font-semibold text-foreground">
                                      {totalStats}
                                    </span>
                                  </div>
                                )}
                              </div>

                              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                <Calendar className="w-2.5 h-2.5" />
                                <span>
                                  {new Date(
                                    character.createdAt
                                  ).toLocaleDateString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                  })}
                                </span>
                              </div>
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-16 text-muted-foreground">
                    <p className="text-lg mb-2">
                      You haven't created any characters yet.
                    </p>
                    <p className="text-sm">
                      Explore the multiverse to start your journey.
                    </p>
                    <Link href="/universes" className="mt-6 inline-block">
                      <Button variant="default">Explore Universes</Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
