# Feature Requirement Document - Skill Check HITL Call/Result Pairing

- **Feature Name**: Skill Check HITL Call/Result Pairing Guardrails

- **Goal**: Prevent repeated `requestSkillCheck` prompts by ensuring each HITL skill check has exactly one call and one resolved result persisted and streamed to the model/UI without duplication or orphaned tool parts.

- **User Story**: As a player performing a skill check, I want the Game Master to move on after my roll—showing the result and narration once—so I am not repeatedly asked to roll and the story can progress smoothly.

- **Functional Requirements**:

  - Message intake and validation (`src/app/api/chat/route.ts`):
    - Treat incoming history as `UIMessage[]` (AI SDK v6). Reject or drop entries that have neither meaningful `content` nor `parts`.
    - Normalize tool parts with `isToolUIPart`/`getToolName` and the canonical `output` field for HITL results (per `ai-sdk-v6-hitl` rule).
    - Ensure every `requestSkillCheck` tool call has a unique `toolCallId`.
  - Call/result pairing rules:
    - Before streaming to the model, enforce at most one `requestSkillCheck` call per `toolCallId`.
    - When a result (`state: "output-available"` with `output`) is present, ensure there is a corresponding call with the same `toolCallId`; otherwise drop or repair the orphaned part.
    - If multiple results map to the same `toolCallId`, keep the latest valid one and discard the rest.
    - Remove any duplicate tool-call entries that would re-trigger the same skill check for the provider.
  - Persistence and merge behavior on `addToolOutput` follow-ups:
    - Locate the existing assistant message containing the matching tool call by `toolCallId`.
    - Merge the new `output` (and `state: "output-available"`) into that message’s parts; if none exists, insert a single assistant message containing both the tool call and result.
    - Preserve canonical `output` (not just `result`) in stored parts so UI and future requests render correctly.
    - Persist updated run state when non-HITL tools execute during the same turn.
  - Pre-stream guard:
    - Fail fast (return 4xx with a clear error) if the outbound message list would include a `requestSkillCheck` result without a call, or multiple calls/results for the same `toolCallId`.
    - Do not invoke the model when guardrails fail; surface a concise diagnostic to the client/UI.
  - Stream assembly:
    - Build assistant messages from `streamText.onFinish` with:
      - `text` parts for narration when present.
      - `tool-call` parts for each tool call.
      - `tool-result`/HITL tool parts including `output` for server-run tools.
    - Maintain compatibility with UI rendering that prefers `output` over `result` for HITL.
  - UI expectations (reference, no code in this doc):
    - Skill check input cards render for `state: "input-available"`.
    - Skill check result cards render for `state: "output-available"` (or legacy `result`) when `output` is an object with message/roll metadata.
  - Testing and quality gates:
    - Reproduce the reported loop scenario (sample DB log with `call_GT0Nu0fPCE8EZgfgbBiQ7Dyq` followed by a blank `tool-call` message) and confirm only one skill check request/result appears and the GM continues narration.
    - Run `pnpm lint` on touched files.

- **Data Requirements**:

  - No new tables. Use existing `messages` JSONB to store `content` and `parts` with `toolCallId`, `state`, `input`, and `output`.
  - Ensure stored run state (`runs.state`) stays consistent when non-HITL tools mutate world data.

- **User Flow**:

  1. Assistant issues a `requestSkillCheck` (state `input-available`) with unique `toolCallId`; UI renders the prompt.
  2. Player rolls; client sends `addToolOutput({ tool: "requestSkillCheck", toolCallId, output: {...} })` plus optional lightweight user message.
  3. Server merges `output` into the existing assistant message by `toolCallId` (or creates a combined call+result message).
  4. Guard checks confirm one call/one result per `toolCallId`; if invalid, the request is rejected with a clear error.
  5. Model continues; assistant sends narration + any further tool calls. Messages are persisted with both `parts` and narration (`text` or `content`).
  6. On reload, `runs/[id]/play` reconstructs `UIMessage` history; the skill check result card and narration render once, with no repeated prompts.

- **Acceptance Criteria**:

  - Given the provided DB transcript, the next run of the flow does **not** emit a second `requestSkillCheck` for the same moment; the result card shows the 4 + 15 = 19 vs DC 18 success once.
  - No outbound payload to the model contains duplicate `toolCallId` entries or a result without its matching call.
  - After submitting `addToolOutput`, the stored assistant message contains the merged `output` and `state: "output-available"`; UI shows the resolved card and proceeds with narration.
  - Pre-stream guard prevents model invocation when pairing is invalid and responds with a concise error explaining the offending `toolCallId`.
  - `pnpm lint` passes on modified files.

- **Edge Cases**:

  - Missing `toolCallId`: drop the part and log; do not stream to model.
  - Multiple calls with identical `toolCallId`: keep the first valid call, discard the rest.
  - Result arrives before call is found: buffer/merge into a new assistant message containing both, or drop with a guard error; never re-request the tool.
  - Empty user trigger messages should be filtered before persistence and before model invocation to avoid accidental re-prompts.
  - Legacy `result` field present without `output`: map into `output` if shape is compatible; otherwise treat as invalid.

- **Non-Functional Requirements**:

  - Robustness: defensive type checks on `parts`, `output`, and `toolCallId` to avoid runtime errors.
  - Observability: structured logs for guard failures and repaired call/result pairs (include `toolCallId` and action taken).
  - Maintainability: keep logic aligned with `ai-sdk-v6-hitl` guidance and document the canonical `output` field usage.

- **Dependencies**:
  - HITL rules: `@/.cursor/rules/ai-sdk-v6-hitl.mdc`
  - Affected code: `src/app/api/chat/route.ts`, `src/lib/ai/tools.ts` (if needed), `src/hooks/use-game-chat.ts`, `src/components/game/chat-interface.tsx`
  - QA: `pnpm lint`; manual HITL flow verification.
