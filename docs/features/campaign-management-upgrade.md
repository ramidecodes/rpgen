# Feature Requirement Document - Campaign Management Upgrade

- **Feature Name**: Campaign Manager Agent (CMA) Fix & State Change Notifications

- **Goal**: Fix the Campaign Manager Agent to properly analyze Game Master Agent (GMA) narration, update campaign state asynchronously without blocking the game loop, ensure GMA focuses on narration without technical state details, and add toast notifications to inform players of significant campaign state changes.

- **User Story**: As a player, I want the campaign state to be automatically and accurately updated based on the story that unfolds, and I want to be notified when important changes occur (like fronts advancing, quests created, or hope/chaos shifting) so that I can stay aware of the evolving narrative without having to manually check the campaign dialog.

- **Functional Requirements**:

  ## 1. Campaign Manager Agent (CMA) Fixes

  - **Triggering**:

    - CMA should be triggered **after every assistant message** from GMA (not just when GMA state changes)
    - CMA should run **asynchronously** (fire-and-forget pattern) to avoid blocking the chat response
    - CMA should process the **latest assistant message text** from GMA narration

  - **Message Processing**:

    - CMA must properly extract **text content** from `UIMessage` parts (using `isTextUIPart` type guard)
    - CMA should analyze the **narrative text** from GMA responses, not technical tool results
    - CMA should receive the **full recent message context** (last 10-20 messages) for proper analysis
    - CMA should convert `UIMessage[]` to `CoreMessage[]` format correctly for the agent's `generate()` method

  - **State Analysis**:

    - CMA should analyze GMA narration text to identify:
      - Story developments that should advance fronts
      - Events that should update narrative vectors (hope/chaos)
      - New objectives that should become quest threads
      - Relationship changes that should update the knowledge graph
      - Significant events that should be logged
    - CMA should use **deterministic logic** to update state based on narrative analysis
    - CMA should **not produce narration** - only state mutations via tools

  - **State Persistence**:
    - CMA state changes must be **properly persisted** to the database
    - State comparison must use **deep copy** of original state before mutations
    - State updates should be atomic (single database update with all changes)

  ## 2. Game Master Agent (GMA) Cleanup

  - **System Prompt**:

    - Remove technical campaign state details from GMA system prompt
    - GMA should be aware of front doom clocks, quest thread counts, or knowledge graph statistics, but not announce it in it's replies.
    - GMA should focus on:
      - Narrative description and pacing
      - Character interactions
      - World description
      - Story consequences (described narratively, not technically)
    - GMA should **not** mention technical state in narration (e.g., "The doom clock advances" should be "Time is running out")

  - **Tool Usage**:
    - GMA can still use state-mutating tools, but should focus on narration
    - GMA should describe consequences narratively, not technically

  ## 3. Toast Notifications

  - **Component Setup**:

    - Add shadcn `sonner` toast component (or use existing toast pattern if available)
    - Set up toast provider in root layout
    - Create toast utility functions for campaign state changes

  - **Notification Triggers**:

    - Detect state changes after CMA execution:
      - **Fronts**: When a front advances (especially near doom or doom triggered)
      - **Quests**: When a new quest thread is created
      - **Narrative Vectors**: When hope or chaos changes significantly (delta > 0.1)
      - **Knowledge Graph**: When important relationships are added/updated (optional, less frequent)
    - Only show notifications for **meaningful changes** (not every minor update)

  - **Toast Content**:

    - **Front Advancements**:
      - "⚠️ [Front Name] advances! Doom clock: X/Y"
      - "🚨 [Front Name] has reached maximum doom!"
    - **Quest Creation**:
      - "📜 New quest: [Quest Title]"
    - **Narrative Vector Changes**:
      - "✨ Hope increases" / "💔 Hope decreases"
      - "🌪️ Chaos rises" / "🕊️ Chaos subsides"
    - Toast should be **non-intrusive** and auto-dismiss after 5-6 seconds

  - **Client-Side Integration**:
    - Toast notifications should be triggered from the client when campaign state updates are detected
    - Use SSE (Server-Sent Events) to detect state changes (check `src/lib/sse/connection-manager.ts`), or
    - Include state change metadata in chat response and trigger toasts client-side
    - Consider using a state comparison mechanism to detect changes

- **Data Requirements**:

  - **Message Format Conversion**:

    - Function to convert `UIMessage[]` to `CoreMessage[]` for CMA processing
    - Extract text from `TextUIPart` types only
    - Filter out tool parts, file parts, and other non-text content
    - Preserve message role (system, user, assistant)

  - **State Change Detection**:

    - Deep comparison function to detect state changes
    - Track which specific fields changed (fronts, quests, vectors, etc.)
    - Return structured change metadata for toast notifications

  - **Toast State** (if using client-side state):
    - Track last known campaign state in client
    - Compare on state updates to detect changes
    - Map changes to appropriate toast messages

- **User Flow**:

  1. **Player sends message** → GMA processes and responds with narration
  2. **GMA response streams** → Assistant message is persisted
  3. **CMA triggers asynchronously** (non-blocking):
     - Extracts text from latest GMA narration
     - Analyzes narrative for state implications
     - Calls appropriate tools to update state
     - Persists updated state to database
  4. **Client detects state change** (via polling, SSE, or response metadata):
     - Compares new state to previous state
     - Identifies meaningful changes
     - Shows appropriate toast notifications
  5. **Player sees toast** → Can click Campaign card to see full details

- **Acceptance Criteria**:

  - CMA is triggered after every GMA assistant message (not just when GMA state changes)
  - CMA runs asynchronously without blocking the chat response stream
  - CMA correctly extracts and analyzes text from GMA narration
  - CMA properly updates campaign state based on narrative analysis
  - State changes are persisted to the database correctly
  - GMA system prompt does not include technical state details
  - GMA narration does not mention technical state information
  - Toast notifications appear for significant state changes:
    - Front advancements (especially near/at doom)
    - New quest creation
    - Significant hope/chaos changes (>0.1 delta)
  - Toast notifications are non-intrusive and auto-dismiss
  - Campaign dialog shows updated state when opened
  - All changes work correctly after page refresh

- **Edge Cases**:

  - **CMA fails**: Should not block main game loop, errors should be logged
  - **No text in messages**: CMA should handle gracefully, skip processing if no text content
  - **Rapid state changes**: Toast notifications should queue/debounce to avoid spam
  - **State comparison fails**: Should default to showing all changes or none
  - **Toast component not available**: Should gracefully degrade (log to console in dev)
  - **Concurrent CMA runs**: Should prevent duplicate processing (use run-level lock or idempotency)

- **Technical Implementation Details**:

  - **CMA Trigger Location**: `src/app/api/chat/route.ts` - in `onFinish` callback
  - **CMA Execution**: Use fire-and-forget pattern with `.catch()` for error handling
  - **Message Conversion**: Create utility function `convertUIMessagesToCoreMessages()` in route.ts or utils
  - **State Comparison**: Use deep equality check (JSON.stringify or lodash isEqual)
  - **Toast Setup**: Add `Toaster` component to root layout, use `sonner` or shadcn toast
  - **State Change Detection**: Compare state before/after CMA execution, or use client-side polling
  - **GMA Prompt Update**: Modify `buildSystemPrompt()` in `src/agents/game-master.ts`

- **Dependencies**:

  - AI SDK v6 (already in use)
  - shadcn toast component (sonner) - may need to be added
  - Existing campaign state schema
  - Existing CMA and GMA agent implementations

- **Files to Modify**:

  - `src/app/api/chat/route.ts` - Fix CMA triggering and message processing
  - `src/agents/campaign-manager.ts` - Fix message extraction and state analysis
  - `src/agents/game-master.ts` - Remove technical details from system prompt
  - `src/app/runs/[id]/play/game-play-client.tsx` - Add toast notification logic
  - `src/app/layout.tsx` - Add toast provider (if needed)
  - Potentially: Add toast component if not exists

- **Testing Requirements**:

  - Test CMA triggers after every GMA message
  - Test CMA extracts text correctly from UIMessage parts
  - Test CMA updates state based on narrative analysis
  - Test state changes persist correctly
  - Test GMA does not include technical details in narration
  - Test toast notifications appear for relevant changes
  - Test async execution does not block chat responses
  - Test error handling when CMA fails
  - Test state updates are visible in campaign dialog
  - Test state persists after page refresh
