import {
  getPublicUniversesAction,
  getStarterUniversesAction,
  getUserUniversesAction,
} from "@/app/actions/universe";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Universe } from "@/lib/db/schema";
import { ensureUserProfile } from "@/lib/db/utils/user-profile";
import {
  BookOpen,
  Globe,
  Heart,
  Plus,
  Sparkles,
  User as UserIcon,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export default async function UniverseListPage() {
  // Ensure user is authenticated
  try {
    await ensureUserProfile();
  } catch (_e) {
    // Handle redirect or auth check in middleware/layout ideally
  }

  // Fetch data in parallel
  const [publicUniversesRes, userUniversesRes, starterUniversesRes] =
    await Promise.all([
      getPublicUniversesAction({ sort: "recent" }), // Default sort
      getUserUniversesAction(),
      getStarterUniversesAction(),
    ]);

  const publicUniverses = publicUniversesRes.success
    ? publicUniversesRes.universes
    : [];
  const userUniverses = userUniversesRes.success
    ? userUniversesRes.universes
    : [];
  const starterUniverses = starterUniversesRes.success
    ? starterUniversesRes.universes
    : [];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 pb-20">
        <div className="container mx-auto py-12 px-4 space-y-12">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div>
              <h1 className="text-4xl font-bold tracking-tight">
                Universe Nexus
              </h1>
              <p className="text-muted-foreground mt-2">
                Explore existing realities or forge your own.
              </p>
            </div>
            <Link href="/universes/create">
              <Button size="lg" className="gap-2">
                <Plus className="h-5 w-5" />
                Create New Universe
              </Button>
            </Link>
          </div>

          <Tabs defaultValue="my-worlds" className="w-full">
            <TabsList className="mb-8">
              <TabsTrigger value="my-worlds" className="gap-2">
                <UserIcon className="h-4 w-4" /> My Worlds
              </TabsTrigger>
              <TabsTrigger value="community" className="gap-2">
                <Globe className="h-4 w-4" /> Community
              </TabsTrigger>
              <TabsTrigger value="starters" className="gap-2">
                <BookOpen className="h-4 w-4" /> Starter Templates
              </TabsTrigger>
            </TabsList>

            {/* User Universes Section */}
            <TabsContent value="my-worlds" className="space-y-6">
              <div className="flex items-center gap-2 text-2xl font-semibold border-b pb-2">
                <UserIcon className="h-6 w-6 text-primary" />
                <h2>My Universes</h2>
              </div>

              {userUniverses && userUniverses.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {userUniverses.map((universe) => (
                    <UniverseCard key={universe.id} universe={universe} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 border border-dashed rounded-lg bg-muted/30">
                  <p className="text-muted-foreground mb-4">
                    You haven't created any universes yet.
                  </p>
                  <Link href="/universes/create">
                    <Button variant="outline">Create Your First World</Button>
                  </Link>
                </div>
              )}
            </TabsContent>

            {/* Public Universes Section */}
            <TabsContent value="community" className="space-y-6">
              <div className="flex items-center justify-between border-b pb-2">
                <div className="flex items-center gap-2 text-2xl font-semibold">
                  <Globe className="h-6 w-6 text-primary" />
                  <h2>Community Universes</h2>
                </div>
                {/* TODO: Add Client-side sorting controls here if needed, or use URL params */}
              </div>

              {publicUniverses && publicUniverses.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {publicUniverses.map((universe) => (
                    <UniverseCard
                      key={universe.id}
                      universe={universe}
                      showLikes
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">
                    No public universes found. Be the first to publish one!
                  </p>
                </div>
              )}
            </TabsContent>

            {/* Starter Templates Section */}
            <TabsContent value="starters" className="space-y-6">
              <div className="flex items-center gap-2 text-2xl font-semibold border-b pb-2">
                <Sparkles className="h-6 w-6 text-primary" />
                <h2>Starter Templates</h2>
              </div>

              {starterUniverses && starterUniverses.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {starterUniverses.map((universe) => (
                    <UniverseCard
                      key={universe.id}
                      universe={universe}
                      isStarter
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">
                    No starter templates available yet.
                  </p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <Footer />
    </div>
  );
}

function UniverseCard({
  universe,
  showLikes = false,
  isStarter = false,
}: {
  universe: Universe;
  showLikes?: boolean;
  isStarter?: boolean;
}) {
  return (
    <Card className="overflow-hidden flex flex-col h-full hover:shadow-md transition-shadow border-primary/10 group">
      <div className="relative aspect-video w-full bg-muted">
        {universe.coverImage ? (
          <Image
            src={universe.coverImage}
            alt={universe.name}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground bg-secondary/30">
            <Sparkles className="h-8 w-8 opacity-20" />
          </div>
        )}
        <div className="absolute top-2 right-2 flex gap-2">
          <span className="bg-black/60 text-white px-2 py-1 rounded text-xs backdrop-blur-sm font-medium">
            {universe.ontology.timeframe}
          </span>
          {isStarter && (
            <span className="bg-primary/80 text-primary-foreground px-2 py-1 rounded text-xs backdrop-blur-sm font-bold flex items-center gap-1">
              <Sparkles className="h-3 w-3" /> Official
            </span>
          )}
        </div>
      </div>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start gap-2">
          <h3 className="text-xl font-bold line-clamp-1 group-hover:text-primary transition-colors">
            {universe.name}
          </h3>
          {showLikes && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
              <Heart className="h-3 w-3 fill-current" />
              {universe.likesCount || 0}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="grow pb-4">
        <p className="text-sm text-muted-foreground line-clamp-3 mb-3">
          {universe.description}
        </p>
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ring-primary/20 bg-primary/5 text-primary">
            {universe.ontology.magicLevel}
          </span>
          <span className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ring-secondary-foreground/20 bg-secondary/50 text-secondary-foreground">
            {universe.ontology.socialStructure}
          </span>
        </div>
      </CardContent>
      <CardFooter className="border-t bg-muted/5 pt-4">
        <Button
          variant="ghost"
          className="w-full justify-between hover:bg-primary/5 hover:text-primary"
          asChild
        >
          {/* Placeholder link for detail view */}
          <Link href={`/universes/${universe.id}`}>
            Explore World <Plus className="h-4 w-4 ml-2" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

