import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { db } from "@/lib/db";
import { runs, campaigns, characters, universes } from "@/lib/db/schema";
import { getUserProfileByClerkId } from "@/lib/db/queries/user-profile";
import { getPublicUrl } from "@/lib/storage/r2";
import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { BookOpen, Calendar, MapPin, Play, User } from "lucide-react";
import { redirect } from "next/navigation";
import Link from "next/link";

interface RunPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function RunPage({ params }: RunPageProps) {
  const { userId: clerkUserId } = await auth();
  const { id } = await params;

  if (!clerkUserId) {
    redirect("/sign-in");
  }

  const userProfile = await getUserProfileByClerkId(clerkUserId);
  if (!userProfile) {
    redirect("/sign-in");
  }

  // Fetch run with campaign, character, and universe details
  const [runData] = await db
    .select({
      run: runs,
      campaign: campaigns,
      character: characters,
      universe: universes,
    })
    .from(runs)
    .innerJoin(campaigns, eq(runs.campaignId, campaigns.id))
    .innerJoin(characters, eq(runs.characterId, characters.id))
    .innerJoin(universes, eq(campaigns.universeId, universes.id))
    .where(eq(runs.id, id))
    .limit(1);

  if (!runData) {
    return <div>Run not found</div>;
  }

  const { run, campaign, character, universe } = runData;

  // Verify ownership
  if (run.userId !== userProfile.id) {
    redirect("/campaigns");
  }

  // Resolve cover image key to URL if needed
  const coverImageUrl = campaign.coverImage && !campaign.coverImage.startsWith("http")
    ? await getPublicUrl(campaign.coverImage)
    : campaign.coverImage;

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 py-12 md:py-20 bg-muted/30">
        <div className="container px-4 md:px-6">
          <div className="max-w-5xl mx-auto grid gap-8 lg:grid-cols-[2fr_1fr]">
            
            {/* Left Column: Run Info */}
            <div className="space-y-8">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Badge variant="outline" className="bg-background/50 backdrop-blur-sm">
                    {universe.name}
                  </Badge>
                  <Badge variant="default">
                    {run.status}
                  </Badge>
                </div>
                <h1 className="text-4xl font-bold tracking-tight mb-2">{campaign.name}</h1>
                <p className="text-lg text-muted-foreground mb-4">
                  Playing as <span className="font-semibold text-foreground">{character.name}</span>
                </p>
                <p className="text-xl text-muted-foreground leading-relaxed">
                  {campaign.description}
                </p>
              </div>

              {coverImageUrl && (
                <div className="relative aspect-video rounded-xl overflow-hidden shadow-xl border-border/50">
                  <img
                    src={coverImageUrl}
                    alt={campaign.name}
                    className="object-cover w-full h-full"
                  />
                  <div className="absolute inset-0 bg-linear-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
                </div>
              )}

              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold mb-4">Current State</h3>
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="bg-muted/50 p-4 rounded-lg">
                        <h4 className="font-medium text-sm text-muted-foreground mb-2">Active Fronts</h4>
                        <ul className="list-disc list-inside space-y-1 text-sm">
                          {run.state.activeFronts.map((front, i) => (
                            <li key={i}>{front.name}</li>
                          ))}
                        </ul>
                      </div>
                      <div className="bg-muted/50 p-4 rounded-lg">
                        <h4 className="font-medium text-sm text-muted-foreground mb-2">Quest Threads</h4>
                        <ul className="list-disc list-inside space-y-1 text-sm">
                          {run.state.questThreads.map((quest, i) => (
                            <li key={i}>{quest.title}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                    {run.state.currentContext && (
                      <div className="mt-4 bg-muted/50 p-4 rounded-lg">
                        <h4 className="font-medium text-sm text-muted-foreground mb-2">Current Context</h4>
                        <p className="text-sm">{run.state.currentContext}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column: Sidebar / Actions */}
            <div className="space-y-6">
              <Card className="border-primary/20 shadow-md">
                <CardContent className="p-6 space-y-6">
                  <div>
                    <h3 className="font-semibold mb-2 flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-primary" />
                      Details
                    </h3>
                    <dl className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Character</dt>
                        <dd className="font-medium">{character.name}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Profession</dt>
                        <dd>{character.properties?.profession || "Unknown"}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Campaign</dt>
                        <dd>
                          <Link href={`/campaign/${campaign.id}`} className="text-primary hover:underline">
                            {campaign.name}
                          </Link>
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Started</dt>
                        <dd>{new Date(run.createdAt).toLocaleDateString()}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Status</dt>
                        <dd className="capitalize">{run.status}</dd>
                      </div>
                    </dl>
                  </div>

                  <div className="pt-4 border-t">
                    <Link href={`/play/${run.id}`} className="block">
                      <Button className="w-full" size="lg">
                        <Play className="w-4 h-4 mr-2" />
                        Continue Playing
                      </Button>
                    </Link>
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

