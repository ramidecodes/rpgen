import type { Metadata } from "next";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const baseUrl =
  process.env.NEXT_PUBLIC_SITE_URL || "https://rpgen.ramilabs.com";

export function generateMetadata(): Metadata {
  return {
    title: "About RPGen",
    description:
      "Learn about RPGen, a web-based text RPG that combines the best elements of classic adventure games with AI-driven procedural world generation and dynamic storytelling.",
    keywords: [
      "RPGen",
      "RPG",
      "about",
      "game mechanics",
      "AI game master",
      "procedural generation",
      "text adventure",
    ],
    openGraph: {
      type: "website",
      url: `${baseUrl}/about`,
      siteName: "RPGen",
      title: "About RPGen",
      description:
        "Learn about RPGen, a web-based text RPG that combines the best elements of classic adventure games with AI-driven procedural world generation.",
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
      title: "About RPGen",
      description:
        "Learn about RPGen, a web-based text RPG that combines the best elements of classic adventure games with AI-driven procedural world generation.",
      images: [`${baseUrl}/favicon-96x96.png`],
    },
  };
}

export default function AboutPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <div className="container py-16 md:py-24">
          <div className="mx-auto max-w-4xl">
            <h1 className="mb-8 font-bold text-4xl md:text-5xl">About</h1>

            {/* Introduction */}
            <section className="mb-16">
              <p className="mb-4">
                RPGen is a web-based text RPG that combines the best elements of
                classic adventure games. Inspired by old-school text-based
                dungeons, traditional Dungeons & Dragons mechanics, and
                point-and-click adventure games, it offers a unique experience
                where every campaign is procedurally generated and dynamically
                shaped by your decisions.
              </p>
              <p className="text-muted-foreground">
                A Game Master Agent analyzes every action you take, reshaping
                the underlying parameters of the campaign to create a living,
                breathing universe that reacts to your choices in unique ways.
                No two campaigns are ever identical.
              </p>
            </section>

            {/* World Generation */}
            <section className="mb-16">
              <h2 className="mb-6 font-semibold text-3xl">World Generation</h2>
              <p className="mb-8 text-muted-foreground">
                At the beginning of each campaign, you go through the generation
                of key elements that define your adventure.
              </p>

              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Genre</CardTitle>
                    <CardDescription>
                      Choose the type of world you want to explore
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
                      <li>
                        <strong className="font-title text-foreground">
                          Fantasy:
                        </strong>{" "}
                        Classical fantasy with magic, elves, dark evils, and
                        pseudo-medieval settings
                      </li>
                      <li>
                        <strong className="font-title text-foreground">
                          Sci-fi:
                        </strong>{" "}
                        Cyberpunk dystopia with corporations, trans-humanism,
                        AI, and rapid technological advancement
                      </li>
                      <li>
                        <strong className="font-title text-foreground">
                          Horror:
                        </strong>{" "}
                        Psychological pressure meets cosmic darkness, where
                        unknown forces manifest in everyday life
                      </li>
                      <li>
                        <strong className="font-title text-foreground">
                          Slice-of-life:
                        </strong>{" "}
                        Everyday stories of normal people seeking balance and
                        harmony in their communities
                      </li>
                    </ul>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Universe</CardTitle>
                    <CardDescription>
                      The world in which your campaign takes place
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="mb-4 text-muted-foreground">
                      Choose from pre-made universes or create your own with
                      custom details. The system fills in the blanks to generate
                      a rich, well-described universe featuring:
                    </p>
                    <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
                      <li>
                        <strong className="font-title text-foreground">
                          Playable locations:
                        </strong>{" "}
                        Mini-dungeons and sub-sections based on available
                        locations
                      </li>
                      <li>
                        <strong className="font-title text-foreground">
                          World factions:
                        </strong>{" "}
                        Core groups with different demographics, cultures,
                        values, and goals
                      </li>
                      <li>
                        <strong className="font-title text-foreground">
                          History:
                        </strong>{" "}
                        A narrative explaining how the universe reached its
                        current state, including power structures, hierarchies,
                        and key events
                      </li>
                    </ul>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Campaign</CardTitle>
                    <CardDescription>
                      The overarching story and its key elements
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
                      <li>
                        <strong className="font-title text-foreground">
                          Main conflict:
                        </strong>{" "}
                        The central event that drives the campaign, dynamically
                        changing based on your decisions
                      </li>
                      <li>
                        <strong className="font-title text-foreground">
                          Factions involved:
                        </strong>{" "}
                        Main groups shaping the political and geographical
                        landscape
                      </li>
                      <li>
                        <strong className="font-title text-foreground">
                          Main allies:
                        </strong>{" "}
                        Companions who join your party, each with unique
                        backgrounds and motivations
                      </li>
                      <li>
                        <strong className="font-title text-foreground">
                          Main enemies:
                        </strong>{" "}
                        Powerful characters with their own agendas, guaranteed
                        to oppose your goals
                      </li>
                      <li>
                        <strong className="font-title text-foreground">
                          Ultimate boss:
                        </strong>{" "}
                        A powerful enemy that requires strategy, alliances, and
                        careful planning to overcome
                      </li>
                      <li>
                        <strong className="font-title text-foreground">
                          Random events:
                        </strong>{" "}
                        Uncontrolled events that reshape the universe, changing
                        based on player decisions
                      </li>
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </section>

            {/* Character System */}
            <section className="mb-16">
              <h2 className="mb-6 font-semibold text-3xl">
                Character Creation
              </h2>
              <p className="mb-8 text-muted-foreground">
                Create your character using traditional DnD-style mechanics.
                Roll dice and assign skill points to different abilities. You
                can provide as much detail as you want for your character's
                backstory and physical description—the system will fill in the
                gaps.
              </p>

              <div className="grid gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Character Properties</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-muted-foreground">
                      <li>
                        <strong className="font-title text-foreground">
                          Name:
                        </strong>{" "}
                        How other characters refer to you
                      </li>
                      <li>
                        <strong className="font-title text-foreground">
                          Origin:
                        </strong>{" "}
                        Ethnic origin and region of birth or early childhood
                      </li>
                      <li>
                        <strong className="font-title text-foreground">
                          Back Story:
                        </strong>{" "}
                        The basic story of how your character became who they
                        are today
                      </li>
                      <li>
                        <strong className="font-title text-foreground">
                          Profession:
                        </strong>{" "}
                        Unique abilities based on work experience
                      </li>
                      <li>
                        <strong className="font-title text-foreground">
                          Physicality:
                        </strong>{" "}
                        Body description including height, build, distinctive
                        features, and appearance
                      </li>
                    </ul>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Skills</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-muted-foreground">
                      <li>
                        <strong className="font-title text-foreground">
                          Strength:
                        </strong>{" "}
                        Physical strength for navigating the world
                      </li>
                      <li>
                        <strong className="font-title text-foreground">
                          Intelligence:
                        </strong>{" "}
                        Analytical and reasoning abilities for finding
                        alternative solutions
                      </li>
                      <li>
                        <strong className="font-title text-foreground">
                          Agility:
                        </strong>{" "}
                        Fine movements and speed for physical interactions
                      </li>
                      <li>
                        <strong className="font-title text-foreground">
                          Scholarship:
                        </strong>{" "}
                        Education level that provides context about the universe
                        and opens new dialogues
                      </li>
                      <li>
                        <strong className="font-title text-foreground">
                          Intuition:
                        </strong>{" "}
                        Extra-sensorial ability that manifests differently based
                        on universe type (magic, technology, special senses,
                        charisma)
                      </li>
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </section>

            {/* Game Interface */}
            <section className="mb-16">
              <h2 className="mb-6 font-semibold text-3xl">Game Interface</h2>
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Text-Based Narration</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">
                      A narration panel describes the unfolding story step by
                      step in plain text. Using clear descriptions and poetic
                      narration when appropriate, you'll read about situations
                      and type out your character's desired actions.
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Chat Input</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">
                      A chat input field allows you to take actions that trigger
                      events. You can also ask for more information about the
                      context, clarify previous events, or zoom in and out of
                      the current environment.
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Visual Environment Panel</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">
                      A pseudo-static image renders the current situation,
                      re-rendered every time you take an action that modifies
                      the environment. The panel can zoom in to render character
                      portraits during conversations. Future versions will
                      include interactive overlays for clicking on items and
                      performing context-specific actions.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </section>

            {/* Dice Mechanics */}
            <section>
              <h2 className="mb-6 font-semibold text-3xl">
                Dice-Based Actions
              </h2>
              <Card>
                <CardContent className="pt-6">
                  <p className="text-muted-foreground">
                    For each action you take, you must roll a dice. The size of
                    the dice is correlated to your skill level—higher skills
                    mean larger dice, increasing your chances of success. This
                    mechanic combines the strategic character building of DnD
                    with the reactive storytelling of text-based adventures.
                  </p>
                </CardContent>
              </Card>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
