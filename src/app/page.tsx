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

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-24 md:py-32">
          <div className="container">
            <div className="mx-auto max-w-3xl text-center">
              <h1 className="mb-6 font-bold text-5xl tracking-tight md:text-6xl">
                Generative Deep Neural Dungeon
              </h1>
              <p className="mb-8 text-muted-foreground text-xl md:text-2xl">
                An AI-driven text-based RPG where every campaign is a unique
                adventure. Your choices shape a living, breathing universe that
                reacts and evolves with every decision.
              </p>
              <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
                <SignedOut>
                  <Button asChild size="lg">
                    <Link href="/sign-up">Begin Your Adventure</Link>
                  </Button>
                  <Button asChild size="lg" variant="outline">
                    <Link href="/sign-in">Sign In</Link>
                  </Button>
                </SignedOut>
                <SignedIn>
                  <Button asChild size="lg">
                    <Link href="/profile">Continue Your Journey</Link>
                  </Button>
                </SignedIn>
              </div>
            </div>
          </div>
        </section>

        {/* Game Overview */}
        <section className="border-y bg-muted/30 py-16">
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
                <Card>
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
                <Card>
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
                <Card>
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
                <Card>
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
        <section className="border-y bg-muted/30 py-16">
          <div className="container">
            <div className="mx-auto max-w-4xl">
              <h2 className="mb-12 text-center font-semibold text-3xl md:text-4xl">
                Core Mechanics
              </h2>
              <div className="grid gap-8 md:grid-cols-3">
                <div>
                  <h3 className="mb-3 font-semibold text-xl">
                    Universe Generation
                  </h3>
                  <p className="text-muted-foreground">
                    Choose from pre-made universes or create your own. The
                    system generates playable locations, world factions, and
                    rich history that shapes your adventure.
                  </p>
                </div>
                <div>
                  <h3 className="mb-3 font-semibold text-xl">
                    Dynamic Campaigns
                  </h3>
                  <p className="text-muted-foreground">
                    Each campaign features main conflicts, factions, allies, and
                    enemies. Random events reshape the universe based on your
                    decisions, creating unique endings.
                  </p>
                </div>
                <div>
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
                <div>
                  <h3 className="mb-2 font-semibold text-xl">
                    Text-Based Narration
                  </h3>
                  <p className="text-muted-foreground">
                    Immerse yourself in poetic, clear descriptions that unfold
                    step by step. Every action triggers events that reshape your
                    world.
                  </p>
                </div>
                <div>
                  <h3 className="mb-2 font-semibold text-xl">
                    Dice-Based Actions
                  </h3>
                  <p className="text-muted-foreground">
                    Roll dice correlated to your skill levels. Your character's
                    abilities determine success in physical, intellectual, and
                    social challenges.
                  </p>
                </div>
                <div>
                  <h3 className="mb-2 font-semibold text-xl">
                    Visual Scene Generation
                  </h3>
                  <p className="text-muted-foreground">
                    See your environment rendered as images that update with
                    each significant event. Zoom in on characters during
                    conversations or explore your surroundings.
                  </p>
                </div>
                <div>
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
        <section className="border-t bg-muted/30 py-16">
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
                <Button asChild size="lg">
                  <Link href="/sign-up">Create Your Character</Link>
                </Button>
              </SignedOut>
              <SignedIn>
                <Button asChild size="lg">
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
