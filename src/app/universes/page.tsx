import {
  getPublicUniversesAction,
  getStarterUniversesAction,
  getUserUniversesAction,
} from "@/app/actions/universe";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ensureUserProfile } from "@/lib/db/utils/user-profile";
import {
  BookOpen,
  Globe,
  Plus,
  Sparkles,
  User as UserIcon,
} from "lucide-react";
import Link from "next/link";
import { UniverseCard } from "@/components/universe/universe-card";

export const dynamic = "force-dynamic";

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
                    <UniverseCard
                      key={universe.id}
                      universe={universe}
                      canDelete
                    />
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
