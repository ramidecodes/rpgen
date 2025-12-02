"use client";

import { animate, stagger } from "animejs";
import { useEffect, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";

type D20AnimeProps = {
  className?: string;
};

type Point3D = { x: number; y: number; z: number };
type Point2D = { x: number; y: number };
type Face = {
  indices: [number, number, number];
  points: [
    Point2D & { z: number },
    Point2D & { z: number },
    Point2D & { z: number }
  ];
  center: Point2D & { z: number };
  isVisible: boolean;
  label: string;
  isHighlighted: boolean;
  id: number;
  rotationAngle: number;
};

// Constants
const PHI = (1 + Math.sqrt(5)) / 2;
const VIEWPORT = { width: 400, height: 430, centerX: 200, centerY: 215 };
const SCALE = 160;
const LOOP_DURATION = 20000; // 20 seconds in milliseconds

// Initial rotation to balance die on a vertex (vertex 2 pointing downward)
// Vertex 2: { x: -1, y: -PHI, z: 0 } normalized ≈ { x: -0.5257, y: -0.8507, z: 0 }
// To align this vertex with negative Y (pointing down), we need Z rotation
// Rotation order is Z → Y → X (see rotate3D function), so:
// - Z: calculated to orient vertex 2 downward (applied first, fixed)
// - Y: will be animated for spinning (vertical axis, applied second)
// - X: 0 (no X rotation needed, applied last)
// Calculated Z rotation: ~0.5536 radians (31.7 degrees)
const INITIAL_ROTATION = { x: 0, y: 0, z: 0.5536 };

// Full symbol set for all 20 faces - Mixed numbers and runes
const FACE_SYMBOLS: Array<{ label: string; isHighlighted?: boolean }> = [
  { label: "20", isHighlighted: true }, // Face 0
  { label: "ᚠ" }, // Face 1 (rune)
  { label: "2" }, // Face 2
  { label: "ᚢ" }, // Face 3 (rune)
  { label: "4" }, // Face 4
  { label: "ᚦ" }, // Face 5 (rune)
  { label: "6" }, // Face 6
  { label: "ᚨ" }, // Face 7 (rune)
  { label: "8" }, // Face 8
  { label: "ᚱ" }, // Face 9 (rune)
  { label: "10" }, // Face 10
  { label: "ᚲ" }, // Face 11 (rune)
  { label: "12" }, // Face 12
  { label: "ᚷ" }, // Face 13 (rune)
  { label: "14" }, // Face 14
  { label: "ᚹ" }, // Face 15 (rune)
  { label: "16" }, // Face 16
  { label: "ᚺ" }, // Face 17 (rune)
  { label: "18" }, // Face 18
  { label: "ᚾ" }, // Face 19 (rune)
];

// Extended rune set for variety
const RUNES = ["ᚠ", "ᚢ", "ᚦ", "ᚨ", "ᚱ", "ᚲ", "ᚷ", "ᚹ", "ᚺ", "ᚾ"];

// Icosahedron base geometry
const BASE_VERTICES: Point3D[] = [
  { x: -1, y: PHI, z: 0 },
  { x: 1, y: PHI, z: 0 },
  { x: -1, y: -PHI, z: 0 },
  { x: 1, y: -PHI, z: 0 },
  { x: 0, y: -1, z: PHI },
  { x: 0, y: 1, z: PHI },
  { x: 0, y: -1, z: -PHI },
  { x: 0, y: 1, z: -PHI },
  { x: PHI, y: 0, z: -1 },
  { x: PHI, y: 0, z: 1 },
  { x: -PHI, y: 0, z: -1 },
  { x: -PHI, y: 0, z: 1 },
].map((v) => {
  const len = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
  return { x: v.x / len, y: v.y / len, z: v.z / len };
});

const BASE_FACES: [number, number, number][] = [
  [0, 11, 5],
  [0, 5, 1],
  [0, 1, 7],
  [0, 7, 10],
  [0, 10, 11],
  [1, 5, 9],
  [5, 11, 4],
  [11, 10, 2],
  [10, 7, 6],
  [7, 1, 8],
  [3, 9, 4],
  [3, 4, 2],
  [3, 2, 6],
  [3, 6, 8],
  [3, 8, 9],
  [4, 9, 5],
  [2, 4, 11],
  [6, 2, 10],
  [8, 6, 7],
  [9, 8, 1],
];

// 3D rotation helpers
const rotateX = (p: Point3D, theta: number): Point3D => {
  const cos = Math.cos(theta);
  const sin = Math.sin(theta);
  return { x: p.x, y: p.y * cos - p.z * sin, z: p.y * sin + p.z * cos };
};

const rotateY = (p: Point3D, theta: number): Point3D => {
  const cos = Math.cos(theta);
  const sin = Math.sin(theta);
  return { x: p.x * cos + p.z * sin, y: p.y, z: -p.x * sin + p.z * cos };
};

const rotateZ = (p: Point3D, theta: number): Point3D => {
  const cos = Math.cos(theta);
  const sin = Math.sin(theta);
  return { x: p.x * cos - p.y * sin, y: p.x * sin + p.y * cos, z: p.z };
};

// Apply all rotations in order
// For vertex-balanced spinning: Z (orientation) → Y (spinning) → X (none)
// This ensures the vertex stays oriented downward while spinning on Y-axis
const rotate3D = (
  p: Point3D,
  rot: { x: number; y: number; z: number }
): Point3D => {
  // Apply Z rotation first to orient the vertex
  let result = rotateZ(p, rot.z);
  // Then Y rotation to spin around vertical axis
  result = rotateY(result, rot.y);
  // X rotation last (currently 0, but kept for consistency)
  result = rotateX(result, rot.x);
  return result;
};

// Project 3D to 2D
const project = (p: Point3D): Point2D & { z: number } => ({
  x: p.x * SCALE + VIEWPORT.centerX,
  y: p.y * SCALE + VIEWPORT.centerY,
  z: p.z,
});

// Calculate face center
const faceCenter = (
  points: [
    Point2D & { z: number },
    Point2D & { z: number },
    Point2D & { z: number }
  ]
): Point2D & { z: number } => ({
  x: (points[0].x + points[1].x + points[2].x) / 3,
  y: (points[0].y + points[1].y + points[2].y) / 3,
  z: (points[0].z + points[1].z + points[2].z) / 3,
});

// Check if face is visible (backface culling)
const isFaceVisible = (
  points: [
    Point2D & { z: number },
    Point2D & { z: number },
    Point2D & { z: number }
  ]
): boolean => {
  const [a, b, c] = points;
  const crossZ = (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
  return crossZ < 0; // SVG y-down, so negative crossZ means facing camera
};

// Generate path string for triangle
const trianglePath = (points: [Point2D, Point2D, Point2D]): string =>
  `M${points[0].x} ${points[0].y} L${points[1].x} ${points[1].y} L${points[2].x} ${points[2].y} Z`;

// Get face label
const getFaceLabel = (
  faceIndex: number
): { label: string; isHighlighted: boolean } => {
  const config = FACE_SYMBOLS[faceIndex];
  if (config) {
    return {
      label: config.label,
      isHighlighted: config.isHighlighted ?? false,
    };
  }
  return { label: RUNES[faceIndex % RUNES.length], isHighlighted: false };
};

// Calculate text rotation angle from projected 2D edge vectors
// This aligns text with the face plane in screen space
const calculateTextRotation = (
  points: [
    Point2D & { z: number },
    Point2D & { z: number },
    Point2D & { z: number }
  ]
): number => {
  // Use the first edge (vertex 0 to vertex 1) as the reference direction
  const dx = points[1].x - points[0].x;
  const dy = points[1].y - points[0].y;

  // Calculate angle in degrees
  let angle = Math.atan2(dy, dx) * (180 / Math.PI);

  // Adjust to keep text readable (flip if upside down)
  // Text should generally read left-to-right or slightly tilted
  if (angle > 90) {
    angle -= 180;
  } else if (angle < -90) {
    angle += 180;
  }

  return angle;
};

// Animation configs
const ANIMATIONS = {
  face: {
    opacity: [0, 1],
    delay: stagger(40),
    duration: 1200,
    easing: "easeOutQuad" as const,
  },
  label: {
    opacity: [0, 1],
    delay: stagger(30, { start: 600 }),
    duration: 600,
    easing: "easeOutQuad" as const,
  },
  float: {
    translateY: [-8, 8],
    rotate: [-2, 2],
    duration: 5000,
    direction: "alternate" as const,
    loop: true,
    easing: "easeInOutSine" as const,
  },
  pulse: {
    opacity: [0.3, 0.6],
    scale: [0.95, 1.05],
    duration: 3000,
    direction: "alternate" as const,
    loop: true,
    easing: "easeInOutSine" as const,
  },
};

export function D20Anime({ className }: D20AnimeProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const rotationRef = useRef<{ x: number; y: number; z: number }>({
    x: INITIAL_ROTATION.x,
    y: INITIAL_ROTATION.y,
    z: INITIAL_ROTATION.z,
  });
  const facesRef = useRef<SVGPathElement[]>([]);
  const labelsRef = useRef<SVGTextElement[]>([]);
  const verticesRef = useRef<SVGCircleElement[]>([]);
  const animationRef = useRef<ReturnType<typeof animate> | null>(null);
  const progressRef = useRef<number>(0);
  const rafIdRef = useRef<number | null>(null);
  const backgroundRingRef = useRef<SVGGElement | null>(null);

  // Recalculate geometry and update DOM
  const updateGeometry = useCallback(() => {
    if (!svgRef.current) return;

    // Calculate rotation: only Y-axis spins, X and Z remain fixed for vertex balance
    // Rotation order is Z → Y → X (see rotate3D function)
    // Z rotation orients vertex downward (fixed), Y rotation spins (animated), X is 0 (fixed)
    const TWO_PI = Math.PI * 2;
    rotationRef.current.x = INITIAL_ROTATION.x; // Fixed: 0 (no X rotation)
    rotationRef.current.y = INITIAL_ROTATION.y + progressRef.current * TWO_PI; // Animated: spins on vertical axis
    rotationRef.current.z = INITIAL_ROTATION.z; // Fixed: orients vertex 2 downward

    // Rotate and project vertices
    const projectedVertices = BASE_VERTICES.map((v) =>
      project(rotate3D(v, rotationRef.current))
    );

    // Build all faces with projected geometry
    const allFaces: Face[] = BASE_FACES.map((indices, i) => {
      const points: [
        Point2D & { z: number },
        Point2D & { z: number },
        Point2D & { z: number }
      ] = [
        projectedVertices[indices[0]],
        projectedVertices[indices[1]],
        projectedVertices[indices[2]],
      ];

      const center = faceCenter(points);
      const isVisible = isFaceVisible(points);
      const { label, isHighlighted } = getFaceLabel(i);
      // Calculate text rotation from projected 2D edge vectors
      const rotationAngle = calculateTextRotation(points);

      return {
        indices,
        points,
        center,
        isVisible,
        label,
        isHighlighted,
        id: i,
        rotationAngle,
      };
    });

    // Filter and sort visible faces by depth
    const visibleFaces = allFaces
      .filter((f) => f.isVisible)
      .sort((a, b) => a.center.z - b.center.z);

    // Visible vertices (part of visible faces)
    const visibleVertexIndices = new Set<number>();
    for (const face of visibleFaces) {
      for (const idx of face.indices) {
        visibleVertexIndices.add(idx);
      }
    }

    // Update face wireframe paths
    visibleFaces.forEach((face) => {
      const pathEl = facesRef.current[face.id];
      if (pathEl) {
        pathEl.setAttribute("d", trianglePath(face.points));
        pathEl.style.opacity = "1";
      }
    });

    // Hide non-visible faces
    allFaces.forEach((face) => {
      if (!face.isVisible) {
        const pathEl = facesRef.current[face.id];
        if (pathEl) {
          pathEl.style.opacity = "0";
        }
      }
    });

    // Update labels
    visibleFaces.forEach((face) => {
      const labelEl = labelsRef.current[face.id];
      if (labelEl && face.label) {
        labelEl.setAttribute("x", String(face.center.x));
        labelEl.setAttribute(
          "y",
          String(face.center.y + (/^\d+$/.test(face.label) ? 6 : 4))
        );
        labelEl.setAttribute(
          "transform",
          `rotate(${face.rotationAngle}, ${face.center.x}, ${face.center.y})`
        );
        labelEl.style.opacity = "1";
      }
    });

    // Hide non-visible labels
    allFaces.forEach((face) => {
      if (!face.isVisible) {
        const labelEl = labelsRef.current[face.id];
        if (labelEl) {
          labelEl.style.opacity = "0";
        }
      }
    });

    // Update vertices
    projectedVertices.forEach((v, i) => {
      const vertexEl = verticesRef.current[i];
      if (vertexEl) {
        if (visibleVertexIndices.has(i)) {
          vertexEl.setAttribute("cx", String(v.x));
          vertexEl.setAttribute("cy", String(v.y));
          vertexEl.style.opacity = "0.8";
        } else {
          vertexEl.style.opacity = "0";
        }
      }
    });
  }, []);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = svgRef.current;

    // Initialize DOM references
    facesRef.current = Array.from(
      svg.querySelectorAll<SVGPathElement>(".d20-face")
    );
    labelsRef.current = Array.from(
      svg.querySelectorAll<SVGTextElement>(".d20-label")
    );
    verticesRef.current = Array.from(
      svg.querySelectorAll<SVGCircleElement>(".d20-vertex")
    );
    backgroundRingRef.current =
      svg.querySelector<SVGGElement>(".d20-layer-back");

    // Initial geometry update
    updateGeometry();

    // Fade in background glow after initial render
    animate(svg.querySelectorAll(".d20-glow"), {
      opacity: [0, 1],
      duration: 1500,
      easing: "easeOutQuad",
    });

    // Intro animations
    animate(svg.querySelectorAll(".d20-face"), ANIMATIONS.face);
    animate(svg.querySelectorAll(".d20-label"), ANIMATIONS.label);

    // Seamless rotation animation using Anime.js progress-based approach
    // Use an object property that Anime.js can animate without creating DOM artifacts
    const progressTarget = { value: 0 };

    // Initialize progress to 0 to match initial rotation state
    progressRef.current = 0;
    updateGeometry();

    animationRef.current = animate(progressTarget, {
      value: [0, 1],
      duration: LOOP_DURATION,
      easing: "linear",
      loop: true,
    });

    // Use requestAnimationFrame to continuously read animation progress
    // This ensures smooth updates even during loop transitions
    const updateLoop = () => {
      if (animationRef.current) {
        // Get normalized progress (0-1) from animation instance
        // The progress property goes from 0-100, so we normalize it
        const rawProgress = animationRef.current.progress / 100;
        // Use modulo to wrap progress to [0, 1) for seamless looping
        // This ensures that when progress reaches 1.0, it wraps to 0.0 smoothly
        const normalizedProgress = ((rawProgress % 1) + 1) % 1;
        progressRef.current = normalizedProgress;
        updateGeometry();
      }
      rafIdRef.current = requestAnimationFrame(updateLoop);
    };
    rafIdRef.current = requestAnimationFrame(updateLoop);

    // Loop animations
    animate(svg, ANIMATIONS.float);
    animate(svg.querySelectorAll(".d20-glow"), ANIMATIONS.pulse);

    // Background ring rotations (counter-rotating for depth effect)
    // Set transform-origin to center for proper rotation
    const setTransformOrigin = (elements: NodeListOf<Element>) => {
      elements.forEach((el) => {
        if (el instanceof SVGGElement) {
          el.style.transformOrigin = "center center";
        }
      });
    };

    const outerRings = svg.querySelectorAll(".d20-bg-ring-outer");
    const middleRings = svg.querySelectorAll(".d20-bg-ring-middle");
    const innerRings = svg.querySelectorAll(".d20-bg-ring-inner");
    const runeRings = svg.querySelectorAll(".d20-bg-runes");

    setTransformOrigin(outerRings);
    setTransformOrigin(middleRings);
    setTransformOrigin(innerRings);
    setTransformOrigin(runeRings);

    animate(outerRings, {
      rotate: 360,
      duration: 25000,
      loop: true,
      easing: "linear",
    });

    animate(middleRings, {
      rotate: -360,
      duration: 20000,
      loop: true,
      easing: "linear",
    });

    animate(innerRings, {
      rotate: 360,
      duration: 30000,
      loop: true,
      easing: "linear",
    });

    animate(runeRings, {
      rotate: -360,
      duration: 35000,
      loop: true,
      easing: "linear",
    });

    // Parallax interaction with enhanced depth
    const handleMouseMove = (e: MouseEvent) => {
      if (!svg) return;
      const moveX = (e.clientX - window.innerWidth / 2) * 0.012;
      const moveY = (e.clientY - window.innerHeight / 2) * 0.012;

      // Background layers move slower for depth
      animate(svg.querySelectorAll(".d20-layer-back"), {
        translateX: moveX * 0.3,
        translateY: moveY * 0.3,
        duration: 400,
        easing: "easeOutQuad",
      });

      // Front layer moves faster
      animate(svg.querySelectorAll(".d20-layer-front"), {
        translateX: moveX,
        translateY: moveY,
        duration: 400,
        easing: "easeOutQuad",
      });
    };

    window.addEventListener("mousemove", handleMouseMove);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      if (animationRef.current) {
        animationRef.current.pause();
      }
    };
  }, [updateGeometry]);

  return (
    <div
      className={cn(
        "relative flex h-full w-full items-center justify-center",
        className
      )}
    >
      <svg
        ref={svgRef}
        viewBox={`0 0 ${VIEWPORT.width} ${VIEWPORT.height}`}
        className="h-full w-full max-w-[500px]"
        xmlns="http://www.w3.org/2000/svg"
      >
        <title>D20 Die</title>
        <defs>
          {/* Subtle background glow filter */}
          <filter id="d20Glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          {/* Enhanced neon glow for wireframe and vertices */}
          <filter id="neonGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
            <feGaussianBlur stdDeviation="2.5" result="blur2" />
            <feMerge>
              <feMergeNode in="blur2" />
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          {/* Subtle text glow */}
          <filter id="textGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="1" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          {/* Background ring glow - very subtle */}
          <filter id="bgRingGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="1" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <linearGradient id="edgeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(var(--glow))" stopOpacity="0.8" />
            <stop
              offset="100%"
              stopColor="hsl(var(--arcane))"
              stopOpacity="0.8"
            />
          </linearGradient>
          <linearGradient
            id="faceGradientLight"
            x1="0%"
            y1="0%"
            x2="100%"
            y2="100%"
          >
            <stop offset="0%" stopColor="hsl(var(--glow))" stopOpacity="0.15" />
            <stop
              offset="100%"
              stopColor="hsl(var(--glow))"
              stopOpacity="0.05"
            />
          </linearGradient>
          <linearGradient
            id="faceGradientDark"
            x1="0%"
            y1="0%"
            x2="100%"
            y2="100%"
          >
            <stop
              offset="0%"
              stopColor="hsl(var(--arcane))"
              stopOpacity="0.1"
            />
            <stop
              offset="100%"
              stopColor="hsl(var(--arcane))"
              stopOpacity="0.02"
            />
          </linearGradient>
        </defs>

        {/* Background glow ellipse - subtle animated glow */}
        <ellipse
          cx={VIEWPORT.centerX}
          cy={VIEWPORT.centerY}
          rx="160"
          ry="180"
          className="d20-glow fill-glow/10"
          filter="url(#d20Glow)"
          opacity="0"
        />

        {/* Layered technomancy background */}
        <g className="d20-layer-back" ref={backgroundRingRef}>
          <g transform={`translate(${VIEWPORT.centerX}, ${VIEWPORT.centerY})`}>
            {/* Outer rotating ring */}
            <g className="d20-bg-ring-outer" transform="translate(0, 0)">
              <circle
                cx="0"
                cy="0"
                r="140"
                fill="none"
                stroke="hsl(var(--glow))"
                strokeWidth="1.5"
                strokeDasharray="8 4"
                opacity="0.3"
                filter="url(#bgRingGlow)"
              />
              <circle
                cx="0"
                cy="0"
                r="140"
                fill="none"
                stroke="hsl(var(--arcane))"
                strokeWidth="0.5"
                strokeDasharray="2 6"
                opacity="0.2"
              />
            </g>

            {/* Middle rotating ring */}
            <g className="d20-bg-ring-middle" transform="translate(0, 0)">
              <circle
                cx="0"
                cy="0"
                r="110"
                fill="none"
                stroke="hsl(var(--circuit))"
                strokeWidth="1"
                strokeDasharray="6 3"
                opacity="0.25"
                filter="url(#bgRingGlow)"
              />
            </g>

            {/* Inner rotating ring */}
            <g className="d20-bg-ring-inner" transform="translate(0, 0)">
              <circle
                cx="0"
                cy="0"
                r="85"
                fill="none"
                stroke="hsl(var(--glow))"
                strokeWidth="0.8"
                strokeDasharray="4 2"
                opacity="0.2"
              />
            </g>

            {/* Rune circle ring */}
            <g className="d20-bg-runes" transform="translate(0, 0)">
              {RUNES.map((rune, i) => {
                const angle = (i / RUNES.length) * 360;
                const rad = (angle * Math.PI) / 180;
                const radius = 100;
                // Round to 4 decimal places to prevent hydration mismatch between server and client
                const x = Number.parseFloat(
                  (radius * Math.cos(rad)).toFixed(4)
                );
                const y = Number.parseFloat(
                  (radius * Math.sin(rad)).toFixed(4)
                );
                return (
                  <text
                    key={`rune-${rune}`}
                    x={x}
                    y={y}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="fill-glow/30"
                    style={{
                      fontSize: "16px",
                      fontFamily: "serif",
                    }}
                    filter="url(#textGlow)"
                  >
                    {rune}
                  </text>
                );
              })}
            </g>
          </g>
        </g>

        <g className="d20-layer-front" filter="url(#neonGlow)">
          {/* Wireframe faces as neon triangles */}
          <g>
            {BASE_FACES.map((faceIndices, i) => {
              const { isHighlighted } = getFaceLabel(i);
              const faceKey = `face-${faceIndices[0]}-${faceIndices[1]}-${faceIndices[2]}`;
              return (
                <path
                  key={faceKey}
                  d="M0 0 L0 0 L0 0 Z"
                  className="d20-face"
                  stroke="hsl(var(--glow))"
                  strokeWidth={isHighlighted ? 2.4 : 1.6}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                  style={{ opacity: 0 }}
                />
              );
            })}
          </g>

          <g filter="url(#textGlow)">
            {BASE_FACES.map((faceIndices, i) => {
              const { label } = getFaceLabel(i);
              const isNumber = /^\d+$/.test(label);
              const faceKey = `lbl-${faceIndices[0]}-${faceIndices[1]}-${faceIndices[2]}`;
              return (
                <text
                  key={faceKey}
                  x="0"
                  y="0"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className={cn(
                    "d20-label",
                    isNumber ? "fill-glow" : "fill-glow/80"
                  )}
                  style={{
                    fontFamily: isNumber ? "var(--font-jersey-25)" : "serif",
                    fontSize: isNumber
                      ? label === "20"
                        ? "28px"
                        : "20px"
                      : "18px",
                    opacity: 0,
                    fontWeight: "normal",
                  }}
                >
                  {label}
                </text>
              );
            })}
          </g>

          {/* Vertices as subtle glowing points */}
          <g>
            {BASE_VERTICES.map((vertex) => {
              const vertexKey = `v-${vertex.x.toFixed(2)}-${vertex.y.toFixed(
                2
              )}-${vertex.z.toFixed(2)}`;
              return (
                <circle
                  key={vertexKey}
                  cx="0"
                  cy="0"
                  r="3"
                  className="d20-vertex fill-glow"
                  opacity="0"
                  filter="url(#neonGlow)"
                />
              );
            })}
          </g>
        </g>
      </svg>
    </div>
  );
}
