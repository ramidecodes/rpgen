import { SignedIn, SignedOut } from "@clerk/nextjs";
import type { Metadata } from "next";
import Link from "next/link";
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
import { HeroScene } from "@/components/hero/hero-scene";

const baseUrl =
  process.env.NEXT_PUBLIC_SITE_URL || "https://rpgen.ramilabs.com";

export function generateMetadata(): Metadata {
  return {
    title: "RPGen — Infinite Worlds, Boundless Choices",
    description:
      "Step into a world shaped by your decisions. RPGen combines procedural worldbuilding, AI-driven narration, and a Game Master Agent that adapts to every action you take. Every run is its own universe — unique, reactive, and impossible to repeat.",
    keywords: [
      "RPG",
      "role playing game",
      "AI game",
      "text adventure",
      "D&D",
      "procedural generation",
      "game master",
      "interactive fiction",
      "fantasy RPG",
      "sci-fi RPG",
      "horror RPG",
    ],
    openGraph: {
      type: "website",
      url: baseUrl,
      siteName: "RPGen",
      title: "RPGen — Infinite Worlds, Boundless Choices",
      description:
        "Step into a world shaped by your decisions. RPGen combines procedural worldbuilding, AI-driven narration, and a Game Master Agent that adapts to every action you take.",
      images: [
        {
          url: `${baseUrl}/favicon-96x96.png`,
          width: 96,
          height: 96,
          alt: "RPGen",
        },
      ],
    },
    twitter: {
      card: "summary",
      title: "RPGen — Infinite Worlds, Boundless Choices",
      description:
        "Step into a world shaped by your decisions. RPGen combines procedural worldbuilding, AI-driven narration, and a Game Master Agent that adapts to every action you take.",
      images: [`${baseUrl}/favicon-96x96.png`],
    },
  };
}

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        {/* Hero Section - Full viewport Technomancy scene */}
        <HeroScene />

        {/* Hero Copy */}
        <section className="border-glow/20 border-y bg-muted/30 py-16">
          <div className="container">
            <div className="mx-auto max-w-3xl text-center">
              <h1 className="mb-4 font-semibold text-3xl md:text-4xl">
                RPGen — Infinite Worlds, Boundless Choices
              </h1>
              <h2 className="mb-4 font-semibold text-2xl md:text-3xl">
                A Living Universe That Reacts to You
              </h2>
              <div className="space-y-4 text-muted-foreground">
                <p>
                  Step into a world shaped by your decisions. RPGen combines
                  procedural worldbuilding, AI-driven narration, and a Game
                  Master Agent that adapts to every action you take.
                </p>
                <p>
                  Every run is its own universe — unique, reactive, and
                  impossible to repeat.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Genres Section */}
        <section className="py-16 md:py-24">
          <div className="container">
            <div className="mx-auto max-w-5xl">
              <h2 className="mb-12 text-center font-semibold text-3xl md:text-4xl">
                Choose Your Genre
              </h2>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <Card className="border-glow/10 bg-card/50 backdrop-blur-sm transition-all duration-300 hover:border-glow/30 hover:shadow-[0_0_20px_hsl(var(--glow)/0.1)]">
                  <CardHeader>
                    <CardTitle>Fantasy</CardTitle>
                    <CardDescription>
                      Magic, ancient lore, enchanted lands, and factions locked
                      in an eternal struggle.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground text-sm">
                      Face dark forces rising from forgotten realms, forge
                      alliances, or rewrite destiny with your own hand.
                    </p>
                  </CardContent>
                </Card>
                <Card className="border-glow/10 bg-card/50 backdrop-blur-sm transition-all duration-300 hover:border-glow/30 hover:shadow-[0_0_20px_hsl(var(--glow)/0.1)]">
                  <CardHeader>
                    <CardTitle>Sci-fi</CardTitle>
                    <CardDescription>
                      A cyberpunk world of megacorporations, neon-lit streets,
                      and humanity stretched thin by rapid technological
                      evolution.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground text-sm">
                      Navigate intrigue, espionage, trans-humanism, and the
                      shadowy edges of machine intelligence.
                    </p>
                  </CardContent>
                </Card>
                <Card className="border-glow/10 bg-card/50 backdrop-blur-sm transition-all duration-300 hover:border-glow/30 hover:shadow-[0_0_20px_hsl(var(--glow)/0.1)]">
                  <CardHeader>
                    <CardTitle>Horror</CardTitle>
                    <CardDescription>
                      Psychological tension meets cosmic dread.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground text-sm">
                      Walk the thin line between sanity and the supernatural as
                      unseen forces shape your path and entities from other
                      dimensions seep into everyday life.
                    </p>
                  </CardContent>
                </Card>
                <Card className="border-glow/10 bg-card/50 backdrop-blur-sm transition-all duration-300 hover:border-glow/30 hover:shadow-[0_0_20px_hsl(var(--glow)/0.1)]">
                  <CardHeader>
                    <CardTitle>Slice-of-life</CardTitle>
                    <CardDescription>
                      Stories grounded in the human experience — connection,
                      struggle, belonging, and quiet transformation.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground text-sm">
                      Find harmony in ordinary moments or confront the subtle
                      challenges of community, love, and identity.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* Core Mechanics */}
        <section className="border-glow/20 border-y bg-muted/30 py-16">
          <div className="container">
            <div className="mx-auto max-w-4xl">
              <h2 className="mb-12 text-center font-semibold text-3xl md:text-4xl">
                Core Mechanics
              </h2>
              <div className="grid gap-8 md:grid-cols-3">
                <div className="group">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg border border-glow/20 bg-glow/5 transition-colors group-hover:border-glow/40 group-hover:bg-glow/10">
                    <UniverseIcon className="h-6 w-6 text-glow" />
                  </div>
                  <h3 className="mb-3 font-semibold text-xl">
                    Universe Generation
                  </h3>
                  <p className="text-muted-foreground">
                    Start from curated universes or craft your own from scratch.
                    RPGen builds out regions, factions, histories, and
                    mini-dungeons — creating a world with depth, logic, and
                    narrative potential.
                  </p>
                </div>
                <div className="group">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg border border-glow/20 bg-glow/5 transition-colors group-hover:border-glow/40 group-hover:bg-glow/10">
                    <CampaignIcon className="h-6 w-6 text-glow" />
                  </div>
                  <h3 className="mb-3 font-semibold text-xl">
                    Dynamic Campaigns
                  </h3>
                  <p className="text-muted-foreground">
                    Every campaign unfolds differently. Main conflicts evolve,
                    factions shift alliances, enemies adapt, and random events
                    reshape the universe as you progress. Your actions influence
                    every outcome — including how (and when) your story ends.
                  </p>
                </div>
                <div className="group">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg border border-glow/20 bg-glow/5 transition-colors group-hover:border-glow/40 group-hover:bg-glow/10">
                    <CharacterIcon className="h-6 w-6 text-glow" />
                  </div>
                  <h3 className="mb-3 font-semibold text-xl">
                    Character Creation
                  </h3>
                  <p className="text-muted-foreground">
                    Create your hero in classic role-play fashion. Roll for
                    skills, define your origins, profession, and physical
                    traits. Your attributes — Strength, Intelligence, Agility,
                    Scholarship, Intuition — shape both story paths and
                    dice-based challenges.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="py-16 md:py-24">
          <div className="container">
            <div className="mx-auto max-w-3xl text-center">
              <h2 className="mb-8 font-semibold text-3xl md:text-4xl">
                What Makes RPGen Different
              </h2>
              <div className="space-y-6 text-left">
                <div className="rounded-lg border border-glow/10 bg-card/30 p-6 backdrop-blur-sm transition-all hover:border-glow/20">
                  <h3 className="mb-2 font-semibold text-xl">
                    Text-Based Narration
                  </h3>
                  <p className="text-muted-foreground">
                    A refined, story-first experience. Beautifully crafted
                    descriptions respond to every decision, bringing each moment
                    to life with clarity and tone.
                  </p>
                </div>
                <div className="rounded-lg border border-glow/10 bg-card/30 p-6 backdrop-blur-sm transition-all hover:border-glow/20">
                  <h3 className="mb-2 font-semibold text-xl">
                    Dice-Based Actions
                  </h3>
                  <p className="text-muted-foreground">
                    Your abilities matter. Roll dice scaled to your skills to
                    resolve challenges — from combat to persuasion to
                    deciphering ancient lore.
                  </p>
                </div>
                <div className="rounded-lg border border-glow/10 bg-card/30 p-6 backdrop-blur-sm transition-all hover:border-glow/20">
                  <h3 className="mb-2 font-semibold text-xl">
                    Visual Scene Generation
                  </h3>
                  <p className="text-muted-foreground">
                    See your world come alive. RPGen renders each environment as
                    a fresh image whenever a major event unfolds. Zoom into
                    characters, inspect objects, or explore a moment in richer
                    detail.
                  </p>
                </div>
                <div className="rounded-lg border border-glow/10 bg-card/30 p-6 backdrop-blur-sm transition-all hover:border-glow/20">
                  <h3 className="mb-2 font-semibold text-xl">
                    The AI Game Master
                  </h3>
                  <p className="text-muted-foreground">
                    At the heart of RPGen is a Game Master Agent that listens,
                    interprets, and adapts. It reshapes campaign conditions,
                    adjusts world parameters, and keeps every run coherent,
                    surprising, and alive.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="border-glow/20 border-t bg-muted/30 py-16">
          <div className="container">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="mb-4 font-semibold text-3xl md:text-4xl">
                Begin Your Adventure
              </h2>
              <div className="mb-8 space-y-2 text-muted-foreground">
                <p>Every campaign is a new story waiting to be lived.</p>
                <p>Every run opens the door to another universe.</p>
                <p>Start your campaign today.</p>
              </div>
              <SignedOut>
                <Button
                  asChild
                  size="lg"
                  className="glow-border border-2 border-glow bg-background/80 px-6 py-5 font-title text-foreground tracking-wider backdrop-blur-sm transition-all duration-300 hover:bg-glow/20"
                >
                  <Link href="/sign-up">Create Your Character</Link>
                </Button>
              </SignedOut>
              <SignedIn>
                <Button
                  asChild
                  size="lg"
                  className="glow-border border-2 border-glow bg-background/80 px-6 py-5 font-title text-foreground tracking-wider backdrop-blur-sm transition-all duration-300 hover:bg-glow/20"
                >
                  <Link href="/profile">View Your Profile</Link>
                </Button>
              </SignedIn>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

// Icons for the Core Mechanics section
function UniverseIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
      <ellipse
        cx="12"
        cy="12"
        rx="10"
        ry="4"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <ellipse
        cx="12"
        cy="12"
        rx="4"
        ry="10"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  );
}

function CampaignIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M4 19V5C4 3.89543 4.89543 3 6 3H18C19.1046 3 20 3.89543 20 5V19C20 20.1046 19.1046 21 18 21H6C4.89543 21 4 20.1046 4 19Z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M8 7H16"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M8 11H16"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M8 15H12"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CharacterIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M4 20C4 16.6863 7.58172 14 12 14C16.4183 14 20 16.6863 20 20"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
