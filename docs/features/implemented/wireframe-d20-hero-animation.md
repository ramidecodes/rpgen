## Feature Name

Wireframe D20 Hero Animation

## Goal

Create a Matrix-style, neon-green wireframe icosahedron (D20) hero animation that continuously rotates around its vertical axis, with half of the faces displaying numbers and the other half displaying runes, set against a subtle techno background that fits the app’s existing hero aesthetic.

## User Story

As a player landing on the site, I want to see an eye-catching animated D20 that looks like a Matrix-style wireframe asset so that I immediately understand the game’s vibe and feel immersed in a blend of fantasy and cyber aesthetics.

## Functional Requirements

- The component MUST render a 3D icosahedron projected into 2D SVG.
- The die MUST rotate continuously around its vertical (Y) axis without stutters at loop boundaries.
- The icosahedron MUST be represented as a wireframe:
  - Edges rendered as glowing neon lines.
  - Optional vertices rendered as small glowing points.
- Exactly 10 faces MUST show numeric labels (1–20 or a curated subset) and 10 faces MUST show rune glyphs.
- Labels MUST be positioned at each face’s projected center and remain reasonably readable during rotation.
- The animation MUST use Anime.js for:
  - Continuous die rotation (by updating rotation progress over time).
  - Subtle background ring/rune motion and glow pulsing.
- The component MUST be responsive within its container and integrate with the hero layout using existing utilities (`cn`, Tailwind classes).

## Data Requirements

- No backend or database changes are required.
- All geometry data (vertices, faces) and label mappings are static and defined in the component.

## User Flow

1. User navigates to or loads a page that includes the hero section.
2. The `D20Anime` component mounts and initializes the SVG and Anime.js timelines.
3. The die appears as a neon wireframe with a subtle glowing techno background.
4. The die starts (or continues) to rotate around its vertical axis.
5. As the die rotates, visible faces show either numbers or runes with a light text glow.
6. Background rings and rune circle rotate slowly and pulse to enhance the techno/matrix feel.

## Acceptance Criteria

- The hero section displays a clearly identifiable D20 wireframe that rotates smoothly around a vertical axis.
- The animation looks “Matrix-like”: neon green on a dark background, with subtle techno/arcane rings.
- Half of the faces are numeric and half are runes; at no time do labels flicker or disappear incorrectly when a face is visible.
- The animation runs smoothly on modern desktop browsers without noticeable frame drops.
- The component uses Anime.js for both the main rotation and background effects.
- The component passes `pnpm lint` with no new linting or type errors.

## Edge Cases

- Low-performance devices: rotation and background animations should remain smooth enough; avoid excessive DOM nodes or per-frame heavy computations beyond necessary projection math.
- Window resize: the SVG scales with its container; no layout shift or distortion occurs.
- Reduced-motion users (future enhancement): animation could be paused or simplified if a reduced-motion preference is detected (not required for first implementation but should not preclude it).

## Non-Functional Requirements

- Performance: Keep the number of SVG elements and per-frame operations reasonable to avoid jank.
- Maintainability: Geometry, labeling, and animation logic should be well-structured and typed for easy adjustment (e.g., changing label sets or speeds).
- Consistency: Use existing design tokens (e.g., CSS variables for glow colors) and Tailwind class ordering conventions to match the rest of the codebase.


