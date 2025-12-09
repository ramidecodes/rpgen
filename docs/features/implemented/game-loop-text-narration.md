# Feature Requirement Document - Game Loop Text Narration

- **Feature Name**: Game Loop Text Narration

- **Goal**: Implement the core gameplay loop where players read narrative text, input actions via chat, and see the story progress. This creates the interactive text-based RPG experience at the heart of the game.

- **User Story**: As a player, I want to read story segments and type actions to interact with the game world, so that I can play through my campaign and see the narrative unfold based on my choices.

- **Functional Requirements**:

  - Narrative display panel using shadcn/ui components:
    - `ScrollArea` component for scrollable narrative history
    - `Card` components for individual narrative entries
    - Display current story segment/narrative text
    - Show narrative history (conversation-like interface)
    - Format text for readability (proper line breaks, paragraphs)
    - Support markdown formatting using `react-markdown` or similar
  - Chat input interface using shadcn/ui and AI SDK:
    - Use `useChat` hook from `ai/react` for chat functionality
    - `Textarea` component for player action input
    - `Button` component for submit (or Enter key submission)
    - Clear/disable input while processing action (via `useChat` state)
    - Show loading state during GMA processing (via `useChat` isLoading state)
  - Action processing flow:
    - Capture player input via `useChat` hook
    - Validate input with Zod schema (not empty, reasonable length)
    - Convert UI messages to Core messages using `convertToCoreMessages` (AI SDK v5)
    - Send to server action `processPlayerActionAction` with campaign context
    - Server action uses AI SDK `streamText()` with OpenRouter provider (`nvidia/nemotron-nano-12b-v2-vl:free`) and `maxSteps: 5` to allow multi-step reasoning (Reason -> Act -> Narrate)
    - Stream response back to client via `useChat` hook
    - Display player action in narrative history immediately (optimistic update)
    - Stream GMA response in real-time via `useChat` messages
    - Handle intermediate tool steps (optionally hide/show "reasoning" steps based on UI preference)
    - Update narrative display with new response
    - Save updated campaign state after streaming completes
  - Narrative history management:
    - Use `useChat` messages array for conversation history
    - Display actions and responses in chronological order
    - Allow scrolling through history (shadcn/ui `ScrollArea`)
    - Load saved narrative when resuming campaign (populate `useChat` initial messages)
  - Campaign state persistence:
    - Save narrative state after each interaction (via server action)
    - Load saved narrative when resuming campaign (query database, populate `useChat`)
    - Track current narrative position in campaign state JSONB
  - UI layout using shadcn/ui components:
    - Narrative panel (large, scrollable `ScrollArea`)
    - Chat input (fixed at bottom using flexbox layout)
    - Campaign info sidebar (optional - shadcn/ui `Card` components)
  - Create server action `src/app/actions/game-master.ts`:
    - `processPlayerActionAction` - Server action that:
      - Validates input with Zod
      - Loads campaign context from database (Drizzle)
      - Calls GMA with `streamText()` and tools
      - Returns streaming response compatible with `useChat`
      - Updates campaign state after completion
  - Action context features:
    - Player can ask questions about context (handled by GMA)
    - Player can request clarification on previous events (handled by GMA)
    - Player can zoom in/out of environment description (handled by GMA)
    - GMA responds to contextual questions appropriately

- **Data Requirements**:

  - **Updates to `campaigns` table**:
    - `current_narrative`: TEXT (latest complete narrative segment)
    - `narrative_history`: JSONB (array of narrative entries for session)
    - `last_interaction_at`: TIMESTAMP (when last action was processed)
  - **Uses `event_logs` table** (from Game Master Agent Integration):
    - Stores each action-response pair
    - Maintains full campaign history
  - **Narrative Entry Structure** (stored in JSONB):
    - `type`: string ("player_action" or "gma_response")
    - `content`: string (the text)
    - `timestamp`: timestamp
    - `metadata`: object (optional context)

- **User Flow**:

  1. Player loads active campaign
  2. System displays current narrative segment (or starting narrative)
  3. Player reads the narrative
  4. Player types action in chat input (e.g., "I examine the door", "I talk to the guard")
  5. Player submits action (Enter key or button click)
  6. Input is disabled, loading indicator shows
  7. Player action appears in narrative history
  8. System sends action to Game Master Agent
  9. GMA response streams in real-time, appearing in narrative panel
  10. Response completes, input is re-enabled
  11. Campaign state is updated and saved
  12. Player can take next action
  13. Process repeats for each interaction
  14. Player can scroll through narrative history
  15. Player can ask contextual questions ("What did I see earlier?", "Describe this room")

- **Acceptance Criteria**:

  - Narrative text displays clearly and is readable (shadcn/ui components)
  - Chat input accepts and submits player actions (via `useChat` hook)
  - Player actions appear in narrative history immediately (optimistic updates)
  - GMA responses stream in real-time (token-by-token via `useChat` streaming)
  - Narrative history maintains chronological order (via `useChat` messages)
  - Campaign state saves after each interaction (via server action)
  - Saved campaigns resume with correct narrative state (load into `useChat`)
  - Input validation prevents empty submissions (Zod validation)
  - Loading states provide clear feedback (via `useChat` isLoading)
  - Contextual questions are handled appropriately (via GMA)
  - UI is responsive and works on different screen sizes (Tailwind responsive classes)
  - Narrative history can be scrolled through (shadcn/ui `ScrollArea`)
  - Text formatting (markdown) renders correctly
  - Server actions use Zod for validation before processing
  - Database operations use Drizzle ORM for state persistence

- **Edge Cases**:

  - Player submits empty action - should show validation error
  - Player submits very long action - should handle or truncate
  - Network error during action processing - should show error and allow retry
  - GMA streaming fails mid-response - should show partial response and error
  - Player tries to submit action while previous is processing - should prevent or queue
  - Narrative history becomes very long - should paginate or virtualize
  - Campaign state save fails - should retry and show error if persistent
  - Player closes browser mid-action - should save state gracefully

- **Non-Functional Requirements**:

  - **Performance**: Narrative display should update smoothly during streaming
  - **UX**: Input should feel responsive (< 100ms feedback)
  - **Accessibility**: Narrative text should be readable (proper contrast, font size)
  - **Responsiveness**: UI should work on mobile and desktop
  - **Reliability**: State should persist reliably across sessions

- **Dependencies**:
  - Base Next.js Implementation (base-implementation.md)
  - Campaign Generation (campaign-generation.md)
  - Game Master Agent Integration (game-master-agent-integration.md)
