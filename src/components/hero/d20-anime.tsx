"use client";

import { animate, stagger } from "animejs";
import { useEffect, useRef, useMemo, useState } from "react";
import { cn } from "@/lib/utils";

type D20AnimeProps = {
  className?: string;
};

// --- 3D Geometry Math Helpers ---

type Point3D = { x: number; y: number; z: number };
type Point2D = { x: number; y: number };
type Face = {
  indices: [number, number, number];
  center: Point3D;
  normal: Point3D;
  label?: string;
  isHighlighted?: boolean;
};

const PHI = (1 + Math.sqrt(5)) / 2;

// Generate standard Icosahedron vertices (radius 1)
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
  // Normalize to sphere
  const len = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
  return { x: v.x / len, y: v.y / len, z: v.z / len };
});

// Icosahedron Face Indices (CCW winding)
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

// Rotate point around axis
function rotateX(p: Point3D, theta: number): Point3D {
  const cos = Math.cos(theta);
  const sin = Math.sin(theta);
  return { x: p.x, y: p.y * cos - p.z * sin, z: p.y * sin + p.z * cos };
}

function rotateY(p: Point3D, theta: number): Point3D {
  const cos = Math.cos(theta);
  const sin = Math.sin(theta);
  return { x: p.x * cos + p.z * sin, y: p.y, z: -p.x * sin + p.z * cos };
}

function rotateZ(p: Point3D, theta: number): Point3D {
  const cos = Math.cos(theta);
  const sin = Math.sin(theta);
  return { x: p.x * cos - p.y * sin, y: p.x * sin + p.y * cos, z: p.z };
}

export function D20Anime({ className }: D20AnimeProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  // State to trigger re-renders for animation frames if needed, 
  // but we'll mostly use AnimeJS on DOM elements.
  // However, for 3D rotation we need to project to 2D.
  // We'll generate the "Classic View" statically first.
  
  // The "Classic View" (Face-Centered):
  // Rotate so Face 0 is facing Z-negative (towards camera).
  // Face 0 normal is roughly Y-positive.
  // Let's pre-calculate a rotation that aligns Face 0 to Camera.

  const classicGeometry = useMemo(() => {
    // 1. Find center of Face 0
    const f0 = BASE_FACES[0];
    const v0 = BASE_VERTICES[f0[0]];
    const v1 = BASE_VERTICES[f0[1]];
    const v2 = BASE_VERTICES[f0[2]];
    const center = {
      x: (v0.x + v1.x + v2.x) / 3,
      y: (v0.y + v1.y + v2.y) / 3,
      z: (v0.z + v1.z + v2.z) / 3,
    };

    // 2. Determine angles to rotate this center to (0, 0, 1)
    // This is a bit manual, let's just rotate until it looks right.
    // For Icosahedron defined above, Face 0 is near Top-Front.
    // Rotation: X-axis ~0.5 rad?
    
    // Let's apply a fixed rotation that creates a nice "20 face up" view.
    // Rotation found experimentally or by aligning normal.
    const rotX = 0.5; 
    const rotY = 0.3;
    const rotZ = 0.1;

    // Map vertices
    const rotatedVerts = BASE_VERTICES.map((v) => {
      let p = rotateX(v, 0.6); // Tilt forward to show top face
      p = rotateY(p, 0.2); // Slight turn
      return p;
    });

    // Project to 2D (Orthographic)
    // Scale factor
    const SCALE = 160;
    const OFFSET_X = 200;
    const OFFSET_Y = 215;

    const projectedVerts = rotatedVerts.map((v) => ({
      x: v.x * SCALE + OFFSET_X,
      y: v.y * SCALE + OFFSET_Y,
      z: v.z, // Keep Z for sorting
    }));

    // Create Face objects
    const faces = BASE_FACES.map((indices, i) => {
      const a = projectedVerts[indices[0]];
      const b = projectedVerts[indices[1]];
      const c = projectedVerts[indices[2]];

      // Calculate center z for sorting
      const z = (a.z + b.z + c.z) / 3;

      // Calculate normal z component to cull backfaces
      // Cross product 2D edges (simplified visibility check)
      // (b.x - a.x)*(c.y - a.y) - (b.y - a.y)*(c.x - a.x)
      // If > 0 (assuming CCW), it's facing us.
      // Note: Our Y is down in SVG, so signs might flip.
      const crossZ = (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
      const isVisible = crossZ < 0; // SVG coords (y down) means negative crossZ is CCW?

      // Assign Labels
      let label = "";
      let isHighlighted = false;
      
      // Classic numbering mapping (arbitrary but fixed)
      if (i === 0) { label = "20"; isHighlighted = true; }
      else if (i === 1) label = "8";
      else if (i === 2) label = "4";
      else if (i === 3) label = "18"; // Hidden?
      else if (i === 4) label = "12";
      else if (i === 5) label = "14";
      else if (i === 6) label = "ᚠ"; // Rune
      else if (i === 7) label = "ᚢ"; // Rune
      else if (i === 8) label = "ᚦ"; // Rune
      else if (i === 9) label = "ᚨ"; // Rune
      // ... others

      // Use Runes for non-numbers
      if (!label && i % 2 === 0) label = "ᚱ";
      if (!label && i % 2 === 1) label = "ᚲ";

      return {
        indices,
        points: [a, b, c],
        center: {
          x: (a.x + b.x + c.x) / 3,
          y: (a.y + b.y + c.y) / 3,
          z,
        },
        isVisible,
        label,
        isHighlighted,
        id: i,
      };
    });

    // Sort faces by Z (furthest first for painter's algo, but we cull hidden)
    // Actually, for SVG, we just want visible faces.
    const visibleFaces = faces.filter((f) => f.isVisible).sort((a, b) => a.center.z - b.center.z);

    // Extract visible edges
    // We need to deduplicate edges.
    const edges = new Set<string>();
    const edgeList: { p1: Point2D; p2: Point2D; isOuter: boolean }[] = [];

    visibleFaces.forEach((face) => {
      const pts = face.points;
      for (let j = 0; j < 3; j++) {
        const p1 = pts[j];
        const p2 = pts[(j + 1) % 3];
        // Create unique edge ID based on vertex indices
        const idx1 = face.indices[j];
        const idx2 = face.indices[(j + 1) % 3];
        const edgeId = idx1 < idx2 ? `${idx1}-${idx2}` : `${idx2}-${idx1}`;
        
        if (!edges.has(edgeId)) {
          edges.add(edgeId);
          edgeList.push({ p1, p2, isOuter: false }); // Simplified "isOuter" logic omitted
        }
      }
    });
    
    // Identify outer edges (shared by only 1 visible face? No, simplified to just render all visible edges)
    
    return { faces: visibleFaces, edges: edgeList, vertices: projectedVerts };
  }, []);

  useEffect(() => {
    if (!svgRef.current) return;

    // Intro Animation
    
    // 1. Draw Edges
    animate(svgRef.current.querySelectorAll(".d20-edge"), {
      strokeDashoffset: [300, 0],
      opacity: [0, 1],
      delay: stagger(40),
      duration: 2000,
      easing: "easeOutExpo",
    });

    // 2. Fill Faces
    animate(svgRef.current.querySelectorAll(".d20-face"), {
      opacity: [0, 1],
      delay: stagger(50, { start: 400 }),
      duration: 1000,
      easing: "easeOutQuad",
    });

    // 3. Reveal Labels
    animate(svgRef.current.querySelectorAll(".d20-label"), {
      opacity: [0, 1],
      scale: [0.5, 1],
      delay: stagger(50, { start: 800 }),
      duration: 800,
      easing: "easeOutBack",
    });

    // Loop Animations
    
    // Float
    animate(svgRef.current, {
      translateY: [-8, 8],
      rotate: [-2, 2], // Subtle 2D rotation
      duration: 5000,
      direction: "alternate",
      loop: true,
      easing: "easeInOutSine",
    });

    // Pulse
    animate(svgRef.current.querySelectorAll(".d20-glow"), {
      opacity: [0.3, 0.6],
      scale: [0.95, 1.05],
      duration: 3000,
      direction: "alternate",
      loop: true,
      easing: "easeInOutSine",
    });

    // Interaction
    const handleMouseMove = (e: MouseEvent) => {
        if (!svgRef.current) return;
        const { clientX, clientY } = e;
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;
        const moveX = (clientX - centerX) * 0.015;
        const moveY = (clientY - centerY) * 0.015;

        // Parallax groups
        animate(svgRef.current.querySelectorAll(".d20-layer-back"), {
          translateX: moveX * 0.5,
          translateY: moveY * 0.5,
          duration: 400,
          easing: "easeOutQuad"
        });
        
        animate(svgRef.current.querySelectorAll(".d20-layer-front"), {
          translateX: moveX,
          translateY: moveY,
          duration: 400,
          easing: "easeOutQuad"
        });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);

  }, [classicGeometry]);

  return (
    <div
      className={cn(
        "relative flex h-full w-full items-center justify-center",
        className
      )}
    >
      <svg
        ref={svgRef}
        viewBox="0 0 400 430"
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
          <filter id="textGlow" x="-50%" y="-50%" width="200%" height="200%">
             <feGaussianBlur stdDeviation="3" result="blur" />
             <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <linearGradient id="edgeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(var(--glow))" stopOpacity="0.8" />
            <stop offset="100%" stopColor="hsl(var(--arcane))" stopOpacity="0.8" />
          </linearGradient>
          <linearGradient id="faceGradientLight" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(var(--glow))" stopOpacity="0.15" />
            <stop offset="100%" stopColor="hsl(var(--glow))" stopOpacity="0.05" />
          </linearGradient>
          <linearGradient id="faceGradientDark" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(var(--arcane))" stopOpacity="0.1" />
            <stop offset="100%" stopColor="hsl(var(--arcane))" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* Background Glow */}
        <ellipse
          cx="200"
          cy="215"
          rx="160"
          ry="180"
          className="d20-glow fill-glow/10"
          filter="url(#d20Glow)"
        />

        {/* Back Layer (for Parallax) - could put backfaces here if we wanted transparency */}
        <g className="d20-layer-back">
          {/* Maybe some particle effects or arcane circles behind */}
          <circle cx="200" cy="215" r="120" fill="none" stroke="hsl(var(--arcane))" strokeWidth="1" opacity="0.2" strokeDasharray="4 4" />
        </g>

        {/* Front Layer - The D20 Itself */}
        <g className="d20-layer-front">
            {/* Faces */}
            <g>
                {classicGeometry.faces.map((face, i) => (
                    <path
                        key={`face-${face.id}`}
                        d={`M${face.points[0].x} ${face.points[0].y} L${face.points[1].x} ${face.points[1].y} L${face.points[2].x} ${face.points[2].y} Z`}
                        fill={face.isHighlighted ? "url(#faceGradientLight)" : "url(#faceGradientDark)"}
                        className="d20-face"
                        style={{ opacity: 0 }}
                        stroke="none"
                    />
                ))}
            </g>

            {/* Edges */}
            <g>
                {classicGeometry.edges.map((edge, i) => (
                    <line
                        key={`edge-${i}`}
                        x1={edge.p1.x}
                        y1={edge.p1.y}
                        x2={edge.p2.x}
                        y2={edge.p2.y}
                        stroke="url(#edgeGradient)"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeDasharray="300"
                        strokeDashoffset="300"
                        className="d20-edge"
                        filter="url(#d20Glow)"
                    />
                ))}
            </g>

            {/* Labels */}
            <g filter="url(#textGlow)">
                {classicGeometry.faces.map((face) => {
                    if (!face.label) return null;
                    const isNum = /^\d+$/.test(face.label);
                    return (
                        <text
                            key={`lbl-${face.id}`}
                            x={face.center.x}
                            y={face.center.y + (isNum ? 6 : 4)}
                            textAnchor="middle"
                            dominantBaseline="middle"
                            className={cn("d20-label", isNum ? "fill-glow" : "fill-glow/80")}
                            style={{
                                fontFamily: isNum ? "var(--font-jersey-25)" : "serif",
                                fontSize: isNum ? (face.label === "20" ? "32px" : "24px") : "20px",
                                opacity: 0,
                                fontWeight: isNum ? "bold" : "normal"
                            }}
                        >
                            {face.label}
                        </text>
                    );
                })}
            </g>

            {/* Vertices (Nodes) */}
            <g>
              {classicGeometry.vertices.map((v, i) => {
                 // Only show visible vertices (simple check: is part of any visible face)
                 // This is a bit loose but fine for visual
                 return (
                     <circle 
                        key={`v-${i}`} 
                        cx={v.x} cy={v.y} 
                        r="3" 
                        className="fill-glow"
                        opacity="0.8"
                        filter="url(#d20Glow)"
                     />
                 )
              })}
            </g>
        </g>
      </svg>
    </div>
  );
}
