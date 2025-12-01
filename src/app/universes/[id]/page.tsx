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
import { UniverseTabs } from "@/components/universe/universe-tabs";
import { cn } from "@/lib/utils";
import { ArrowLeft, Calendar, Globe, Play, Sparkles, Zap } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

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
          <div className="absolute inset-0 z-10 bg-linear-to-t from-background via-background/60 to-transparent" />

          {/* Content overlay - single container for both button and content */}
          <div className="absolute inset-0 z-20 flex flex-col">
            <div className="container mx-auto px-6 flex flex-1 flex-col pt-8 md:pt-12">
              {/* Bottom: Universe info - pushed to bottom with mt-auto */}
              <div className="mt-auto pb-6 md:pb-12 space-y-6">
                {/* Top row: Badges and Back button on same horizontal line */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
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
                  <Button
                    asChild
                    variant="secondary"
                    size="sm"
                    className="gap-2 backdrop-blur-md bg-background/50 hover:bg-background/80"
                  >
                    <Link href="/universes">
                      <ArrowLeft className="h-4 w-4" /> Back to Nexus
                    </Link>
                  </Button>
                </div>

                {/* Main content row: Title/Description and Create Character button */}
                <div className="flex flex-col md:flex-row gap-6 items-end justify-between">
                  <div className="space-y-4 max-w-3xl">
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
        </div>

        <div className="container mx-auto px-6 mt-8 relative z-40">
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
              <UniverseTabs
                universe={{
                  history: universe.history,
                  id: universe.id,
                }}
                factions={factions || []}
                locations={locations || []}
                characters={characters || []}
                universeId={id}
              />
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
