## Feature Requirement Document - Game Loader Animation

- **Feature Name**: Game Loader Animation for Game Master Responses

- **Goal**: Display a clear, immersive loader animation in the main chat area while the Game Master is thinking, so that players are never left staring at an empty card and always understand that the system is processing their action.

- **User Story**: As a player, I want to see a clear animated indicator when the Game Master is generating a response, so I know the game is working and I’m not stuck or waiting on a broken UI.

- **Functional Requirements**:

  - **Loader Triggering**:
    - The loader must appear in the main chat panel on the runs play page when the chat hook reports a loading state (`gameChat.isLoading === true`).
    - The loader should only be shown when there is no meaningful assistant message content yet (i.e., while the next response is pending, not during later streaming of already-present text).
    - The logic should use the existing `UIMessage[]` list to determine whether the last assistant message has non-empty content or text parts.
  - **UI Placement & Structure**:
    - The loader appears in the same column as assistant messages, aligned to the left, visually consistent with the chat bubble layout.
    - It must render inside a `Card` with padding and background (`bg-muted` or theme-consistent variant), so the content is never visually collapsed to an empty rectangle.
    - The loader consists of:
      - A dice-themed animated visual (reusing the existing `D20Anime` component).
      - A short status text such as “Game Master is thinking…” using muted foreground text styles.
  - **Visual Design & Animation**:
    - Use the existing `D20Anime` component from the hero section as the core animation for the loader, embedded at a reduced size appropriate for chat.
    - The loader must respect light/dark theme colors and Tailwind class ordering conventions already used in the app.
    - The loader must remain visually active for the full loading duration (looping animation).
  - **State Integration**:
    - The loader logic must integrate with `useGameChat` and the AI SDK v6 `useChat` state.
    - It must not interfere with:
      - Skill check HITL flows.
      - Input area loading/disabled state (which uses its own `Loader2` icon and disable logic).
  - **Error Handling & Fallbacks**:
    - If for any reason the animation component fails to mount, the loader card must still show at least the status text, avoiding a visually empty box.
    - The loader must never block or replace error messages; if an error is present, the error alert has priority.

- **Data Requirements**:

  - No new database tables or fields are required.
  - The feature relies solely on:
    - Existing `UIMessage[]` structures in the client.
    - Existing `useGameChat` hook state (`isLoading`, `messages`).

- **User Flow**:

  1. Player is on the run play page and sees the chat history and input area.
  2. Player submits an action via the input area.
  3. The client sends the message to `/api/chat` and `gameChat.isLoading` becomes `true`.
  4. The chat interface:
     - Checks the last assistant message for meaningful content.
     - Determines that there is no completed assistant reply yet.
     - Renders the loader card with the D20 animation and “Game Master is thinking…” text.
  5. The server streams back the assistant’s response.
  6. Once an assistant message with content appears in the UI, `isLoading` becomes `false`, and the loader is removed from the chat stream.
  7. Player immediately understands that the GM is processing during loading and sees the new narrative once it arrives.

- **Acceptance Criteria**:

  - When the Game Master is generating a response and no assistant content is yet visible, a loader card with:
    - A visible D20 animation.
    - A status text (e.g., “Game Master is thinking…”).
      appears in the main chat area.
  - The loader never renders as an empty or nearly invisible box:
    - Card has padding and width sufficient to clearly show its contents.
    - Text is legible in both light and dark themes.
  - The loader disappears as soon as the first assistant message with non-empty content is rendered.
  - Skill check prompts and results continue to work as before, with no visual or functional regressions.
  - The input area’s loading state (`Loader2` icon and disabled state) remains consistent and is not removed or double-updated by the new loader.
  - No additional database writes or reads are introduced for this feature.

- **Edge Cases**:

  - **Very fast responses**: If the model responds almost instantly, the loader may flash briefly or not at all; this is acceptable as long as it never gets stuck.
  - **Streaming with partial content**: If partial assistant content is present (e.g., streaming text), the loader should not continue to show on top of existing visible content.
  - **Empty assistant messages**: Assistant messages that contain only tool parts but no visible text should still allow the loader when a subsequent visible message is pending, based on the `hasMessageContent` rules.
  - **Network or server errors**: If an error occurs, the error alert must be shown and the loader must not obscure or replace it.

- **Non-Functional Requirements**:

  - **Performance**: The loader must not add noticeable latency to rendering; embedding `D20Anime` at a smaller size should not significantly impact frame rate in modern browsers.
  - **Reliability**: The loader behavior must be deterministic given `isLoading` and message content; no flickering or random disappearance while loading is active.
  - **Accessibility**:
    - The status text should clearly describe the loading state for screen readers.
    - Avoid rapid flashing effects that could be problematic for sensitive users (the existing D20 animation should remain smooth and non-strobing).

- **Dependencies**:
  - Existing chat infrastructure:
    - `useGameChat` hook (`src/hooks/use-game-chat.ts`).
    - Runs play page and chat interface (`src/app/runs/[id]/play/page.tsx`, `src/components/game/chat-interface.tsx`).
  - Existing D20 animation component:
    - `D20Anime` from `src/components/hero/d20-anime.tsx`.
  - Existing styling system:
    - Tailwind CSS and `shadcn/ui` card components.




