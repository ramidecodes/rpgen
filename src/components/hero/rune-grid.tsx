"use client";

import { animate, stagger } from "animejs";
import { useEffect, useRef, useMemo } from "react";
import { cn } from "@/lib/utils";

const RUNES = "ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃᛈᛇᛉᛊᛏᛒᛖᛗᛚᛜᛞᛟ";

type FloatingRune = {
  id: number;
  char: string;
  x: number;
  y: number;
  size: number;
  delay: number;
  duration: number;
  driftX: number;
  driftY: number;
  rotation: number;
};

type RuneGridProps = {
  className?: string;
  count?: number;
};

export function RuneGrid({ className, count = 24 }: RuneGridProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Generate deterministic floating runes with varied positions
  const runes = useMemo<FloatingRune[]>(() => {
    return Array.from({ length: count }).map((_, i) => {
      // Use modular arithmetic for pseudo-random but deterministic values
      const seed1 = (i * 17 + 5) % 100;
      const seed2 = (i * 23 + 11) % 100;
      const seed3 = (i * 31 + 7) % 100;

      return {
        id: i,
        char: RUNES[i % RUNES.length],
        // Distribute across the viewport with some clustering avoidance
        x: (seed1 / 100) * 90 + 5, // 5% to 95%
        y: (seed2 / 100) * 85 + 5, // 5% to 90%
        size: 0.8 + (seed3 / 100) * 1.2, // 0.8rem to 2rem
        delay: (i * 300) % 5000,
        duration: 8000 + (seed1 / 100) * 6000, // 8s to 14s
        driftX: (seed2 / 100 - 0.5) * 30, // -15 to 15
        driftY: -15 - (seed3 / 100) * 25, // -15 to -40 (always float upward)
        rotation: (seed1 / 100 - 0.5) * 20, // -10 to 10 degrees
      };
    });
  }, [count]);

  useEffect(() => {
    if (!containerRef.current) return;

    const runeElements =
      containerRef.current.querySelectorAll(".floating-rune");

    // Floating drift animation for each rune
    runeElements.forEach((rune, i) => {
      const data = runes[i];

      // Main floating movement
      animate(rune, {
        translateY: [0, data.driftY, 0],
        translateX: [0, data.driftX, 0],
        rotate: [0, data.rotation, 0],
        duration: data.duration,
        delay: data.delay,
        loop: true,
        easing: "easeInOutSine",
      });
    });

    // Pulsing glow animation
    animate(runeElements, {
      opacity: [
        { value: 0.2, duration: 0 },
        { value: 0.6, duration: 2000 },
        { value: 0.3, duration: 2000 },
        { value: 0.7, duration: 2000 },
        { value: 0.2, duration: 2000 },
      ],
      delay: stagger(200, { from: "center" }),
      loop: true,
      easing: "easeInOutQuad",
    });

    // Subtle scale breathing
    animate(containerRef.current.querySelectorAll(".rune-glow"), {
      scale: [1, 1.2, 1],
      opacity: [0.3, 0.6, 0.3],
      duration: 4000,
      delay: stagger(150),
      loop: true,
      easing: "easeInOutSine",
    });
  }, [runes]);

  return (
    <div
      ref={containerRef}
      className={cn(
        "pointer-events-none absolute inset-0 z-5 overflow-hidden",
        className
      )}
      aria-hidden="true"
    >
      {runes.map((rune) => (
        <div
          key={rune.id}
          className="floating-rune absolute"
          style={{
            left: `${rune.x}%`,
            top: `${rune.y}%`,
            opacity: 0.2,
          }}
        >
          {/* Glow backdrop */}
          <div
            className="rune-glow absolute -inset-4 rounded-full bg-glow/20 blur-md"
            style={{
              width: `${rune.size * 2}rem`,
              height: `${rune.size * 2}rem`,
              transform: "translate(-25%, -25%)",
            }}
          />
          {/* Rune character */}
          <span
            className="relative block text-glow"
            style={{
              fontSize: `${rune.size}rem`,
              textShadow: `
                0 0 10px hsl(var(--glow) / 0.8),
                0 0 20px hsl(var(--glow) / 0.5),
                0 0 30px hsl(var(--glow) / 0.3)
              `,
            }}
          >
            {rune.char}
          </span>
        </div>
      ))}

      {/* Gradient Overlay to fade edges */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_70%_at_center,transparent_20%,hsl(var(--background)/0.5)_60%,hsl(var(--background))_100%)]" />
    </div>
  );
}
