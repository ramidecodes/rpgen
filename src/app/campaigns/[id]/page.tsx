import { getUserCharactersAction } from "@/app/actions/character";
import { CampaignStartForm } from "@/components/campaign/campaign-start-form";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { db } from "@/lib/db";
import { campaigns, universes, runs } from "@/lib/db/schema";
import { getUserProfileByClerkId } from "@/lib/db/queries/user-profile";
import { getPublicUrl } from "@/lib/storage/r2";
import { auth } from "@clerk/nextjs/server";
import { eq, and } from "drizzle-orm";
import { BookOpen, Calendar, Play } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { redirect, notFound } from "next/navigation";

interface CampaignPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function CampaignPage({ params }: CampaignPageProps) {
  const { userId: clerkUserId } = await auth();
  const { id } = await params;

  if (!clerkUserId) {
    redirect("/sign-in");
  }

  const userProfile = await getUserProfileByClerkId(clerkUserId);
  if (!userProfile) {
    redirect("/sign-in");
  }

  // Fetch campaign and universe details
  const [campaignData] = await db
    .select({
      campaign: campaigns,
      universe: universes,
    })
    .from(campaigns)
    .innerJoin(universes, eq(campaigns.universeId, universes.id))
    .where(eq(campaigns.id, id));

  if (!campaignData) {
    notFound();
  }

  const { campaign, universe } = campaignData;

  // Resolve cover image key to URL if needed
  const coverImageUrl =
    campaign.coverImage && !campaign.coverImage.startsWith("http")
      ? await getPublicUrl(campaign.coverImage)
      : campaign.coverImage;

  // Fetch active runs for this campaign and user
  const activeRuns = await db
    .select()
    .from(runs)
    .where(
      and(
        eq(runs.campaignId, campaign.id),
        eq(runs.userId, userProfile.id),
        eq(runs.status, "active")
      )
    )
    .limit(10);

  // Fetch user characters for the start form
  // Filter characters that belong to this universe
  const charactersResult = await getUserCharactersAction();
  const availableCharacters =
    charactersResult.success && charactersResult.characters
      ? charactersResult.characters
          .filter((c) => c.character.universeId === universe.id)
          .map((c) => ({
            id: c.character.id,
            name: c.character.name,
            profession: c.character.properties?.profession || "Unknown",
          }))
      : [];

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 py-12 md:py-20 bg-muted/30">
        <div className="container px-4 md:px-6">
          <div className="max-w-5xl mx-auto grid gap-8 lg:grid-cols-[2fr_1fr]">
            {/* Left Column: Campaign Info */}
            <div className="space-y-8">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Badge
                    variant="outline"
                    className="bg-background/50 backdrop-blur-sm"
                  >
                    {universe.name}
                  </Badge>
                  {activeRuns.length > 0 && (
                    <Badge variant="default">
                      {activeRuns.length} Active Run
                      {activeRuns.length > 1 ? "s" : ""}
                    </Badge>
                  )}
                </div>
                <h1 className="text-4xl font-bold tracking-tight mb-4">
                  {campaign.name}
                </h1>
                <p className="text-xl text-muted-foreground leading-relaxed">
                  {campaign.description}
                </p>
              </div>

              <div className="relative aspect-video rounded-xl overflow-hidden shadow-xl border-border/50">
                {coverImageUrl ? (
                  <Image
                    src={coverImageUrl}
                    alt={campaign.name}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-secondary flex items-center justify-center">
                    <BookOpen className="w-16 h-16 text-muted-foreground/20" />
                  </div>
                )}
                <div className="absolute inset-0 bg-linear-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
              </div>

              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold mb-4">
                    Campaign Template
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    This campaign serves as a template. Each time you start a
                    new run with a character, a unique narrative state will be
                    generated tailored to that character&apos;s background.
                  </p>
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
                        <dt className="text-muted-foreground">Created</dt>
                        <dd>
                          {new Date(campaign.createdAt).toLocaleDateString()}
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Genres</dt>
                        <dd className="text-right">
                          {campaign.genres.join(", ")}
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Visibility</dt>
                        <dd>{campaign.isPublic ? "Public" : "Private"}</dd>
                      </div>
                    </dl>
                  </div>

                  {activeRuns.length > 0 && (
                    <div className="pt-4 border-t">
                      <h3 className="font-semibold mb-4">Active Runs</h3>
                      <div className="space-y-2">
                        {activeRuns.map((run) => (
                          <Link key={run.id} href={`/runs/${run.id}`}>
                            <Button
                              variant="outline"
                              className="w-full justify-start"
                            >
                              <Play className="w-4 h-4 mr-2" />
                              Continue Run
                            </Button>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="pt-4 border-t">
                    <h3 className="font-semibold mb-4">Start New Run</h3>
                    <CampaignStartForm
                      campaignId={campaign.id}
                      characters={availableCharacters}
                    />
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
