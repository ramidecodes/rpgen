# Feature Requirements (FReD): NPC Table & CMA Integration

## 1) Context & Goal

- Introduce an `npcs` table scoped to a specific Run, mirroring main character narrative fields but without stats.
- Empower the Campaign Manager Agent (CMA) to generate and manage important NPCs for the campaign, storing portraits in R2 via existing image generation logic.
- Ensure NPCs are automatically removed when their parent Run is deleted.

## 2) Current Behavior (from code)

- No dedicated `npcs` table; only `characters` (with stats) tied to universes/users.
- CMA does not persist NPCs or trigger portrait generation for them.
- Image generation exists (`src/lib/ai/image-generator.ts`) but is not wired for CMA-driven NPC creation.

## 3) Problem

- Important NPCs have no persistent, run-scoped records; portraits are not generated or stored.
- CMA cannot curate NPC presence over time (appearance, faction ties, attitude/influence/threat).
- Run deletion does not cascade-delete NPCs because they are not modeled.

## 4) Requirements

### Functional

1. CMA can create and update “important” NPCs per Run (idempotent upsert by `id` or `name + runId`).
2. Portraits are always generated on NPC creation and stored in R2; URL saved in DB.
3. CMA can regenerate portrait when appearance meaningfully changes (guard against spam).
4. NPCs are scoped to `runId` and cascade-delete when the Run is deleted.
5. Basic validation: require `runId` and `name`; trim/dedupe personality traits; validate attitude/influence/threat level to allowed values.
6. Tool outcomes logged/visible to CMA for observability.

### Data Model (Drizzle / DB)

- New table `npcs` with:
  - `id` (uuid, pk).
  - `runId` (fk -> runs.id, `ON DELETE CASCADE`).
  - `name` (string, required).
  - Narrative fields mirroring main character properties (minus stats): `origin`, `appearance`, `profession`, `factionName`, `backstory`, `personalityTraits` (string array), `imageUrl`.
  - NPC-focused extras: `attitude` (enum: friendly | neutral | hostile), `influence` (int 1–5), `threatLevel` (int 1–5).
  - Optional `metadata` JSONB for extension.
  - `createdAt`, `updatedAt`.
- Indexes: `runId`; consider (`runId`, `name`) for upsert/read.

### CMA / Agent Tools (AI SDK v6 aligned)

- Add/extend CMA tools:
  - `createOrUpdateNpc`: writes NPC record (including narrative fields and attitude/influence/threat).
  - `generateNpcPortrait`: uses `image-generator` to produce R2 portrait and return URL.
- Always prefer AI SDK v6 tool part shapes; no `any`.
- CMA flow:
  - Generate narrative fields and flags.
  - Call `generateNpcPortrait` (appearance-based prompt, may include profession/faction cues).
  - Persist NPC with portrait URL via `createOrUpdateNpc`.
  - On appearance change, optionally re-run portrait generation with throttling.

### Image Generation & Storage

- Reuse `src/lib/ai/image-generator.ts`:
  - Prompt built from `appearance` (plus optional profession/faction context).
  - Store result in R2; capture final URL/key in `imageUrl`.
  - Surface errors back to CMA tool result.
- Ensure consistent format (e.g., webp) and content-type handling matches existing pipeline.

### Lifecycle & Deletion

- `runId` foreign key uses `ON DELETE CASCADE` to remove NPCs with their parent Run.
- Optionally add CMA cleanup for orphans if inconsistency is detected.

### Non-Functional

- Keep changes localized to new table, migrations, CMA tool wiring, and image pipeline reuse.
- Backward compatible with existing runs/messages data.
- Avoid performance regressions; simple indexing suffices.

### Out of Scope

- UI display of NPCs.
- Combat/skill systems for NPCs (no stats column).
- Broader schema refactors.

### Success Metrics

- NPCs can be created/updated per Run with portraits saved to R2.
- Run deletion removes associated NPCs automatically.
- CMA logs show successful tool runs for portrait generation and NPC persistence.
- No duplicate NPC spam for the same important character in a Run.

### Risks & Mitigations

- Portrait regeneration spam: throttle or require appearance change check before regenerating.
- Duplicate NPCs by name: enforce (`runId`, `name`) uniqueness or de-duplication in tool logic.
- R2 failures: return tool error and keep NPC pending without `imageUrl` until retried.

### Open Questions

- Should `metadata` support structured tags (e.g., location, quest ties) up front?
- Are there limits on simultaneous portrait generations per Run to control cost?
- Should we auto-downgrade portrait quality for low-importance NPCs, or keep one tier?
