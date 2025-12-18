# Feature Requirements (FReD): Scene Generation Loading Signal

## 1) Feature Name

- Scene Generation Loading Signal & Visual Cue

## 2) Goal

- When the Visual Engine Agent (VEA) decides to generate a new scene image, immediately signal the UI so the current scene remains visible but shows a loading state (pulsating border + glow) until the new image is ready or the request is cleared.

## 3) User Story

- As a player, I want to see a subtle visual indicator that a new scene image is being generated so I know the story is progressing while still viewing the current scene.

## 4) Current Behavior (observed)

- `visual-engine.ts` emits a `scene-generation-started` SSE only after a tool call occurs (`prepareStep`), with a placeholder ID if none exists. Emission is gated by `hasEmittedStart`, so repeated tool decisions in a run cycle may not send a fresh signal.
- `game-play-client.tsx` listens for `scene-generation-started` and sets `pendingSceneId`, but clearing relies on receiving `scene-generation-completed`/`cancelled` or image fetch success; placeholder IDs are timed out after 60s. If the event is missed or not emitted, the pending state is never set.
- `scene-visualizer.tsx` uses `pendingSceneId` to add a thin pulse overlay, but only when `pendingSceneId` is truthy; if the signal never arrives, no loading cue appears and the UI drops back to the default state.
- Result: the intended loading signal is unreliable (often no pulse) and the “keep current image with glow” experience is not guaranteed.

## 5) Functional Requirements

1. Deterministic start signal

   - Emit a `scene-generation-started` event as soon as the VEA issues an image-generation request (before the scene record/image URL exists). Include `runId`, a stable `pendingSceneId` (placeholder allowed), and narrative context.

2. Pending state management

   - `game-store` tracks `pendingSceneId` (string | null). Setting occurs on start events; clearing occurs on completion, cancellation, or timeout. Repeated start events refresh the pending ID and timer.

3. UI loading cue

   - `scene-visualizer` keeps rendering the current scene image (no blanking). While `pendingSceneId` is set, add a pulsing border plus soft drop-shadow “glow” around the current image/card. No overlay when there is no active pending ID.

4. Completion/clear

   - Clear `pendingSceneId` when a new scene with `imageUrl` is observed for the run, when a `scene-generation-cancelled`/timeout fires, or when SSE reconnection signals that nothing is pending.

5. Backward compatibility
   - If SSE is unavailable, the UI must gracefully degrade (no crashes, default static rendering). Existing scene data structures remain unchanged.

## 6) Data Requirements

- Event payloads: `{ type: "scene-generation-started", data: { runId, sceneId, narrativeContext, placeholder?: boolean } }`, plus corresponding completion/cancel events.
- Store fields: `pendingSceneId` (string | null).
- No new database fields; reuse existing `scenes` and `runs.currentSceneId`.

## 7) User Flow

1. GM message is produced; VEA decides a new image is needed.
2. VEA emits `scene-generation-started` with placeholder/stable ID over SSE.
3. Client receives event → `pendingSceneId` set in `game-store`.
4. `scene-visualizer` renders current image with pulse + glow.
5. Image generation completes → new scene/image URL available or `scene-generation-completed` SSE fired.
6. Client clears `pendingSceneId`; UI returns to normal state showing the updated image.
7. On failure/cancel/timeout, pending is cleared and existing image remains.

## 8) Acceptance Criteria

- A start signal is emitted on every generation attempt before image URL availability.
- `pendingSceneId` becomes non-null immediately after start and returns to null on completion/cancel/timeout.
- The UI shows pulse + glow while pending and never hides the current image during generation.
- Reloading the play page during a pending generation still shows the loading cue if the server indicates a pending scene.
- No regressions to existing scene display, zoom, or error handling.
- `pnpm lint` passes for the touched files when implemented.

## 9) Edge Cases

- Multiple rapid generation requests: latest pending ID overwrites earlier; glow stays until the latest request resolves.
- Placeholder IDs that never resolve: timeout clears pending within a reasonable window.
- SSE reconnects mid-generation: upon reconnect, pending state rehydrates from server state (scene without imageUrl or explicit SSE replay if available).
- Missing `imageUrl` but no pending signal: render pending state based on scene data if provided, otherwise show normal view with no crash.

## 10) Non-Functional Requirements

- No schema changes; minimal server overhead for SSE broadcasts.
- Loading cue is lightweight (CSS-only pulse/glow), avoids layout shifts, and keeps accessibility intact (ARIA unaffected).
- Resilient to SSE drops; state resets safely without user intervention.
