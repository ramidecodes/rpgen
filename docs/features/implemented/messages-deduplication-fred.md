# Feature Requirements (FReD): Message Deduplication & Tool-Call Hygiene

## 1) Context & Goal

- AI SDK v6 with OpenAI via OpenRouter occasionally returns 400 "Duplicate item found … toolCallId".
- Root cause: multiple occurrences of the same `toolCallId` across the request payload (not just within a single message), often from re-sending historical tool-call parts alongside newer tool results.
- Goal: guarantee a provider-safe payload where each `toolCallId` appears at most once as a tool-call and once as a tool-result, while preserving HITL flows.

## 2) Current Behavior (from code)

- Schema `messages` JSONB stores `content` (string or `parts`).
- `src/app/api/chat/route.ts`:
  - Strips `id`/`providerId`; dedupes per `toolCallId` but mainly within-message; historic tool-call parts can still be sent alongside later results.
  - Validation blocks multiple calls/results per ID in one pass, but duplicates may persist across messages.
  - HITL `requestSkillCheck` uses `addToolOutput`; a follow-up lightweight user message triggers continuation.
- Client `use-game-chat` uses `useChat` transport; can emit minimal follow-up messages after HITL.

## 3) Problem

- OpenAI rejects when the payload contains duplicate `tool_call_id` occurrences across the full messages array.
- We need cross-message collapsing of tool-call/result parts so each `toolCallId` is represented once (call) and once (result) at most.

## 4) Requirements

### Functional

1. Cross-message collapse:
   - For each `toolCallId`, keep at most one `tool-call` part and one `tool-result` part across the outbound payload.
   - Prefer earliest call; prefer latest/best result (with `output`/`result` if present).
   - Optionally drop the historical call once a result exists (default recommendation: drop older duplicates).
2. Strip provider-generated IDs (`id`, `providerId`) from all messages and parts before model send.
3. Prune empty messages (no meaningful content and no non-empty parts), including synthetic “ ” tick messages, before `convertToModelMessages`.
4. Preserve ordering and pairing: surviving parts keep chronological integrity; pairing remains coherent.
5. Persistence parity: persist the same sanitized parts sent to the model; avoid reintroducing provider IDs or duplicate parts.
6. HITL safety: keep HITL parts (`state` variants) and `output`; do not strip `output` when deduping; `result` remains optional fallback.
7. Logging: log counts of calls/results kept and pruned per `toolCallId`; log cross-message duplicate removals.

### Non-Functional

- No schema changes; stay localized to `src/app/api/chat/route.ts`.
- Backward compatible with existing stored messages.
- Must satisfy OpenAI/OpenRouter constraints.
- Dedup in O(total parts); avoid extra DB round trips.

## 5) Edge Cases

- Historical assistant tool-call with later result: ensure only one call + one result remain.
- Multiple results for same ID (retries): keep richest/latest, drop others.
- Orphan results: drop unless a call exists after collapse.
- Mixed text and tool parts: only dedup tool-call/result; keep text untouched.
- HITL states: keep `state: "input-available"` and `state: "output-available"`; do not remove `output`.

## 6) Out of Scope

- Schema changes.
- UI changes beyond compatibility.
- Provider/model switching logic.

## 7) Success Metrics

- 0 occurrences of “Duplicate item found … toolCallId” 400s in `/api/chat`.
- HITL skill checks still render, submit, and continue.
- Stored messages render correctly after reload with tool outputs intact.

## 8) Risks & Mitigations

- Dropping historical calls could affect replay: keep one call (earliest) and one result (latest/best) per ID.
- Over-pruning HITL parts: only dedup tool-call/result types; leave other parts untouched.
- Divergence between stored vs sent: sanitize before persistence using the same logic.

## 9) Open Questions

- Should we always drop older tool-call parts once any result exists for that ID, or keep one call + one result? (Default: drop older calls once a result exists.)
- Do we need a telemetry toggle for detailed dedup stats?

## 10) Proposed Implementation Outline

- Build cross-message index `{ toolCallId -> { calls: [], results: [] } }` with `msgIndex`/`partIndex`.
- Select survivors: earliest call; best/latest result (favoring presence of `output`/`result`).
- Mark all other tool-call/result parts for removal by index.
- Strip `id`/`providerId` from survivors.
- Filter messages after removals; drop empties.
- Use sanitized set both for persistence and for `convertToModelMessages`.
