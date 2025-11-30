"use client";

import { getUserCampaignsAction } from "@/app/actions/campaign-queries";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useUser } from "@clerk/nextjs";
import { BookOpen, Calendar, MapPin, Play, Plus } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

interface Campaign {
  id: string;
  name: string;
  description: string | null;
  coverImage: string | null;
  genres: string[];
  universeName: string;
  activeRunsCount: number;
  updatedAt: Date;
}

export default function CampaignsPage() {
  const { user, isLoaded } = useUser();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isLoaded && user) {
      const fetchCampaigns = async () => {
        const result = await getUserCampaignsAction();
        if (result.success && result.campaigns) {
          setCampaigns(result.campaigns);
        }
        setLoading(false);
      };
      fetchCampaigns();
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
      <main className="flex-1 py-12 md:py-20 bg-muted/30">
        <div className="container">
          <div className="mx-auto max-w-6xl">
            <div className="flex items-center justify-between mb-8">
              <div className="space-y-1">
                <h1 className="font-bold text-3xl tracking-tight md:text-4xl">
                  Your Campaigns
                </h1>
                <p className="text-muted-foreground">
                  Active adventures and ongoing sagas.
                </p>
              </div>
              <Link href="/campaign/create">
                <Button size="lg" className="shadow-lg">
                  <Plus className="w-4 h-4 mr-2" /> New Campaign
                </Button>
              </Link>
            </div>

            {loading ? (
              <div className="flex justify-center py-12">
                <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : campaigns.length > 0 ? (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {campaigns.map((campaign) => (
                  <Card
                    key={campaign.id}
                    className="group overflow-hidden border-border/50 hover:shadow-lg transition-all duration-300 flex flex-col h-full"
                  >
                    <div className="relative aspect-video w-full bg-muted overflow-hidden">
                      {campaign.coverImage ? (
                        <Image
                          src={campaign.coverImage}
                          alt={campaign.name}
                          fill
                          className="object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full bg-secondary/20">
                          <BookOpen className="w-12 h-12 text-muted-foreground/30" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-linear-to-t from-black/90 via-black/40 to-transparent opacity-80" />
                      
                      <div className="absolute bottom-0 left-0 p-4 w-full">
                        <h3 className="font-bold text-xl text-white leading-tight shadow-black drop-shadow-md mb-1">
                          {campaign.name}
                        </h3>
                        <div className="flex items-center text-white/80 text-xs gap-2">
                           <MapPin className="w-3 h-3" />
                           <span>{campaign.universeName}</span>
                        </div>
                      </div>

                      {campaign.activeRunsCount > 0 && (
                        <Badge 
                          variant="default"
                          className="absolute top-3 right-3 bg-background/20 backdrop-blur-md border-white/20 text-white hover:bg-background/30"
                        >
                          {campaign.activeRunsCount} Run{campaign.activeRunsCount > 1 ? "s" : ""}
                        </Badge>
                      )}
                    </div>

                    <CardContent className="flex flex-col flex-1 p-4 pt-5">

                      <p className="text-sm text-muted-foreground line-clamp-2 mb-4 flex-1">
                        {campaign.description}
                      </p>

                      <div className="flex flex-wrap gap-1.5 mb-4">
                        {campaign.genres.slice(0, 3).map((genre) => (
                          <span
                            key={genre}
                            className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground border px-1.5 py-0.5 rounded"
                          >
                            {genre}
                          </span>
                        ))}
                      </div>

                      <div className="flex items-center justify-between pt-4 border-t mt-auto">
                        <div className="flex items-center text-xs text-muted-foreground">
                          <Calendar className="w-3 h-3 mr-1" />
                          {new Date(campaign.updatedAt).toLocaleDateString()}
                        </div>
                        <Link href={`/campaign/${campaign.id}`}>
                            <Button size="sm" variant="secondary" className="gap-1">
                                View <Play className="w-3 h-3 ml-1" />
                            </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed rounded-xl bg-muted/10">
                <div className="bg-muted p-4 rounded-full mb-4">
                    <BookOpen className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-semibold mb-2">No active campaigns</h3>
                <p className="text-muted-foreground max-w-sm mb-6">
                  The multiverse is waiting. Create a new campaign to start your journey.
                </p>
                <Link href="/campaign/create">
                  <Button>Start New Adventure</Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
