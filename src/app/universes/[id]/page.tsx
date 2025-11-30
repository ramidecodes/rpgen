import { getUniverseAction } from "@/app/actions/universe";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
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
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  Crown,
  Globe,
  MapPin,
  Play,
  Sparkles,
  Users,
  Zap,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default async function UniversePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { success, universe, characters, error } = await getUniverseAction(id);

  if (!success || !universe) {
    if (error === "Unauthorized") {
      return (
        <div className="container mx-auto py-20 text-center">
          <h1 className="text-2xl font-bold text-destructive mb-4">
            Unauthorized
          </h1>
          <p className="text-muted-foreground mb-8">
            You do not have permission to view this universe.
          </p>
          <Link href="/universes">
            <Button>Return to Universe Nexus</Button>
          </Link>
        </div>
      );
    }
    return notFound();
  }

  const { ontology, factions, locations } = universe;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 pb-20">
        {/* Hero Section with Cover Image */}
        <div className="relative h-[40vh] md:h-[50vh] w-full bg-muted">
          {universe.coverImage ? (
            <Image
              src={universe.coverImage}
              alt={universe.name}
              fill
              priority
              className="object-cover opacity-90"
              sizes="100vw"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-secondary/30 text-muted-foreground">
              <Globe className="h-24 w-24 opacity-20" />
            </div>
          )}
          <div className="absolute inset-0 bg-linear-to-t from-background via-background/60 to-transparent" />

          <div className="absolute top-6 left-6">
            <Link href="/universes">
              <Button
                variant="secondary"
                size="sm"
                className="gap-2 backdrop-blur-md bg-background/50 hover:bg-background/80"
              >
                <ArrowLeft className="h-4 w-4" /> Back to Nexus
              </Button>
            </Link>
          </div>

          <div className="absolute bottom-0 left-0 w-full p-6 md:p-12">
            <div className="container mx-auto">
              <div className="flex flex-col md:flex-row gap-6 items-end justify-between">
                <div className="space-y-4 max-w-3xl">
                  <div className="flex flex-wrap gap-2">
                    <Badge icon={<Calendar className="h-3 w-3" />}>
                      {ontology.timeframe}
                    </Badge>
                    <Badge icon={<Zap className="h-3 w-3" />}>
                      {ontology.magicLevel}
                    </Badge>
                    <Badge icon={<Globe className="h-3 w-3" />}>
                      {ontology.physics}
                    </Badge>
                  </div>
                  <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-foreground drop-shadow-lg">
                    {universe.name}
                  </h1>
                  <p className="text-lg md:text-xl text-muted-foreground drop-shadow-md max-w-2xl">
                    {universe.description}
                  </p>
                </div>

                <div className="flex gap-3">
                  <Button
                    asChild
                    size="lg"
                    className="gap-2 shadow-lg animate-in fade-in zoom-in duration-500"
                  >
                    <Link href={`/characters/create?universeId=${id}`}>
                      <Play className="h-5 w-5" /> Create Character
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-6 mt-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Sidebar / Info */}
            <div className="lg:col-span-4 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    Ontology
                  </CardTitle>
                  <CardDescription>
                    The fundamental laws of this reality.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <OntologyItem label="Timeframe" value={ontology.timeframe} />
                  <OntologyItem
                    label="Magic Level"
                    value={ontology.magicLevel}
                  />
                  <OntologyItem label="Physics" value={ontology.physics} />
                  <OntologyItem
                    label="Metaphysics"
                    value={ontology.metaphysics}
                  />
                  <OntologyItem
                    label="Social Structure"
                    value={ontology.socialStructure}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Stats</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <div className="text-2xl font-bold">
                      {universe.playCount}
                    </div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wider">
                      Plays
                    </div>
                  </div>
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <div className="text-2xl font-bold">
                      {universe.likesCount}
                    </div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wider">
                      Likes
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Main Content */}
            <div className="lg:col-span-8">
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
                            <CardTitle className="text-xl">
                              {faction.name}
                            </CardTitle>
                            <Badge variant="outline">{faction.ideology}</Badge>
                          </div>
                          <CardDescription>
                            {faction.description}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-3 text-sm">
                          <div>
                            <span className="font-semibold text-primary">
                              Resources:
                            </span>{" "}
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
                            <CardTitle className="text-lg">
                              {location.name}
                            </CardTitle>
                            <Badge variant="secondary" className="shrink-0">
                              {location.type}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="text-sm text-muted-foreground">
                          <p className="mb-3">{location.description}</p>
                          {location.key_npcs &&
                            location.key_npcs.length > 0 && (
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
                        <Link href={`/characters/${char.id}`} key={char.id} className="group">
                          <Card className="hover:border-primary/50 transition-all hover:shadow-md h-full">
                            <CardContent className="p-4 flex items-center gap-4">
                              <Avatar className="h-12 w-12 border-2 border-muted group-hover:border-primary/50 transition-colors">
                                <AvatarImage src={char.imageUrl} alt={char.name} className="object-cover" />
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
                            <Link href={`/characters/create?universeId=${id}`}>
                              Be the first to create one
                            </Link>
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

// Helper Components

function Badge({
  children,
  icon,
  variant = "default",
  className,
}: {
  children: React.ReactNode;
  icon?: React.ReactNode;
  variant?: "default" | "outline" | "secondary";
  className?: string;
}) {
  const variants = {
    default: "bg-primary/10 text-primary ring-primary/20",
    outline: "bg-background text-foreground ring-border",
    secondary: "bg-secondary text-secondary-foreground ring-secondary/20",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset backdrop-blur-sm",
        variants[variant],
        className
      )}
    >
      {icon}
      {children}
    </span>
  );
}

function OntologyItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b last:border-0 border-border/50">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground text-right">
        {value}
      </span>
    </div>
  );
}

