"use client";

import { useState, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { D20Die } from "./d20-die";

function useThemeColors() {
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    const checkDark = () => document.documentElement.classList.contains("dark");
    setIsDark(checkDark());

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.attributeName === "class") {
          setIsDark(checkDark());
        }
      }
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  return {
    glowColor: isDark ? "#00f5d4" : "#0a8080",
    faceColor: isDark ? "#0d1117" : "#d8e0e8",
  };
}

type SceneProps = {
  glowColor: string;
  faceColor: string;
};

function Scene({ glowColor, faceColor }: SceneProps) {
  return (
    <>
      <ambientLight intensity={0.3} />
      <pointLight position={[5, 5, 5]} intensity={0.5} />
      <pointLight position={[-5, -5, -3]} intensity={0.3} color={glowColor} />
      <pointLight position={[0, 0, 4]} intensity={0.4} color={glowColor} />

      <D20Die radius={0.95} glowColor={glowColor} faceColor={faceColor} />
    </>
  );
}

export function ThreeScene() {
  const { glowColor, faceColor } = useThemeColors();

  return (
    <div className="absolute inset-0 z-0">
      <Canvas
        camera={{ position: [0, 0, 4.5], fov: 50 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: "transparent" }}
      >
        <Scene glowColor={glowColor} faceColor={faceColor} />
      </Canvas>
    </div>
  );
}
