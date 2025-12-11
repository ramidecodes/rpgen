# Feature Requirement Document — AI SDK v6 Chat Agent Refactor (HITL Skill Checks)

- **Feature Name**: AI SDK v6 ToolLoopAgent Chat Flow with HITL Skill Checks & Dual Agents
- **Goal**: Replace the current chat handling (duplicate IDs, tool-call spam) with AI SDK v6 `ToolLoopAgent`, enforce HITL-only skill checks, and formalize two agents: an interactive Game Master Agent (GMA) and a background Campaign Manager Agent (CMA) to keep campaign data accurate without overloading a single agent.
- **User Story**: As a player, I want reliable chat interactions where the Game Master guides the story, pauses for dice rolls via HITL skill checks, and keeps the campaign state consistent so the world evolves meaningfully without errors or infinite tool-call loops.

## Functional Requirements

- **AI SDK v6 Adoption**

  - Use `ToolLoopAgent` (AI SDK v6) for chat orchestration; prefer `stopWhen` and `prepareStep` to manage tool-loop limits and phase-specific tooling.
  - Use models already registered in `src/lib/ai/provider.ts` (current base/reasoning slots via OpenRouter client).
  - Provide `callOptionsSchema` to inject run/campaign context (runId, campaign state snapshot, universe/character metadata) per call.
  - Enforce HITL for `requestSkillCheck`: no automatic resolution; only surface `state: "input-available"` and wait for client `addToolOutput` (`state: "output-available"`).

- **Agent Roles (formalized split)**

  - **Game Master Agent (GMA)** — interactive
    - Responsibilities: narration, pacing, issuing HITL skill checks, proposing world updates.
    - Tools: `requestSkillCheck` (HITL, no execute), `updateNarrativeVector`, `manageRelationship`, `advanceFront`, `createQuest`, `logEvent`.
    - Trigger: every player chat turn via `/api/chat`, streaming UI response. Uses `stopWhen`/`prepareStep` to cap loops and phase tools (e.g., allow HITL request then narrate).
  - **Campaign Manager Agent (CMA)** — background
    - Responsibilities: reconcile/persist campaign state using deterministic logic without user-facing narration or HITL.
    - Tools: state-mutating set only (`updateNarrativeVector`, `manageRelationship`, `advanceFront`, `createQuest`, `logEvent`); HITL tool disabled.
    - Trigger: post-turn hook/server-side job after GMA finishes (e.g., when new assistant message + updated state exists); runs off-UI and persists state only.
  - If combining into one agent, enforce phased `activeTools` and `stopWhen` to avoid overload; default plan is two agents.

- **Tools & HITL**

  - Keep `requestSkillCheck` as HITL-only (no execute).
  - World-state tools (`updateNarrativeVector`, `manageRelationship`, `advanceFront`, `createQuest`, `logEvent`) must return structured results and mutate an in-memory copy of `CampaignState` that is persisted after the agent loop.
  - Support tool-call/result serialization that avoids duplicate `toolCallId` entries (no provider/part IDs forwarded to the model).

- **Message Handling & Persistence**

  - Accept `UIMessage[]`; drop empty messages before model calls.
  - Preserve `toolCallId` continuity across requests; dedupe tool-call/result pairs before sending to the model to satisfy OpenAI/OpenRouter constraints.
  - Persist:
    - User messages (meaningful content/parts).
    - Assistant messages with tool calls/results (including HITL `output` payloads) and final narration.
  - For HITL results, update the original assistant message or insert a new one containing `state: "output-available"` and `output`.

- **Stopping & Loop Control**

  - Configure `stopWhen` to cap steps and halt after HITL request issuance or after reasonable tool/narration cycles to prevent spam.
  - Use `prepareStep` to phase tools (e.g., first step allow HITL check request; subsequent steps narration-only) and to trim message context if needed.

- **Background State Sync (if used)**
  - Triggered post-turn (server-side) with the latest state + transcript subset.
  - Runs without user-facing streaming; only mutates and persists state and emits structured logs/telemetry.
  - Should avoid HITL tools and respect idempotency where possible.

## Data Requirements

- **Campaign State**: JSONB `CampaignState` with normalized defaults (fronts, narrativeVectors, questThreads, knowledgeGraph, currentContext). Persist state changes after tool executions (both interactive and background agent).
- **Messages**: Stored as JSON (content + parts) with preserved `toolCallId` and HITL `output`.
- **Telemetry (optional)**: Log tool usage counts, stop conditions hit, and errors for observability.

## User Flow

1. Client sends chat (`UIMessage[]`, runId) to `/api/chat`.
2. Server loads run, campaign, character, universe; normalizes `CampaignState`.
3. Build call options (state + metadata) and invoke the GMA `ToolLoopAgent`.
4. Agent may:
   - Emit narration.
   - Call world-state tools (mutate state).
   - Call `requestSkillCheck` (HITL) and stop until client supplies `addToolOutput`.
5. Stream response via `createAgentUIStreamResponse` (AI SDK v6 UI).
6. Persist user/assistant messages and updated campaign state.
7. Trigger background Campaign Manager Agent to reconcile state using recent transcript and persist without user-facing output (no narration, no HITL).

## Acceptance Criteria

- No duplicate `toolCallId` errors from provider; sanitized message stream before model call.
- Skill checks always require HITL; no auto-resolution by the model.
- World-state tool calls mutate and persist `CampaignState`; results reflected in subsequent turns.
- Agent stops cleanly (no tool-call spam) using `stopWhen`/`prepareStep`.
- Background agent (if enabled) updates state without emitting chat text and without HITL calls.
- Documentation updated (README, STRUCTURE, ARCHITECTURE, AI SDK HITL rule) to reflect v6 agent setup and multi-agent option.

## Edge Cases

- Empty/whitespace user messages on first turn → inject synthetic minimal message.
- Orphaned tool results (no matching call) → discard before model call.
- Replayed HITL outputs → dedupe by `toolCallId` and prefer latest `output`.
- Tool-call flood → cap via `stopWhen` and `activeTools` per step.
- Provider differences (OpenRouter routing) → ensure model identifiers come from `src/lib/ai/provider.ts`.

## Non-Functional Requirements

- Observability: log stop reasons, tool counts, and state persistence errors.
- Performance: keep context trimmed if steps grow; avoid unnecessary tool calls.
- Reliability: enforce Zod schemas on tool inputs and normalized state defaults to prevent invalid writes.

## References

- AI SDK v6 Agents & ToolLoopAgent: https://v6.ai-sdk.dev/docs/agents/building-agents
- Loop Control: https://v6.ai-sdk.dev/docs/agents/loop-control
- Call Options: https://v6.ai-sdk.dev/docs/agents/configuring-call-options
- Internal rule: `.cursor/rules/ai-sdk-v6-hitl.mdc`
