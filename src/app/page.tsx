import { SignedIn, SignedOut } from "@clerk/nextjs";
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

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        {/* Hero Section - Full viewport Technomancy scene */}
        <HeroScene />

        {/* Game Overview */}
        <section className="border-glow/20 border-y bg-muted/30 py-16">
          <div className="container">
            <div className="mx-auto max-w-3xl text-center">
              <h2 className="mb-4 font-semibold text-3xl md:text-4xl">
                A Living Universe
              </h2>
              <p className="text-muted-foreground">
                Experience the magic of procedural generation combined with
                intelligent storytelling. A Game Master Agent analyzes every
                action, reshaping the campaign parameters to create a truly
                dynamic narrative. No two campaigns are ever the same.
              </p>
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
                      Classical fantasy with magic, elves, and dark forces
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground text-sm">
                      A pseudo-medieval world where magic flows through the
                      land, factions vie for power, and ancient evils stir in
                      the shadows.
                    </p>
                  </CardContent>
                </Card>
                <Card className="border-glow/10 bg-card/50 backdrop-blur-sm transition-all duration-300 hover:border-glow/30 hover:shadow-[0_0_20px_hsl(var(--glow)/0.1)]">
                  <CardHeader>
                    <CardTitle>Sci-fi</CardTitle>
                    <CardDescription>
                      Cyberpunk dystopia with corporations and technology
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground text-sm">
                      Navigate a world where corporations rule, technology
                      advances rapidly, and humanity struggles to adapt. Spy
                      thrillers meet trans-humanism.
                    </p>
                  </CardContent>
                </Card>
                <Card className="border-glow/10 bg-card/50 backdrop-blur-sm transition-all duration-300 hover:border-glow/30 hover:shadow-[0_0_20px_hsl(var(--glow)/0.1)]">
                  <CardHeader>
                    <CardTitle>Horror</CardTitle>
                    <CardDescription>
                      Psychological pressure meets cosmic darkness
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground text-sm">
                      Face the unknown and forbidden. Dark creatures manifest in
                      everyday life, and cosmic horrors beyond mortal
                      comprehension lurk in the shadows.
                    </p>
                  </CardContent>
                </Card>
                <Card className="border-glow/10 bg-card/50 backdrop-blur-sm transition-all duration-300 hover:border-glow/30 hover:shadow-[0_0_20px_hsl(var(--glow)/0.1)]">
                  <CardHeader>
                    <CardTitle>Slice-of-life</CardTitle>
                    <CardDescription>
                      Everyday stories of normal people seeking balance
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground text-sm">
                      Navigate the human condition through friendships, love,
                      and community. Find harmony in the ordinary moments that
                      shape our lives.
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
                    Choose from pre-made universes or create your own. The
                    system generates playable locations, world factions, and
                    rich history that shapes your adventure.
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
                    Each campaign features main conflicts, factions, allies, and
                    enemies. Random events reshape the universe based on your
                    decisions, creating unique endings.
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
                    Build your character with DnD-style skill rolls. Define
                    backstory, profession, and physicality. Skills like
                    Strength, Intelligence, Agility, Scholarship, and Intuition
                    shape your journey.
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
                What Makes It Unique
              </h2>
              <div className="space-y-6 text-left">
                <div className="rounded-lg border border-glow/10 bg-card/30 p-6 backdrop-blur-sm transition-all hover:border-glow/20">
                  <h3 className="mb-2 font-semibold text-xl">
                    Text-Based Narration
                  </h3>
                  <p className="text-muted-foreground">
                    Immerse yourself in poetic, clear descriptions that unfold
                    step by step. Every action triggers events that reshape your
                    world.
                  </p>
                </div>
                <div className="rounded-lg border border-glow/10 bg-card/30 p-6 backdrop-blur-sm transition-all hover:border-glow/20">
                  <h3 className="mb-2 font-semibold text-xl">
                    Dice-Based Actions
                  </h3>
                  <p className="text-muted-foreground">
                    Roll dice correlated to your skill levels. Your character's
                    abilities determine success in physical, intellectual, and
                    social challenges.
                  </p>
                </div>
                <div className="rounded-lg border border-glow/10 bg-card/30 p-6 backdrop-blur-sm transition-all hover:border-glow/20">
                  <h3 className="mb-2 font-semibold text-xl">
                    Visual Scene Generation
                  </h3>
                  <p className="text-muted-foreground">
                    See your environment rendered as images that update with
                    each significant event. Zoom in on characters during
                    conversations or explore your surroundings.
                  </p>
                </div>
                <div className="rounded-lg border border-glow/10 bg-card/30 p-6 backdrop-blur-sm transition-all hover:border-glow/20">
                  <h3 className="mb-2 font-semibold text-xl">
                    Game Master Agent
                  </h3>
                  <p className="text-muted-foreground">
                    An AI Game Master analyzes every action, adjusting campaign
                    parameters to create a responsive, living universe that
                    adapts to your choices.
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
                Ready to Begin?
              </h2>
              <p className="mb-8 text-muted-foreground">
                Start your unique adventure today. Every campaign is a new story
                waiting to be told.
              </p>
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
