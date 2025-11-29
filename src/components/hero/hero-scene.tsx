"use client";

import { SignedIn, SignedOut } from "@clerk/nextjs";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArchPortal } from "./arch-portal";
import { D20Anime } from "./d20-anime";
import { MatrixRain } from "./matrix-rain";
import { RuneGrid } from "./rune-grid";

export function HeroScene() {
  return (
    <section className="relative min-h-screen overflow-hidden bg-background">
      {/* Layer 1: Matrix rain background (deepest) */}
      <MatrixRain className="z-0" columns={24} speed={0.8} />

      {/* Layer 2: Floating glowing runes */}
      <RuneGrid className="z-5" count={20} />

      {/* Layer 3: Central Visuals */}
      <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
        <div className="pointer-events-auto relative aspect-4/5 w-full max-w-lg md:max-w-xl lg:max-w-2xl">
          {/* AnimeJS D20 - proper icosahedron */}
          <div className="absolute inset-0 z-10 scale-[0.65] md:scale-[0.8]">
            <D20Anime />
          </div>

          {/* Arch portal frame with circuits and particles */}
          <ArchPortal className="absolute inset-0 z-20" />
        </div>
      </div>

      {/* Layer 4: Text content overlay */}
      <div className="relative z-30 flex min-h-screen flex-col items-center justify-between px-4 py-16 md:py-24">
        {/* Top text */}
        <div className="pointer-events-none text-center">
          <h1 className="glow-text mb-4 font-bold text-4xl tracking-wider md:text-5xl lg:text-6xl">
            Generative Deep Neural Dungeon
          </h1>
          <p className="mx-auto max-w-xl text-lg text-muted-foreground md:text-xl">
            An infinite universe, hand-crafted by an AI Game Master.
          </p>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* CTA Button */}
        <div className="pb-8 md:pb-16">
          <SignedOut>
            <Button
              asChild
              size="lg"
              className="glow-border group relative overflow-hidden border-2 border-glow bg-background/80 px-8 py-6 font-title text-foreground text-xl tracking-wider backdrop-blur-sm transition-all duration-300 hover:bg-glow/20 hover:text-glow-foreground"
            >
              <Link href="/sign-up" className="flex items-center gap-3">
                <span>ENTER THE DUNGEON</span>
                <DungeonIcon className="h-6 w-6 transition-transform duration-300 group-hover:rotate-12" />
              </Link>
            </Button>
          </SignedOut>
          <SignedIn>
            <Button
              asChild
              size="lg"
              className="glow-border group relative overflow-hidden border-2 border-glow bg-background/80 px-8 py-6 font-title text-foreground text-xl tracking-wider backdrop-blur-sm transition-all duration-300 hover:bg-glow/20 hover:text-glow-foreground"
            >
              <Link href="/profile" className="flex items-center gap-3">
                <span>ROLL YOUR ADVENTURE</span>
                <DungeonIcon className="h-6 w-6 transition-transform duration-300 group-hover:rotate-12" />
              </Link>
            </Button>
          </SignedIn>
        </div>
      </div>

      {/* Bottom gradient fade */}
      <div
        className="pointer-events-none absolute right-0 bottom-0 left-0 z-25 h-32"
        style={{
          background: `linear-gradient(to top, hsl(var(--background)), transparent)`,
        }}
      />

      {/* Top gradient fade for smooth transition */}
      <div
        className="pointer-events-none absolute top-0 right-0 left-0 z-25 h-24"
        style={{
          background: `linear-gradient(to bottom, hsl(var(--background) / 0.5), transparent)`,
        }}
      />
    </section>
  );
}

function DungeonIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M12 2L2 7.5V16.5L12 22L22 16.5V7.5L12 2Z"
        className="stroke-current"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 22V12"
        className="stroke-current"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M22 7.5L12 12L2 7.5"
        className="stroke-current"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M12 2V12"
        className="stroke-current"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
