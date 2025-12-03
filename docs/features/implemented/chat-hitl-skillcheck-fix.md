# Feature Requirement Document - Chat HITL Skill Check Rendering Fix

- **Feature Name**: Chat HITL Skill Check Rendering Fix

- **Goal**: Ensure that assistant narration sent after a HITL `requestSkillCheck` (or other tools) is always rendered in the chat UI, even when AI SDK v6 places the narration in the `content` field while `parts` only contain non-text tool metadata.

- **User Story**: As a player, after I complete a skill check in the UI, I want to immediately see the Game Master's narrated response in the chat so that I understand the outcome and consequences of my roll without any messages silently disappearing.

- **Functional Requirements**:
  - Message interpretation:
    - The chat UI must support AI SDK v6 `UIMessage` structures that can contain:
      - `parts`: tool UI parts (e.g. `step-start`, `tool-requestSkillCheck`, `tool-result`, etc.).
      - `content`: markdown text representing the assistant's narration.
    - The UI must treat a `UIMessage` as containing user-visible narration if either:
      - At least one `text` part exists with non-empty text, or
      - The `content` field is a non-empty string.
  - Rendering behavior in `ChatInterface` (`src/components/game/chat-interface.tsx`):
    - For each assistant message:
      - Continue to render any `text` parts via `ReactMarkdown` as it does today.
      - Additionally, when there is **no** non-empty `text` part present:
        - Render `message.content` via `ReactMarkdown` if:
          - `"content" in message` is `true`.
          - `typeof message.content === "string"`.
          - `message.content.trim().length > 0`.
    - The fallback `content` rendering must work regardless of whether `message.parts` exists, to handle messages where:
      - `parts` only contain tool metadata, and
      - `content` holds the full narration string.
    - The logic must avoid double-rendering the same narration when both a `text` part and a string `content` exist (prefer the `text` part in that case).
  - Skill check HITL behavior:
    - Preserve the existing HITL flow:
      - `SkillCheckInteractive` should continue to render when a `requestSkillCheck` tool part with `state: "input-available"` is present.
      - The **Skill Check Result** card should continue to render when a `requestSkillCheck` tool part with `state: "output-available"` (or `"result"`) and a structured `output` object is present.
    - The new `content` rendering logic must not interfere with the layout, styling, or presence of the skill check cards.
    - After a skill check completes and the model sends a new narrated assistant message (with `parts` + `content`), that narration must appear in the same card as the skill check results or as a separate card below, according to existing design.
  - Tool visibility:
    - The UI must continue **not** to render internal tools such as `advanceFront`, `logEvent`, etc.; these should remain hidden while still being present in `parts` for state updates.
    - The updated rendering must still rely on `isToolUIPart` and `isSkillCheckPart` to determine which parts are user-facing.
  - Compatibility with persisted history:
    - Messages loaded from the database and converted back into `UIMessage[]` on `runs/[id]/play` must render identically to freshly streamed messages.
    - The fallback `content` rendering must work for both:
      - Messages coming directly from the `useChat` stream.
      - Messages reconstructed from JSONB in `PlayPage` (`src/app/runs/[id]/play/page.tsx`).

- **Data Requirements**:
  - No new database tables or columns are required.
  - Existing `messages` records already store:
    - `content`: string or array.
    - `parts`: serialized UI parts including tool metadata and HITL structures.
  - The feature relies on:
    - `PlayPage` correctly reconstructing `UIMessage` objects from stored JSONB by:
      - Mapping `contentData` into `message.content`.
      - Mapping `contentData.parts` into `message.parts`, with appropriate validation.
  - Any future changes to the message storage format must preserve:
    - Either a `text` part with the narration, or
    - A non-empty string `content` field.

- **User Flow**:
  1. Player is in an active run on `runs/[id]/play`, interacting with the Game Master through the chat.
  2. The assistant requests a skill check via a `requestSkillCheck` tool part (`state: "input-available"`); the UI renders the `SkillCheckInteractive` component.
  3. The player clicks to roll the die; `submitSkillCheckResult` sends `addToolOutput` plus a lightweight user message to `/api/chat`.
  4. The model processes the tool result and sends a new assistant message where:
     - `parts` contain tool metadata and/or internal tool calls.
     - `content` holds the full markdown narration describing the outcome (e.g. \"PrimeForge Sublevels – Hidden Workshop...\").
  5. `useChat` updates `gameChat.messages` with this assistant message.
  6. `ChatInterface`:
     - Renders any visible tool UI parts (e.g. skill check result card).
     - Detects that there is **no** non-empty `text` part.
     - Renders `message.content` via `ReactMarkdown` as the main narration bubble.
  7. The player reads the narrative outcome and continues entering actions.
  8. On page refresh, `PlayPage` reconstructs the same messages from the database; the narration and skill check results still appear as expected.

- **Acceptance Criteria**:
  - When reproducing the original bug scenario:
    - Trigger a skill check, roll, and wait for the GM response.
    - The assistant narration (including the \"Inventory Updated\" and \"What do you do?\" text) must appear in the chat UI.
  - Messages like the example in the bug report:
    - Where `parts` include `step-start` and `tool-requestSkillCheck` with `state: "output-available"` and `output`,
    - And the following assistant message has a long string in `content` but only non-text `parts`,
    - Must now render the full markdown text in the chat.
  - Existing behaviors remain intact:
    - Empty or whitespace-only user messages used as triggers are still filtered out of the visible chat.
    - Skill check input and result cards still render with the same styling and metadata (roll, stat, total, DC, outcome).
    - Internal tool calls remain hidden while still present in the history.
  - Reloading `runs/[id]/play` after a skill check:
    - Shows the same conversation, including:
      - The original skill check prompt.
      - The skill check result card.
      - The narrated follow-up message.
  - `pnpm lint` passes with no new errors or warnings on modified files (especially `chat-interface.tsx`).

- **Edge Cases**:
  - Assistant message has:
    - Both a non-empty `text` part and a non-empty string `content`:
      - The UI should prefer rendering the `text` part and avoid duplicate narration from `content`.
  - Assistant message has:
    - `parts` with only internal tools, and `content` is an empty or whitespace-only string:
      - No narration bubble should be rendered; only relevant visible tool UI (if any).
  - Assistant message has:
    - `parts` with one or more `text` parts and no `content` field:
      - Behavior remains unchanged; text parts render as today.
  - Malformed or unexpected message shapes:
    - If `parts` is non-array or includes invalid items, the UI should ignore invalid parts and still attempt to render any valid `text` parts or fallback `content` if available.

- **Non-Functional Requirements**:
  - **Robustness**: The rendering logic should tolerate mixed or partially-invalid message shapes without throwing runtime errors.
  - **Maintainability**: The code should clearly document why both `parts` and `content` are considered, referencing AI SDK v6 HITL patterns in comments where helpful.
  - **Backward Compatibility**: The fix must continue to support:
    - Older messages stored in legacy formats (string-only `content` or array `content`).
    - Newer AI SDK v6 message shapes with rich `parts` and optional `content`.

- **Dependencies**:
  - Existing chat and HITL implementation:
    - `src/hooks/use-game-chat.ts`
    - `src/components/game/chat-interface.tsx`
    - `src/app/api/chat/route.ts`
    - `src/app/runs/[id]/play/page.tsx`
  - Existing type definitions for skill checks:
    - `src/types/skill-check.ts`



