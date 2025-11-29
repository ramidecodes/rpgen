"use client";

import { animate, stagger } from "animejs";
import { useEffect, useRef, useMemo } from "react";
import { cn } from "@/lib/utils";

const RUNES = "ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃᛈᛇᛉᛊᛏᛒᛖᛗᛚᛜᛞᛟ";
const TECH_CHARS = "01<>/{}[]()=+-*&|~^%#@!";
const CHARS = RUNES + TECH_CHARS;

type MatrixRainProps = {
  className?: string;
  columns?: number;
  speed?: number;
};

type ColumnData = {
  id: number;
  chars: string[];
  x: number;
  delay: number;
  duration: number;
  opacity: number;
};

export function MatrixRain({
  className,
  columns = 20,
  speed = 1,
}: MatrixRainProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Generate deterministic column data
  const columnData = useMemo<ColumnData[]>(() => {
    return Array.from({ length: columns }).map((_, i) => {
      const charsPerColumn = 8 + (i % 6);
      const chars = Array.from(
        { length: charsPerColumn },
        (_, j) => CHARS[(i * 7 + j * 13) % CHARS.length]
      );
      return {
        id: i,
        chars,
        x: (i / columns) * 100,
        delay: (i * 200 + (i % 3) * 500) / speed,
        duration: (6000 + (i % 5) * 1500) / speed,
        opacity: 0.15 + (i % 4) * 0.05,
      };
    });
  }, [columns, speed]);

  useEffect(() => {
    if (!containerRef.current) return;

    const columnElements =
      containerRef.current.querySelectorAll(".matrix-column");

    // Animate each column falling
    columnElements.forEach((col, i) => {
      const data = columnData[i];

      animate(col, {
        translateY: ["-100%", "200%"],
        duration: data.duration,
        delay: data.delay,
        loop: true,
        easing: "linear",
      });
    });

    // Animate individual characters glowing
    const chars = containerRef.current.querySelectorAll(".matrix-char");
    animate(chars, {
      opacity: [
        { value: 0.3, duration: 500 },
        { value: 0.8, duration: 500 },
        { value: 0.3, duration: 500 },
      ],
      delay: stagger(50, { from: "random" }),
      loop: true,
      easing: "easeInOutSine",
    });
  }, [columnData]);

  return (
    <div
      ref={containerRef}
      className={cn(
        "pointer-events-none absolute inset-0 z-0 overflow-hidden",
        className
      )}
      aria-hidden="true"
    >
      {/* Matrix rain columns */}
      <div className="relative h-full w-full">
        {columnData.map((col) => (
          <div
            key={col.id}
            className="matrix-column absolute top-0 flex flex-col gap-4"
            style={{
              left: `${col.x}%`,
              opacity: col.opacity,
            }}
          >
            {col.chars.map((char, charIdx) => (
              <span
                key={`${col.id}-char-${char}-${charIdx}`}
                className={cn(
                  "matrix-char text-glow text-sm md:text-base",
                  charIdx === 0 && "text-glow brightness-150",
                  charIdx === col.chars.length - 1 && "text-arcane"
                )}
                style={{
                  textShadow:
                    charIdx === 0
                      ? "0 0 10px hsl(var(--glow)), 0 0 20px hsl(var(--glow))"
                      : "0 0 5px hsl(var(--glow) / 0.5)",
                }}
              >
                {char}
              </span>
            ))}
          </div>
        ))}
      </div>

      {/* Radial fade mask - transparent center, fades to background at edges */}
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(ellipse 70% 60% at 50% 50%, transparent 0%, transparent 30%, hsl(var(--background) / 0.7) 60%, hsl(var(--background)) 100%)`,
        }}
      />

      {/* Top fade */}
      <div
        className="absolute inset-x-0 top-0 h-32"
        style={{
          background: `linear-gradient(to bottom, hsl(var(--background)), transparent)`,
        }}
      />

      {/* Bottom fade */}
      <div
        className="absolute inset-x-0 bottom-0 h-32"
        style={{
          background: `linear-gradient(to top, hsl(var(--background)), transparent)`,
        }}
      />

      {/* Side fades */}
      <div
        className="absolute inset-y-0 left-0 w-24"
        style={{
          background: `linear-gradient(to right, hsl(var(--background)), transparent)`,
        }}
      />
      <div
        className="absolute inset-y-0 right-0 w-24"
        style={{
          background: `linear-gradient(to left, hsl(var(--background)), transparent)`,
        }}
      />
    </div>
  );
}
