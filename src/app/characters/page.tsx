"use client";

import { getUserCharactersAction } from "@/app/actions/character";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useUser } from "@clerk/nextjs";
import { BookOpen, Play, Plus, User } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import Image from "next/image";

export default function CharactersPage() {
  const { user, isLoaded } = useUser();
  const [characters, setCharacters] = useState<any[]>([]);
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
              <Link href="/universe">
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
                      
                      return (
                        <div
                          key={character.id}
                          className="flex flex-col border rounded-lg bg-card hover:border-primary/50 transition-colors overflow-hidden group h-full shadow-sm hover:shadow-md"
                        >
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
                                    <Badge variant="secondary" className="text-xs shadow-sm bg-background/20 text-white backdrop-blur-sm border-white/20">
                                        Lvl 1
                                    </Badge>
                                </div>
                                <p className="text-white/80 text-sm mt-1 font-medium truncate shadow-black drop-shadow-sm">
                                    {character.properties?.profession}
                                </p>
                            </div>
                          </div>

                          <div className="flex flex-col flex-1 p-4">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
                              <BookOpen className="w-3 h-3" />
                              <span className="truncate">{universeName}</span>
                            </div>

                            <div className="mt-auto pt-2">
                              <Link href={`/character/${character.id}`} className="w-full block">
                                <Button
                                  size="sm"
                                  className="w-full"
                                  variant="secondary"
                                >
                                  <Play className="w-3 h-3 mr-2" /> Continue
                                </Button>
                              </Link>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-16 text-muted-foreground">
                    <p className="text-lg mb-2">You haven't created any characters yet.</p>
                    <p className="text-sm">Explore the multiverse to start your journey.</p>
                    <Link href="/universe" className="mt-6 inline-block">
                      <Button variant="default">
                        Explore Universes
                      </Button>
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

