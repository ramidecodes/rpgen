# Feature Requirement Document - GMA Chat Duplicates & Reasoning Leak Fix

## 1) Context & Goal

- **Problem**: The Game Master Agent (GMA) chat flow has two critical bugs:
  1. **Duplicate message persistence**: Messages are being written to the `messages` table multiple times, creating duplicate rows for the same conversation turn.
  2. **Reasoning leak**: When player responses are ambiguous, the GMA occasionally leaks its internal reasoning process (e.g., "What is 'nearest thread'? In context, perhaps...") into the user-visible narration instead of providing clean, immersive storytelling.

- **Root Cause Analysis**:
  - **Duplicates**: The `/api/chat` route persists messages from `incomingMessages` array which includes historical messages already stored in the database. Specifically:
    - `persistAssistantMessagesWithToolOutputs()` iterates through all `incomingMessages` and inserts assistant messages with tool outputs, even if they were already persisted in previous requests.
    - `persistAssistantMessage()` in `onFinish` inserts the final assistant message, which may duplicate messages already inserted earlier.
    - The client sends whitespace trigger messages (`" "`) after HITL tool outputs, and these are being persisted despite being intentionally filtered from the UI.
  - **Reasoning leak**: The GMA system prompt doesn't explicitly prohibit sharing internal reasoning or meta-analysis. When the model encounters ambiguous player input, it defaults to "thinking out loud" rather than making narrative assumptions and continuing the story.

- **Goal**: Fix both bugs by:
  1. Implementing a single source of truth for message persistence that only writes new messages (delta persistence).
  2. Strengthening the GMA system prompt to prevent any reasoning or meta-analysis from appearing in user-visible text.

## 2) Current Behavior (from code)

### Message Persistence Flow

- **`src/app/api/chat/route.ts`**:
  - Receives `incomingMessages` array from client (includes full conversation history).
  - Loads existing messages from DB (`existingMessages`).
  - Merges stored + incoming for model context (`processedMessages`).
  - **Bug**: Calls `persistAssistantMessagesWithToolOutputs(incomingMessages, run.id)` which iterates ALL incoming assistant messages and inserts any with tool outputs, even if already persisted.
  - **Bug**: In `onFinish`, calls `persistAssistantMessage()` which inserts the final assistant message, potentially duplicating what was already inserted.
  - **Bug**: Calls `persistMessage()` for user messages without checking if they're whitespace triggers or already persisted.

- **Client (`src/hooks/use-game-chat.ts`)**:
  - Uses `useChat` from `@ai-sdk/react` with `DefaultChatTransport`.
  - After HITL tool output submission, sends a whitespace trigger message (`sendMessage({ text: " " })`).
  - This trigger message is intentionally filtered from UI but still sent to API.

- **Message Storage**:
  - `messages` table stores `content` as JSONB (array of parts in AI SDK v6 format).
  - No unique constraint on `(runId, role, content)` or message ID deduplication.

### GMA System Prompt

- **`src/agents/game-master.ts`**:
  - System prompt instructs GMA to narrate and handle skill checks.
  - Mentions "focus on immersive storytelling" but doesn't explicitly prohibit reasoning or meta-analysis.
  - When player input is ambiguous, model may default to analyzing the ambiguity rather than making narrative assumptions.

## 3) Problem Statement

### Duplicate Messages

- **Symptom**: Multiple identical rows in `messages` table for the same conversation turn.
- **Impact**: 
  - Database bloat and unnecessary storage costs.
  - Potential confusion when querying message history.
  - May cause UI rendering issues if deduplication logic is incomplete.
- **Reproduction**: 
  1. Player submits a message.
  2. GMA responds with a skill check tool call.
  3. Player rolls dice, submits tool output.
  4. Client sends whitespace trigger + full message history.
  5. API persists assistant message with tool output (first insert).
  6. GMA generates final narration.
  7. API persists final assistant message in `onFinish` (second insert).
  8. Next request includes the same assistant message in `incomingMessages`, gets persisted again (third insert).

### Reasoning Leak

- **Symptom**: GMA responses contain meta-analysis like:
  ```
  "Player action: 'I gather my equipment and search for the nearest thread'
  What is 'nearest thread'? In context, perhaps 'thread' refers to a trail...
  Likely 'thread' means trail or path...
  Action: Gather equipment (probably straightforward, no check)...
  "
  ```
- **Impact**:
  - Breaks immersion and narrative flow.
  - Exposes game mechanics and decision-making process.
  - Makes the GM feel like a confused AI rather than a confident storyteller.
- **Reproduction**:
  1. Player sends ambiguous or unclear action.
  2. GMA receives input and attempts to interpret it.
  3. Model defaults to reasoning about the ambiguity.
  - This reasoning appears in the text response instead of being suppressed.

## 4) Requirements

### Functional Requirements

#### FR-1: Single Source of Truth for Message Persistence

1. **Delta-only persistence**:
   - Only persist messages that are **new** (not already in the database).
   - Determine "new" by comparing message content/parts, not by checking IDs (since client may not send stable IDs).
   - For user messages: Only persist if:
     - It's a meaningful message (non-empty text parts, not whitespace-only).
     - It doesn't match the most recent user message in the database (by content comparison).
   - For assistant messages: Only persist once per conversation turn:
     - In `onFinish`, persist the final assistant message from `result.messages`.
     - Do NOT persist assistant messages from `incomingMessages` array (they're historical context only).
     - Exception: If an assistant message has HITL tool outputs that need to be persisted, update the existing assistant message row instead of inserting a new one.

2. **HITL tool output handling**:
   - When an assistant message with tool outputs arrives in `incomingMessages`:
     - Check if a matching assistant message already exists in DB (by comparing tool call IDs).
     - If exists: Update the existing row's `content` to include the tool output parts.
     - If not exists: Insert new row (this should be rare, only for messages that weren't persisted in `onFinish`).
   - Use `db.update()` with `eq()` condition instead of `db.insert()` for tool output updates.

3. **Whitespace trigger filtering**:
   - Never persist user messages that are whitespace-only (`" "` or empty after trim).
   - Filter these messages before any persistence logic.
   - Log when a trigger message is filtered (for debugging).

#### FR-2: GMA Reasoning Suppression

1. **Enhanced system prompt**:
   - Add explicit prohibition: "NEVER share your internal reasoning, analysis, or uncertainty. NEVER ask clarifying questions or analyze ambiguous player input out loud."
   - Add instruction: "When player input is unclear, make reasonable narrative assumptions based on context and continue the story. Do NOT explain your interpretation process."
   - Add example: "BAD: 'What is 'nearest thread'? In context, perhaps...' GOOD: 'You gather your equipment and begin searching for the nearest trail, your keen eyes scanning the undergrowth...'"
   - Emphasize: "You are a confident storyteller, not an uncertain assistant. Always narrate as if you understand the player's intent perfectly."

2. **Message sanitization (defense in depth)**:
   - Before persisting assistant messages, check for reasoning patterns:
     - Lines starting with "Player action:", "What is", "In context", "Likely", "Perhaps", "Assume", "Decide:".
     - Meta-analysis phrases like "probably straightforward", "might need", "to be consistent".
   - If detected, log a warning but don't automatically strip (let prompt handle it primarily).
   - Consider adding a post-processing step that removes reasoning blocks if they slip through (optional, for robustness).

#### FR-3: Simplified Persistence Flow

1. **Remove redundant persistence functions**:
   - Remove `persistAssistantMessagesWithToolOutputs()` function entirely.
   - Consolidate all persistence logic into `onFinish` callback.
   - Only persist:
     - User message (if meaningful and new).
     - Final assistant message (from `result.messages`).

2. **Message comparison logic**:
   - Create helper function `isMessageDuplicate(runId, message)`:
     - Query most recent message of same role from DB.
     - Compare `content` JSONB (deep equality check).
     - Return `true` if duplicate, `false` if new.
   - Use this helper before any `persistMessage()` call.

### Non-Functional Requirements

- **No schema changes**: Fix must work with existing `messages` table structure.
- **Backward compatible**: Existing messages in DB must continue to render correctly.
- **Performance**: Message comparison should be efficient (only check most recent message, not full history).
- **Maintainability**: Code should be clear about single source of truth (persist only in `onFinish`).
- **Logging**: Add structured logs for:
  - When messages are skipped as duplicates.
  - When whitespace triggers are filtered.
  - When reasoning patterns are detected (for monitoring).

## 5) User Flow

### Fixed Flow (No Duplicates)

1. Player sends message: "I gather my equipment and search for the nearest thread"
2. Client `useChat` sends to `/api/chat` with `incomingMessages` (full history).
3. API loads existing messages from DB, merges with incoming for context.
4. GMA generates response with skill check tool call.
5. **API does NOT persist anything yet** (no `persistAssistantMessagesWithToolOutputs` call).
6. Stream completes, `onFinish` callback fires.
7. **API persists only**:
   - User message (if meaningful and not duplicate).
   - Final assistant message from `result.messages`.
8. Player rolls dice, submits tool output.
9. Client sends tool output + whitespace trigger + full history.
10. API processes tool output, GMA generates final narration.
11. **API persists only**:
    - Final assistant message from `result.messages` (with tool output included).
    - Whitespace trigger is filtered out (not persisted).
12. No duplicates created.

### Fixed Flow (No Reasoning Leak)

1. Player sends ambiguous message: "I gather my equipment and search for the nearest thread"
2. GMA receives input, recognizes ambiguity.
3. **GMA makes narrative assumption** (based on context: shadow prey, tracking, glades).
4. **GMA narrates confidently**: "You gather your equipment and begin searching for the nearest trail, your keen eyes scanning the undergrowth for signs of the shadow prey's passage..."
5. No reasoning or meta-analysis appears in response.

## 6) Acceptance Criteria

### Duplicate Messages Fix

- **AC-1**: After a complete conversation turn (user message → GMA response → skill check → tool output → final narration), exactly **one** user message row and **one** assistant message row exist in `messages` table for that turn.
- **AC-2**: Querying `messages` table for a run shows no duplicate rows (same `role`, same `content` JSONB, within 1 second of each other).
- **AC-3**: Whitespace trigger messages (`" "`) are never persisted to the database.
- **AC-4**: HITL tool outputs update existing assistant message rows instead of creating new ones.
- **AC-5**: Page reload shows correct message history without duplicates.

### Reasoning Leak Fix

- **AC-6**: GMA responses never contain phrases like:
  - "What is [ambiguous term]?"
  - "In context, perhaps..."
  - "Likely [term] means..."
  - "Action: [analysis]"
  - "Probably straightforward, no check"
  - "To be consistent..."
  - "Decide: [reasoning]"
- **AC-7**: When player input is ambiguous, GMA makes reasonable narrative assumptions and continues the story without explaining the assumption process.
- **AC-8**: GMA responses maintain immersive, confident storytelling tone even with unclear player input.
- **AC-9**: No meta-analysis or reasoning blocks appear in chat UI.

### Code Quality

- **AC-10**: `pnpm check` passes with no linting or formatting errors.
- **AC-11**: All persistence logic is consolidated in `onFinish` callback (no redundant persistence functions).
- **AC-12**: Code includes clear comments explaining the single source of truth approach.

## 7) Edge Cases

### Duplicate Prevention

- **EC-1**: Two identical user messages sent rapidly (within same second):
  - Should persist only the first one.
  - Comparison should use content, not timestamp.

- **EC-2**: Assistant message with tool outputs arrives before `onFinish`:
  - Should NOT persist early (wait for `onFinish`).
  - Tool outputs will be included in final message from `result.messages`.

- **EC-3**: Network retry causes duplicate API requests:
  - Message comparison should prevent duplicate inserts.
  - Consider adding idempotency key (optional, not required for this fix).

- **EC-4**: HITL tool output arrives for a message that wasn't persisted yet:
  - Should persist the message with tool output included.
  - This is rare but should be handled gracefully.

### Reasoning Suppression

- **EC-5**: Player explicitly asks "What did you mean by X?":
  - GMA should still NOT explain reasoning.
  - Instead, GMA should clarify in-character: "You recall seeing [contextual detail] earlier..."

- **EC-6**: Model generates reasoning despite prompt:
  - Log warning for monitoring.
  - Consider post-processing sanitization (optional, defense in depth).

- **EC-7**: Ambiguous input with no clear context:
  - GMA should make the most reasonable assumption based on campaign/universe context.
  - Narrate confidently without meta-analysis.

## 8) Out of Scope

- **Schema changes**: No new columns, indexes, or constraints on `messages` table.
- **UI changes**: Chat interface rendering logic remains unchanged.
- **Client-side changes**: Client continues to send full message history (this is expected for AI SDK v6).
- **Message deduplication in UI**: UI-level deduplication (already handled) is separate from persistence deduplication.
- **Advanced idempotency**: No request-level idempotency keys or distributed locking (simple content comparison is sufficient).

## 9) Success Metrics

- **SM-1**: Zero duplicate message rows created after fix deployment (measured via DB query).
- **SM-2**: Zero reasoning leaks in GMA responses (manual review of ambiguous input scenarios).
- **SM-3**: All existing functionality preserved (skill checks, HITL flows, message history).
- **SM-4**: No performance degradation (message comparison is O(1) per request).

## 10) Risks & Mitigations

### Risk 1: Over-filtering legitimate messages

- **Risk**: Message comparison logic might incorrectly identify legitimate new messages as duplicates.
- **Mitigation**: 
  - Use deep equality check on `content` JSONB (not just string comparison).
  - Only compare against most recent message of same role (not full history).
  - Log all skipped messages for monitoring.

### Risk 2: Tool outputs lost if message not persisted

- **Risk**: If assistant message isn't persisted in `onFinish`, tool outputs might be lost.
- **Mitigation**:
  - Ensure `onFinish` always persists final assistant message.
  - If tool outputs arrive before `onFinish`, they'll be included in `result.messages` anyway.

### Risk 3: Prompt changes insufficient

- **Risk**: Enhanced prompt might not fully prevent reasoning leaks.
- **Mitigation**:
  - Use explicit examples of BAD vs GOOD responses.
  - Add defense-in-depth logging to detect reasoning patterns.
  - Consider post-processing sanitization if needed (optional).

### Risk 4: Breaking existing message history

- **Risk**: Changes to persistence logic might affect rendering of existing messages.
- **Mitigation**:
  - No changes to message storage format.
  - Existing messages continue to render as before.
  - Only change is preventing new duplicates.

## 11) Open Questions

- **Q1**: Should we add a post-processing sanitization step to strip reasoning patterns if they slip through? (Recommendation: Start with prompt-only, add sanitization if needed based on monitoring.)
- **Q2**: Should we log reasoning pattern detections to a monitoring service? (Recommendation: Yes, log warnings for visibility.)
- **Q3**: Should message comparison use a time window (e.g., "duplicate if same content within 5 seconds")? (Recommendation: No, use content-only comparison for simplicity.)

## 12) Proposed Implementation Outline

### Step 1: Remove Redundant Persistence

- Delete `persistAssistantMessagesWithToolOutputs()` function.
- Remove call to `persistAssistantMessagesWithToolOutputs()` from main handler.

### Step 2: Implement Message Comparison Helper

- Create `isMessageDuplicate(runId: string, message: UIMessage): Promise<boolean>`:
  - Query most recent message of same role from DB.
  - Deep compare `content` JSONB.
  - Return `true` if duplicate.

### Step 3: Update `onFinish` Persistence Logic

- Check if user message is meaningful (non-empty, not whitespace).
- Check if user message is duplicate using helper.
- Persist user message only if meaningful and new.
- Persist final assistant message from `result.messages` (always persist, as it's the single source of truth).

### Step 4: Enhance GMA System Prompt

- Add explicit prohibition of reasoning/meta-analysis.
- Add examples of BAD vs GOOD responses.
- Emphasize confident storytelling.

### Step 5: Add Logging

- Log when messages are skipped as duplicates.
- Log when whitespace triggers are filtered.
- Log when reasoning patterns are detected (optional, for monitoring).

### Step 6: Testing

- Test duplicate prevention with rapid messages.
- Test reasoning suppression with ambiguous input.
- Test HITL flows still work correctly.
- Test page reload shows correct history.

## 13) Dependencies

- **Existing code**:
  - `src/app/api/chat/route.ts` (main handler)
  - `src/agents/game-master.ts` (GMA system prompt)
  - `src/hooks/use-game-chat.ts` (client chat hook)
  - `src/lib/db/schema.ts` (messages table)
- **No new dependencies**: Fix uses existing Drizzle ORM and AI SDK v6 APIs.

## 14) Testing Strategy

### Unit Tests (if test suite exists)

- Test `isMessageDuplicate()` helper with various message shapes.
- Test whitespace trigger filtering logic.
- Test reasoning pattern detection (if implemented).

### Manual Testing

1. **Duplicate prevention**:
   - Send message, complete turn, check DB for duplicates.
   - Send rapid duplicate messages, verify only one persisted.
   - Submit skill check, verify no duplicate assistant messages.

2. **Reasoning suppression**:
   - Send ambiguous messages (e.g., "I search for the thread").
   - Verify GMA responds with confident narration, no reasoning.
   - Test various ambiguous scenarios.

3. **HITL flows**:
   - Complete skill check flow, verify messages persist correctly.
   - Verify tool outputs appear in assistant messages.
   - Verify page reload shows correct history.

4. **Edge cases**:
   - Whitespace triggers filtered correctly.
   - Network retries don't create duplicates.
   - Existing message history renders correctly.

