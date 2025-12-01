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
    Point2D & { z: number },
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
const INITIAL_ROTATION = { x: 0.6, y: 0.2, z: 0 };

// Full symbol set for all 20 faces - Mixed numbers and runes
const FACE_SYMBOLS: Array<{ label: string; isHighlighted?: boolean }> = [
  { label: "20", isHighlighted: true }, // Face 0
  { label: "ᚠ" }, // Face 1
  { label: "2" }, // Face 2
  { label: "ᚢ" }, // Face 3
  { label: "4" }, // Face 4
  { label: "ᚦ" }, // Face 5
  { label: "6" }, // Face 6
  { label: "ᚨ" }, // Face 7
  { label: "8" }, // Face 8
  { label: "ᚱ" }, // Face 9
  { label: "10" }, // Face 10
  { label: "ᚲ" }, // Face 11
  { label: "12" }, // Face 12
  { label: "ᚷ" }, // Face 13
  { label: "14" }, // Face 14
  { label: "ᚹ" }, // Face 15
  { label: "16" }, // Face 16
  { label: "ᚺ" }, // Face 17
  { label: "18" }, // Face 18
  { label: "ᚾ" }, // Face 19
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
const rotate3D = (
  p: Point3D,
  rot: { x: number; y: number; z: number }
): Point3D => {
  let result = rotateX(p, rot.x);
  result = rotateY(result, rot.y);
  result = rotateZ(result, rot.z);
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
    Point2D & { z: number },
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
    Point2D & { z: number },
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
    Point2D & { z: number },
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
  edge: {
    strokeDashoffset: [300, 0],
    opacity: [0, 1],
    delay: stagger(40),
    duration: 2000,
    easing: "easeOutExpo" as const,
  },
  face: {
    opacity: [0, 1],
    delay: stagger(50, { start: 400 }),
    duration: 1000,
    easing: "easeOutQuad" as const,
  },
  detail: {
    opacity: [0, 1],
    delay: stagger(50, { start: 500 }),
    duration: 1000,
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
  const edgesRef = useRef<SVGLineElement[]>([]);
  const detailGroupsRef = useRef<SVGGElement[]>([]);
  const labelsRef = useRef<SVGTextElement[]>([]);
  const verticesRef = useRef<SVGCircleElement[]>([]);
  const animationRef = useRef<ReturnType<typeof animate> | null>(null);

  // Recalculate geometry and update DOM
  const updateGeometry = useCallback(() => {
    if (!svgRef.current) return;

    // Rotate and project vertices
    const projectedVertices = BASE_VERTICES.map((v) =>
      project(rotate3D(v, rotationRef.current))
    );

    // Build all faces with projected geometry
    const allFaces: Face[] = BASE_FACES.map((indices, i) => {
      const points: [
        Point2D & { z: number },
        Point2D & { z: number },
        Point2D & { z: number },
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

    // Extract unique edges from visible faces
    const edgeSet = new Set<string>();
    const edges: Array<{ p1: Point2D; p2: Point2D; id: string }> = [];

    visibleFaces.forEach((face) => {
      for (let j = 0; j < 3; j++) {
        const idx1 = face.indices[j];
        const idx2 = face.indices[(j + 1) % 3];
        const edgeId = idx1 < idx2 ? `${idx1}-${idx2}` : `${idx2}-${idx1}`;

        if (!edgeSet.has(edgeId)) {
          edgeSet.add(edgeId);
          edges.push({
            p1: face.points[j],
            p2: face.points[(j + 1) % 3],
            id: edgeId,
          });
        }
      }
    });

    // Visible vertices (part of visible faces)
    const visibleVertexIndices = new Set<number>();
    for (const face of visibleFaces) {
      for (const idx of face.indices) {
        visibleVertexIndices.add(idx);
      }
    }

    // Update face paths
    visibleFaces.forEach((face) => {
      const pathEl = facesRef.current[face.id];
      if (pathEl) {
        pathEl.setAttribute("d", trianglePath(face.points));
        pathEl.style.opacity = "1";
        pathEl.setAttribute(
          "fill",
          face.isHighlighted
            ? "url(#faceGradientLight)"
            : "url(#faceGradientDark)"
        );
      }
    });

    // Update details (Tech Ring & Spokes)
    visibleFaces.forEach((face) => {
      const group = detailGroupsRef.current[face.id];
      if (group) {
        group.style.opacity = "1";

        // Update ring
        const ring = group.querySelector("circle");
        if (ring) {
          ring.setAttribute("cx", String(face.center.x));
          ring.setAttribute("cy", String(face.center.y));
        }

        // Update spokes
        const spokes = group.querySelectorAll("line");
        face.points.forEach((p, idx) => {
          if (spokes[idx]) {
            spokes[idx].setAttribute("x1", String(face.center.x));
            spokes[idx].setAttribute("y1", String(face.center.y));
            spokes[idx].setAttribute("x2", String(p.x));
            spokes[idx].setAttribute("y2", String(p.y));
          }
        });
      }
    });

    // Hide non-visible faces and details
    allFaces.forEach((face) => {
      if (!face.isVisible) {
        const pathEl = facesRef.current[face.id];
        if (pathEl) {
          pathEl.style.opacity = "0";
        }
        const group = detailGroupsRef.current[face.id];
        if (group) {
          group.style.opacity = "0";
        }
      }
    });

    // Update edges - show visible ones, hide others
    edgesRef.current.forEach((lineEl, idx) => {
      if (idx < edges.length) {
        const edge = edges[idx];
        lineEl.setAttribute("x1", String(edge.p1.x));
        lineEl.setAttribute("y1", String(edge.p1.y));
        lineEl.setAttribute("x2", String(edge.p2.x));
        lineEl.setAttribute("y2", String(edge.p2.y));
        lineEl.style.opacity = "1";
      } else {
        lineEl.style.opacity = "0";
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
    edgesRef.current = Array.from(
      svg.querySelectorAll<SVGLineElement>(".d20-edge")
    );
    detailGroupsRef.current = Array.from(
      svg.querySelectorAll<SVGGElement>(".d20-detail-group")
    );
    labelsRef.current = Array.from(
      svg.querySelectorAll<SVGTextElement>(".d20-label")
    );
    verticesRef.current = Array.from(
      svg.querySelectorAll<SVGCircleElement>(".d20-vertex")
    );

    // Initial geometry update
    updateGeometry();

    // Intro animations
    animate(svg.querySelectorAll(".d20-edge"), ANIMATIONS.edge);
    animate(svg.querySelectorAll(".d20-face"), ANIMATIONS.face);
    animate(svg.querySelectorAll(".d20-detail-group"), ANIMATIONS.detail);
    animate(svg.querySelectorAll(".d20-label"), ANIMATIONS.label);

    // Continuous rotation animation using AnimeJS
    const ROTATION_SPEEDS = {
      x: (Math.PI * 2) / 23000, // Full rotation in ~23 seconds
      y: (Math.PI * 2) / 17000, // Full rotation in ~17 seconds
      z: (Math.PI * 2) / 31000, // Full rotation in ~31 seconds
    };

    const startTime = performance.now();

    const timeElement = { value: 0 };
    animationRef.current = animate(timeElement, {
      value: 1,
      duration: 100000, // Long duration, we use elapsed time instead
      easing: "linear",
      loop: true,
      update: () => {
        const elapsed = performance.now() - startTime;
        // Calculate rotation angles with different speeds per axis
        rotationRef.current.x =
          INITIAL_ROTATION.x + elapsed * ROTATION_SPEEDS.x;
        rotationRef.current.y =
          INITIAL_ROTATION.y + elapsed * ROTATION_SPEEDS.y;
        rotationRef.current.z =
          INITIAL_ROTATION.z + elapsed * ROTATION_SPEEDS.z;
        updateGeometry();
      },
    });

    // Loop animations
    animate(svg, ANIMATIONS.float);
    animate(svg.querySelectorAll(".d20-glow"), ANIMATIONS.pulse);

    // Parallax interaction
    const handleMouseMove = (e: MouseEvent) => {
      if (!svg) return;
      const moveX = (e.clientX - window.innerWidth / 2) * 0.015;
      const moveY = (e.clientY - window.innerHeight / 2) * 0.015;

      animate(svg.querySelectorAll(".d20-layer-back"), {
        translateX: moveX * 0.5,
        translateY: moveY * 0.5,
        duration: 400,
        easing: "easeOutQuad",
      });

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
          <filter id="d20Glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="8" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="neonGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
            <feGaussianBlur stdDeviation="3" result="blur2" />
            <feMerge>
              <feMergeNode in="blur2" />
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="textGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="1.5" result="blur" />
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

        <ellipse
          cx={VIEWPORT.centerX}
          cy={VIEWPORT.centerY}
          rx="160"
          ry="180"
          className="d20-glow fill-glow/10"
          filter="url(#d20Glow)"
        />

        <g className="d20-layer-back">
          <circle
            cx={VIEWPORT.centerX}
            cy={VIEWPORT.centerY}
            r="120"
            fill="none"
            stroke="hsl(var(--arcane))"
            strokeWidth="1"
            opacity="0.2"
            strokeDasharray="4 4"
          />
        </g>

        <g className="d20-layer-front">
          <g>
            {BASE_FACES.map((faceIndices, i) => {
              const { isHighlighted } = getFaceLabel(i);
              const faceKey = `face-${faceIndices[0]}-${faceIndices[1]}-${faceIndices[2]}`;
              return (
                <path
                  key={faceKey}
                  d="M0 0 L0 0 L0 0 Z"
                  fill={
                    isHighlighted
                      ? "url(#faceGradientLight)"
                      : "url(#faceGradientDark)"
                  }
                  className="d20-face"
                  style={{ opacity: 0 }}
                />
              );
            })}
          </g>

          <g>
            {BASE_FACES.map((faceIndices) => {
              const detailKey = `detail-${faceIndices[0]}-${faceIndices[1]}-${faceIndices[2]}`;
              return (
                <g
                  key={detailKey}
                  className="d20-detail-group"
                  style={{ opacity: 0 }}
                  filter="url(#neonGlow)"
                >
                  <circle
                    cx="0"
                    cy="0"
                    r="10"
                    fill="none"
                    stroke="hsl(var(--glow))"
                    strokeWidth="1"
                    className="opacity-60"
                  />
                  <line
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="0"
                    stroke="hsl(var(--glow))"
                    strokeWidth="0.5"
                    className="opacity-40"
                  />
                  <line
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="0"
                    stroke="hsl(var(--glow))"
                    strokeWidth="0.5"
                    className="opacity-40"
                  />
                  <line
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="0"
                    stroke="hsl(var(--glow))"
                    strokeWidth="0.5"
                    className="opacity-40"
                  />
                </g>
              );
            })}
          </g>

          <g>
            {/* Create enough edges for all possible visible edges (max ~30 for icosahedron) */}
            {Array.from({ length: 30 }, (_, i) => {
              // Create stable key based on edge pool position
              const edgeId = `d20-edge-pool-${String(i).padStart(2, "0")}`;
              return (
                <line
                  key={edgeId}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="0"
                  stroke="url(#edgeGradient)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeDasharray="300"
                  strokeDashoffset="300"
                  className="d20-edge"
                  filter="url(#neonGlow)"
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
