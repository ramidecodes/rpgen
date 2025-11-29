"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Float } from "@react-three/drei";
import type * as THREE from "three";
import { IcosahedronGeometry, EdgesGeometry } from "three";

export type D20DieProps = {
  radius?: number;
  glowColor?: string;
  faceColor?: string;
  rotationSpeed?: number;
};

export function D20Die({
  radius = 1.2,
  glowColor = "#00f5d4",
  faceColor = "#1a1a2e",
  rotationSpeed = 0.05,
}: D20DieProps) {
  const groupRef = useRef<THREE.Group>(null);

  const edgesGeometry = useMemo(() => {
    const icosahedron = new IcosahedronGeometry(radius, 0);
    return new EdgesGeometry(icosahedron);
  }, [radius]);

  useFrame((state) => {
    if (!groupRef.current) return;
    groupRef.current.rotation.y = state.clock.elapsedTime * rotationSpeed;
    groupRef.current.rotation.x =
      Math.sin(state.clock.elapsedTime * 0.15) * 0.06;
  });

  return (
    <Float speed={0.8} rotationIntensity={0.08} floatIntensity={0.15}>
      <group ref={groupRef}>
        {/* Outer glow sphere */}
        <mesh>
          <sphereGeometry args={[radius * 1.3, 16, 16]} />
          <meshBasicMaterial
            color={glowColor}
            transparent
            opacity={0.03}
            depthWrite={false}
          />
        </mesh>

        {/* Inner glow sphere */}
        <mesh>
          <sphereGeometry args={[radius * 0.9, 16, 16]} />
          <meshBasicMaterial
            color={glowColor}
            transparent
            opacity={0.08}
            depthWrite={false}
          />
        </mesh>

        {/* D20 faces with semi-transparent fill */}
        <mesh>
          <icosahedronGeometry args={[radius, 0]} />
          <meshBasicMaterial
            color={faceColor}
            transparent
            opacity={0.3}
            depthWrite={false}
          />
        </mesh>

        {/* Wireframe edges - thicker and brighter */}
        <lineSegments geometry={edgesGeometry}>
          <lineBasicMaterial color={glowColor} transparent opacity={1} linewidth={2} />
        </lineSegments>

        {/* Second layer of edges for glow effect */}
        <lineSegments geometry={edgesGeometry} scale={1.01}>
          <lineBasicMaterial color={glowColor} transparent opacity={0.4} />
        </lineSegments>
      </group>
    </Float>
  );
}
