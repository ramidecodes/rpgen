"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useEffect, useRef } from "react";
import { animate } from "animejs";
import { cn } from "@/lib/utils";

type ToolResultCardProps = {
  title: string;
  icon?: string;
  message: string;
  details?: React.ReactNode;
  variant?: "default" | "success" | "warning" | "danger";
  className?: string;
};

export function ToolResultCard({
  title,
  icon,
  message,
  details,
  variant = "default",
  className,
}: ToolResultCardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    // Entrance animation
    const entranceAnim = animate(containerRef.current, {
      opacity: [0, 1],
      scale: [0.95, 1],
      translateY: [-10, 0],
      duration: 500,
      easing: "easeOutElastic(1, 0.6)",
    });

    // Glow animation if glow element exists
    if (glowRef.current) {
      const glowAnim = animate(
        glowRef.current,
        {
          opacity: [0.2, 0.4, 0.2],
          scale: [1, 1.02, 1],
          duration: 2000,
          easing: "easeInOutSine",
        },
        {
          loop: true,
        }
      );

      return () => {
        entranceAnim.pause();
        glowAnim.pause();
      };
    }

    return () => {
      entranceAnim.pause();
    };
  }, []);

  const variantStyles = {
    default: "border-primary/30 bg-primary/5",
    success: "border-green-500/30 bg-green-500/5",
    warning: "border-yellow-500/30 bg-yellow-500/5",
    danger: "border-red-500/30 bg-red-500/5",
  };

  const variantGlowStyles = {
    default: "bg-primary/10",
    success: "bg-green-500/10",
    warning: "bg-yellow-500/10",
    danger: "bg-red-500/10",
  };

  const variantTextStyles = {
    default: "text-primary",
    success: "text-green-600 dark:text-green-400",
    warning: "text-yellow-600 dark:text-yellow-400",
    danger: "text-red-600 dark:text-red-400",
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {/* Background Glow Effect */}
      <div
        ref={glowRef}
        className={cn(
          "absolute inset-0 blur-xl rounded-lg pointer-events-none",
          variantGlowStyles[variant]
        )}
      />
      <Card className={cn("relative", variantStyles[variant])}>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            {icon && <span className="text-lg">{icon}</span>}
            <Badge
              variant="outline"
              className={cn(
                "text-sm font-semibold",
                variantTextStyles[variant]
              )}
            >
              {title}
            </Badge>
          </div>

          <div className="text-sm text-muted-foreground">{message}</div>

          {details && <div className="mt-2">{details}</div>}
        </CardContent>
      </Card>
    </div>
  );
}
