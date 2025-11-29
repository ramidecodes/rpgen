"use client";

import { cn } from "@/lib/utils";

type ArchPortalProps = {
  className?: string;
};

export function ArchPortal({ className }: ArchPortalProps) {
  // Circuit node positions along the arch
  const leftNodes = [
    { x: 50, y: 450 },
    { x: 50, y: 380 },
    { x: 50, y: 300 },
    { x: 52, y: 220 },
    { x: 60, y: 160 },
    { x: 90, y: 110 },
    { x: 140, y: 75 },
  ];

  const rightNodes = [
    { x: 350, y: 450 },
    { x: 350, y: 380 },
    { x: 350, y: 300 },
    { x: 348, y: 220 },
    { x: 340, y: 160 },
    { x: 310, y: 110 },
    { x: 260, y: 75 },
  ];

  const topNodes = [{ x: 200, y: 50 }];

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

          {/* Circuit pulse filter */}
          <filter
            id="circuitPulse"
            x="-50%"
            y="-50%"
            width="200%"
            height="200%"
          >
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Gradient for energy flow */}
          <linearGradient id="energyFlow" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop
              offset="0%"
              stopColor="hsl(var(--arcane))"
              stopOpacity="0.3"
            />
            <stop offset="50%" stopColor="hsl(var(--glow))" stopOpacity="1" />
            <stop
              offset="100%"
              stopColor="hsl(var(--arcane))"
              stopOpacity="0.3"
            />
          </linearGradient>

          {/* Horizontal energy gradient */}
          <linearGradient id="energyFlowH" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="hsl(var(--glow))" stopOpacity="0.5" />
            <stop offset="50%" stopColor="hsl(var(--glow))" stopOpacity="1" />
            <stop
              offset="100%"
              stopColor="hsl(var(--glow))"
              stopOpacity="0.5"
            />
          </linearGradient>
        </defs>

        {/* Background energy field */}
        <ellipse
          cx="200"
          cy="250"
          rx="120"
          ry="180"
          fill="none"
          className="stroke-glow/5"
          strokeWidth="40"
          filter="url(#archGlow)"
        />

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

        {/* Circuit pattern - left side dashed lines */}
        <g className="circuit-left" filter="url(#circuitPulse)">
          <path
            d="M 35 480 L 35 200 Q 35 90 200 35"
            fill="none"
            className="stroke-arcane"
            strokeWidth="1"
            strokeDasharray="8 12"
            opacity="0.4"
          >
            <animate
              attributeName="stroke-dashoffset"
              values="0;-40"
              dur="2s"
              repeatCount="indefinite"
            />
          </path>
          {/* Branch circuits */}
          <path
            d="M 35 400 L 20 400 L 20 350 M 35 300 L 15 300"
            fill="none"
            className="stroke-arcane"
            strokeWidth="0.5"
            strokeDasharray="4 6"
            opacity="0.3"
          >
            <animate
              attributeName="stroke-dashoffset"
              values="0;-20"
              dur="3s"
              repeatCount="indefinite"
            />
          </path>
        </g>

        {/* Circuit pattern - right side dashed lines */}
        <g className="circuit-right" filter="url(#circuitPulse)">
          <path
            d="M 365 480 L 365 200 Q 365 90 200 35"
            fill="none"
            className="stroke-arcane"
            strokeWidth="1"
            strokeDasharray="8 12"
            opacity="0.4"
          >
            <animate
              attributeName="stroke-dashoffset"
              values="0;-40"
              dur="2s"
              repeatCount="indefinite"
              begin="0.5s"
            />
          </path>
          {/* Branch circuits */}
          <path
            d="M 365 400 L 380 400 L 380 350 M 365 300 L 385 300"
            fill="none"
            className="stroke-arcane"
            strokeWidth="0.5"
            strokeDasharray="4 6"
            opacity="0.3"
          >
            <animate
              attributeName="stroke-dashoffset"
              values="0;-20"
              dur="3s"
              repeatCount="indefinite"
              begin="0.5s"
            />
          </path>
        </g>

        {/* Energy flow lines - animated */}
        <g opacity="0.6">
          {/* Left energy stream */}
          <line
            x1="50"
            y1="480"
            x2="50"
            y2="200"
            stroke="url(#energyFlow)"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <animate
              attributeName="stroke-dasharray"
              values="0 500;100 400;0 500"
              dur="4s"
              repeatCount="indefinite"
            />
            <animate
              attributeName="stroke-dashoffset"
              values="0;-500"
              dur="4s"
              repeatCount="indefinite"
            />
          </line>
          {/* Right energy stream */}
          <line
            x1="350"
            y1="480"
            x2="350"
            y2="200"
            stroke="url(#energyFlow)"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <animate
              attributeName="stroke-dasharray"
              values="0 500;100 400;0 500"
              dur="4s"
              repeatCount="indefinite"
              begin="1s"
            />
            <animate
              attributeName="stroke-dashoffset"
              values="0;-500"
              dur="4s"
              repeatCount="indefinite"
              begin="1s"
            />
          </line>
        </g>

        {/* Circuit nodes - left side */}
        <g filter="url(#particleGlow)">
          {leftNodes.map((node, idx) => (
            <g key={`left-${node.x}-${node.y}`}>
              {/* Outer ring */}
              <circle
                cx={node.x}
                cy={node.y}
                r="5"
                fill="none"
                className="stroke-glow"
                strokeWidth="1"
                opacity="0.4"
              >
                <animate
                  attributeName="r"
                  values="4;6;4"
                  dur={`${2 + idx * 0.3}s`}
                  repeatCount="indefinite"
                />
                <animate
                  attributeName="opacity"
                  values="0.2;0.5;0.2"
                  dur={`${2 + idx * 0.3}s`}
                  repeatCount="indefinite"
                />
              </circle>
              {/* Inner node */}
              <circle
                cx={node.x}
                cy={node.y}
                r="2"
                className="fill-glow"
                opacity="0.8"
              >
                <animate
                  attributeName="opacity"
                  values="0.5;1;0.5"
                  dur={`${1.5 + idx * 0.2}s`}
                  repeatCount="indefinite"
                  begin={`${idx * 0.1}s`}
                />
              </circle>
            </g>
          ))}
        </g>

        {/* Circuit nodes - right side */}
        <g filter="url(#particleGlow)">
          {rightNodes.map((node, idx) => (
            <g key={`right-${node.x}-${node.y}`}>
              <circle
                cx={node.x}
                cy={node.y}
                r="5"
                fill="none"
                className="stroke-glow"
                strokeWidth="1"
                opacity="0.4"
              >
                <animate
                  attributeName="r"
                  values="4;6;4"
                  dur={`${2 + idx * 0.3}s`}
                  repeatCount="indefinite"
                  begin="0.5s"
                />
                <animate
                  attributeName="opacity"
                  values="0.2;0.5;0.2"
                  dur={`${2 + idx * 0.3}s`}
                  repeatCount="indefinite"
                  begin="0.5s"
                />
              </circle>
              <circle
                cx={node.x}
                cy={node.y}
                r="2"
                className="fill-glow"
                opacity="0.8"
              >
                <animate
                  attributeName="opacity"
                  values="0.5;1;0.5"
                  dur={`${1.5 + idx * 0.2}s`}
                  repeatCount="indefinite"
                  begin={`${0.5 + idx * 0.1}s`}
                />
              </circle>
            </g>
          ))}
        </g>

        {/* Top crown node */}
        <g filter="url(#particleGlow)">
          {topNodes.map((node) => (
            <g key={`top-${node.x}-${node.y}`}>
              <circle
                cx={node.x}
                cy={node.y}
                r="8"
                fill="none"
                className="stroke-glow"
                strokeWidth="1.5"
                opacity="0.5"
              >
                <animate
                  attributeName="r"
                  values="6;10;6"
                  dur="2.5s"
                  repeatCount="indefinite"
                />
                <animate
                  attributeName="opacity"
                  values="0.3;0.7;0.3"
                  dur="2.5s"
                  repeatCount="indefinite"
                />
              </circle>
              <circle cx={node.x} cy={node.y} r="3" className="fill-glow">
                <animate
                  attributeName="opacity"
                  values="0.7;1;0.7"
                  dur="1.5s"
                  repeatCount="indefinite"
                />
              </circle>
            </g>
          ))}
        </g>

        {/* Bottom connectors with circuit details */}
        <g>
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
          {/* Additional circuit detail at base */}
          <rect
            x="45"
            y="475"
            width="10"
            height="10"
            fill="none"
            className="stroke-arcane"
            strokeWidth="0.5"
            opacity="0.4"
          />
          <rect
            x="345"
            y="475"
            width="10"
            height="10"
            fill="none"
            className="stroke-arcane"
            strokeWidth="0.5"
            opacity="0.4"
          />
        </g>

        {/* Magical particles - floating orbs */}
        <g filter="url(#particleGlow)">
          {/* Ascending particles - left */}
          <circle cx="60" cy="400" r="2" className="fill-arcane" opacity="0.6">
            <animate
              attributeName="cy"
              values="450;100"
              dur="8s"
              repeatCount="indefinite"
            />
            <animate
              attributeName="cx"
              values="55;70;55"
              dur="4s"
              repeatCount="indefinite"
            />
            <animate
              attributeName="opacity"
              values="0;0.8;0.8;0"
              dur="8s"
              repeatCount="indefinite"
            />
          </circle>
          <circle cx="55" cy="350" r="1.5" className="fill-glow" opacity="0.5">
            <animate
              attributeName="cy"
              values="480;80"
              dur="10s"
              repeatCount="indefinite"
              begin="2s"
            />
            <animate
              attributeName="cx"
              values="50;65;50"
              dur="5s"
              repeatCount="indefinite"
            />
            <animate
              attributeName="opacity"
              values="0;0.6;0.6;0"
              dur="10s"
              repeatCount="indefinite"
              begin="2s"
            />
          </circle>

          {/* Ascending particles - right */}
          <circle cx="340" cy="400" r="2" className="fill-arcane" opacity="0.6">
            <animate
              attributeName="cy"
              values="450;100"
              dur="8s"
              repeatCount="indefinite"
              begin="1s"
            />
            <animate
              attributeName="cx"
              values="345;330;345"
              dur="4s"
              repeatCount="indefinite"
            />
            <animate
              attributeName="opacity"
              values="0;0.8;0.8;0"
              dur="8s"
              repeatCount="indefinite"
              begin="1s"
            />
          </circle>
          <circle cx="345" cy="350" r="1.5" className="fill-glow" opacity="0.5">
            <animate
              attributeName="cy"
              values="480;80"
              dur="10s"
              repeatCount="indefinite"
              begin="3s"
            />
            <animate
              attributeName="cx"
              values="350;335;350"
              dur="5s"
              repeatCount="indefinite"
            />
            <animate
              attributeName="opacity"
              values="0;0.6;0.6;0"
              dur="10s"
              repeatCount="indefinite"
              begin="3s"
            />
          </circle>

          {/* Orbiting particles around top */}
          <circle cx="200" cy="50" r="1.5" className="fill-glow">
            <animate
              attributeName="cx"
              values="180;220;180"
              dur="3s"
              repeatCount="indefinite"
            />
            <animate
              attributeName="cy"
              values="60;40;60"
              dur="3s"
              repeatCount="indefinite"
            />
            <animate
              attributeName="opacity"
              values="0.4;1;0.4"
              dur="3s"
              repeatCount="indefinite"
            />
          </circle>
          <circle cx="200" cy="50" r="1" className="fill-arcane">
            <animate
              attributeName="cx"
              values="220;180;220"
              dur="3s"
              repeatCount="indefinite"
            />
            <animate
              attributeName="cy"
              values="40;60;40"
              dur="3s"
              repeatCount="indefinite"
            />
            <animate
              attributeName="opacity"
              values="0.3;0.8;0.3"
              dur="3s"
              repeatCount="indefinite"
            />
          </circle>
        </g>

        {/* Static glow particles for ambiance */}
        <g filter="url(#particleGlow)">
          <circle cx="50" cy="400" r="3" className="fill-glow" opacity="0.8">
            <animate
              attributeName="opacity"
              values="0.4;0.9;0.4"
              dur="3s"
              repeatCount="indefinite"
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
          <circle cx="150" cy="70" r="2.5" className="fill-glow" opacity="0.7">
            <animate
              attributeName="opacity"
              values="0.4;0.9;0.4"
              dur="3s"
              repeatCount="indefinite"
              begin="0.7s"
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
          <circle cx="300" cy="120" r="2" className="fill-glow" opacity="0.5">
            <animate
              attributeName="opacity"
              values="0.3;0.8;0.3"
              dur="4.5s"
              repeatCount="indefinite"
              begin="0.8s"
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
