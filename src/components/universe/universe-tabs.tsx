"use client";

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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Faction, Location } from "@/lib/db/schema";
import {
  BookOpen,
  Crown,
  MapPin,
  Users,
} from "lucide-react";
import Link from "next/link";

interface UniverseTabsProps {
  universe: {
    history: string;
    id: string;
  };
  factions: Faction[];
  locations: Location[];
  characters: any[];
  universeId: string;
}

export function UniverseTabs({
  universe,
  factions,
  locations,
  characters,
  universeId,
}: UniverseTabsProps) {
  return (
    <Tabs defaultValue="lore" className="w-full">
      <TabsList className="grid w-full grid-cols-4 mb-8">
        <TabsTrigger value="lore" className="gap-2">
          <BookOpen className="h-4 w-4" /> Lore
        </TabsTrigger>
        <TabsTrigger value="factions" className="gap-2">
          <Crown className="h-4 w-4" /> Factions
        </TabsTrigger>
        <TabsTrigger value="locations" className="gap-2">
          <MapPin className="h-4 w-4" /> Locations
        </TabsTrigger>
        <TabsTrigger value="characters" className="gap-2">
          <Users className="h-4 w-4" /> Characters
        </TabsTrigger>
      </TabsList>

      <TabsContent
        value="lore"
        className="space-y-6 animate-in slide-in-from-bottom-4 duration-500"
      >
        <Card>
          <CardHeader>
            <CardTitle>History & Origins</CardTitle>
          </CardHeader>
          <CardContent className="prose dark:prose-invert max-w-none">
            <div className="whitespace-pre-wrap text-muted-foreground leading-relaxed">
              {universe.history}
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent
        value="factions"
        className="animate-in slide-in-from-bottom-4 duration-500"
      >
        <div className="grid grid-cols-1 gap-6">
          {factions?.map((faction: Faction) => (
            <Card
              key={faction.name}
              className="overflow-hidden hover:border-primary/50 transition-colors"
            >
              <CardHeader className="bg-muted/30 pb-3">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-xl">{faction.name}</CardTitle>
                  <Badge variant="outline">{faction.ideology}</Badge>
                </div>
                <CardDescription>{faction.description}</CardDescription>
              </CardHeader>
              <CardContent className="pt-4 space-y-3 text-sm">
                <div>
                  <span className="font-semibold text-primary">Resources:</span>{" "}
                  {faction.resources}
                </div>
                <div>
                  <span className="font-semibold text-primary">
                    Relationships:
                  </span>{" "}
                  {faction.relationships}
                </div>
              </CardContent>
            </Card>
          ))}
          {!factions?.length && (
            <div className="text-center py-12 text-muted-foreground">
              No factions recorded.
            </div>
          )}
        </div>
      </TabsContent>

      <TabsContent
        value="locations"
        className="animate-in slide-in-from-bottom-4 duration-500"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {locations?.map((location: Location) => (
            <Card
              key={location.name}
              className="hover:shadow-md transition-shadow"
            >
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start gap-2">
                  <CardTitle className="text-lg">{location.name}</CardTitle>
                  <Badge variant="secondary" className="shrink-0">
                    {location.type}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <p className="mb-3">{location.description}</p>
                {location.key_npcs && location.key_npcs.length > 0 && (
                  <div className="mt-3 pt-3 border-t">
                    <div className="text-xs font-semibold text-foreground mb-1 flex items-center gap-1">
                      <Users className="h-3 w-3" /> Key NPCs
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {location.key_npcs.map((npc: string) => (
                        <span
                          key={npc}
                          className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 text-foreground"
                        >
                          {npc}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
          {!locations?.length && (
            <div className="text-center py-12 text-muted-foreground col-span-2">
              No locations recorded.
            </div>
          )}
        </div>
      </TabsContent>

      <TabsContent
        value="characters"
        className="animate-in slide-in-from-bottom-4 duration-500"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {characters && characters.length > 0 ? (
            characters.map((char: any) => (
              <Link
                href={`/characters/${char.id}`}
                key={char.id}
                className="group"
              >
                <Card className="hover:border-primary/50 transition-all hover:shadow-md h-full">
                  <CardContent className="p-4 flex items-center gap-4">
                    <Avatar className="h-12 w-12 border-2 border-muted group-hover:border-primary/50 transition-colors">
                      <AvatarImage
                        src={char.imageUrl}
                        alt={char.name}
                        className="object-cover"
                      />
                      <AvatarFallback>{char.name[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold truncate group-hover:text-primary transition-colors">
                        {char.name}
                      </h4>
                      <p className="text-xs text-muted-foreground truncate">
                        {char.profession}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))
          ) : (
            <div className="col-span-2 py-12 text-center">
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <Users className="h-8 w-8 opacity-20" />
                <p>No characters forged in this universe yet.</p>
                <Button variant="link" asChild className="mt-2">
                  <Link href={`/characters/create?universeId=${universeId}`}>
                    Be the first to create one
                  </Link>
                </Button>
              </div>
            </div>
          )}
        </div>
      </TabsContent>
    </Tabs>
  );
}

