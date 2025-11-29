"use client";

import { cn } from "@/lib/utils";

type ArchPortalProps = {
  className?: string;
};

export function ArchPortal({ className }: ArchPortalProps) {
  return (
    <div className={cn("pointer-events-none relative", className)}>
      <svg
        viewBox="0 0 400 500"
        className="h-full w-full"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          {/* Glow filter for the arch */}
          <filter id="archGlow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="4" result="blur1" />
            <feGaussianBlur stdDeviation="8" result="blur2" />
            <feMerge>
              <feMergeNode in="blur2" />
              <feMergeNode in="blur1" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Particle glow filter */}
          <filter
            id="particleGlow"
            x="-200%"
            y="-200%"
            width="500%"
            height="500%"
          >
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Outer glow layer */}
        <path
          d="M 50 480 
             L 50 200 
             Q 50 100 200 50 
             Q 350 100 350 200 
             L 350 480"
          fill="none"
          className="stroke-glow"
          strokeWidth="12"
          strokeLinecap="round"
          opacity="0.15"
          filter="url(#archGlow)"
        />

        {/* Outer arch frame */}
        <path
          d="M 50 480 
             L 50 200 
             Q 50 100 200 50 
             Q 350 100 350 200 
             L 350 480"
          fill="none"
          className="stroke-glow"
          strokeWidth="4"
          strokeLinecap="round"
          opacity="0.9"
          filter="url(#archGlow)"
        />

        {/* Inner arch frame */}
        <path
          d="M 70 480 
             L 70 210 
             Q 70 120 200 75 
             Q 330 120 330 210 
             L 330 480"
          fill="none"
          className="stroke-glow"
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.5"
        />

        {/* Bottom connectors */}
        <line
          x1="50"
          y1="480"
          x2="70"
          y2="480"
          className="stroke-glow"
          strokeWidth="3"
          opacity="0.7"
        />
        <line
          x1="330"
          y1="480"
          x2="350"
          y2="480"
          className="stroke-glow"
          strokeWidth="3"
          opacity="0.7"
        />

        {/* Floating particles along the arch */}
        <g filter="url(#particleGlow)">
          {/* Left side particles */}
          <circle cx="50" cy="400" r="3" className="fill-glow" opacity="0.8">
            <animate
              attributeName="opacity"
              values="0.4;0.9;0.4"
              dur="3s"
              repeatCount="indefinite"
            />
          </circle>
          <circle cx="55" cy="300" r="2" className="fill-glow" opacity="0.6">
            <animate
              attributeName="opacity"
              values="0.3;0.7;0.3"
              dur="4s"
              repeatCount="indefinite"
              begin="0.5s"
            />
          </circle>
          <circle cx="60" cy="200" r="2.5" className="fill-glow" opacity="0.7">
            <animate
              attributeName="opacity"
              values="0.5;0.9;0.5"
              dur="3.5s"
              repeatCount="indefinite"
              begin="1s"
            />
          </circle>
          <circle cx="100" cy="120" r="2" className="fill-glow" opacity="0.5">
            <animate
              attributeName="opacity"
              values="0.3;0.8;0.3"
              dur="4.5s"
              repeatCount="indefinite"
              begin="0.3s"
            />
          </circle>

          {/* Top particles */}
          <circle cx="150" cy="70" r="2.5" className="fill-glow" opacity="0.7">
            <animate
              attributeName="opacity"
              values="0.4;0.9;0.4"
              dur="3s"
              repeatCount="indefinite"
              begin="0.7s"
            />
          </circle>
          <circle cx="200" cy="55" r="3" className="fill-glow" opacity="0.9">
            <animate
              attributeName="opacity"
              values="0.6;1;0.6"
              dur="2.5s"
              repeatCount="indefinite"
            />
          </circle>
          <circle cx="250" cy="70" r="2.5" className="fill-glow" opacity="0.7">
            <animate
              attributeName="opacity"
              values="0.4;0.9;0.4"
              dur="3s"
              repeatCount="indefinite"
              begin="1.2s"
            />
          </circle>

          {/* Right side particles */}
          <circle cx="300" cy="120" r="2" className="fill-glow" opacity="0.5">
            <animate
              attributeName="opacity"
              values="0.3;0.8;0.3"
              dur="4.5s"
              repeatCount="indefinite"
              begin="0.8s"
            />
          </circle>
          <circle cx="340" cy="200" r="2.5" className="fill-glow" opacity="0.7">
            <animate
              attributeName="opacity"
              values="0.5;0.9;0.5"
              dur="3.5s"
              repeatCount="indefinite"
              begin="0.2s"
            />
          </circle>
          <circle cx="345" cy="300" r="2" className="fill-glow" opacity="0.6">
            <animate
              attributeName="opacity"
              values="0.3;0.7;0.3"
              dur="4s"
              repeatCount="indefinite"
              begin="1.5s"
            />
          </circle>
          <circle cx="350" cy="400" r="3" className="fill-glow" opacity="0.8">
            <animate
              attributeName="opacity"
              values="0.4;0.9;0.4"
              dur="3s"
              repeatCount="indefinite"
              begin="0.4s"
            />
          </circle>
        </g>
      </svg>
    </div>
  );
}
