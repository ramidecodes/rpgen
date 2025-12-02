# Feature Requirement Document - Interactive Skill Check (Human-in-the-Loop)

- **Feature Name**: Interactive Skill Check with Human-in-the-Loop (HITL)

- **Goal**: Implement a fully functional interactive skill check system that allows players to roll dice and provide input to the game master agent, following AI SDK v6 Human-in-the-Loop patterns. The system should replace the current "requestSkillCheck" badge with an interactive component that enables dice rolling and result submission.

- **User Story**: As a player, when the game master requests a skill check, I want to see an interactive dice component that I can click to roll a random number, so that I can actively participate in skill checks and see the results integrated into the narrative flow.

- **Current State Analysis**:

  - **Existing Components**:
    - `SkillCheckInteractive` component exists in `src/components/game/skill-check-interactive.tsx` with full UI implementation
    - `useGameChat` hook has `submitSkillCheckResult` function that calls `addToolOutput`
    - `ChatInterface` component has logic to detect and render skill check parts
    - `requestSkillCheckTool` is defined in `src/lib/ai/tools.ts` without an `execute` function (correct for HITL)
    - Type definitions exist in `src/types/skill-check.ts` for `SkillCheckToolPart`

  - **Current Problem**:
    - When the agent calls `requestSkillCheck` tool, only a badge showing "requestSkillCheck" is displayed
    - The interactive `SkillCheckInteractive` component is not being rendered
    - Tool parts may not be structured correctly for AI SDK v6 HITL pattern
    - The tool part may not have the correct `state: "input-available"` or `input` properties

  - **Root Cause Hypothesis**:
    - Tool parts from `streamText` may not be creating parts with the correct structure
    - The `isSkillCheckPart` type guard may not be correctly identifying tool parts
    - The tool part structure may not match what AI SDK v6 expects for HITL tools
    - The `createUIMessageStream` may not be properly handling tools without execute functions

- **Functional Requirements**:

  - **Tool Part Structure**:
    - When `requestSkillCheck` tool is called, it must create a tool part with:
      - `type`: Tool part type (e.g., "tool-requestSkillCheck" or similar)
      - `toolCallId`: Unique identifier for the tool call
      - `state`: Must be `"input-available"` to indicate HITL is required
      - `input`: Object containing:
        - `attribute`: The character attribute to check (e.g., "strength", "agility", "intelligence", "scholarship", "intuition")
        - `difficulty`: The difficulty class (DC) as a number (1-30)
        - `reason`: String explaining why the skill check is needed
      - Tool arguments should be accessible via the `input` property

  - **UI Rendering**:
    - When a message contains a tool part with `state: "input-available"` and tool name `"requestSkillCheck"`:
      - The `ChatInterface` component must detect it using `isSkillCheckPart` type guard
      - Render the `SkillCheckInteractive` component instead of a badge
      - Pass the following props to `SkillCheckInteractive`:
        - `attribute`: From `part.input.attribute`
        - `difficulty`: From `part.input.difficulty`
        - `reason`: From `part.input.reason`
        - `characterStat`: From `currentCharacter.stats[attribute]`
        - `toolCallId`: From `part.toolCallId`
        - `onSubmitRoll`: Function that calls `gameChat.submitSkillCheckResult(rollValue, toolCallId)`

  - **Dice Rolling Interaction**:
    - Player clicks the dice button or the D20 animation
    - Dice animation plays (using existing `D20Anime` component and animejs)
    - Random number between 1-20 is generated
    - Total is calculated: `rollValue + characterStat`
    - Success/failure is determined: `total >= difficulty`
    - Result is submitted via `addToolOutput` with the tool result structure

  - **Tool Result Submission**:
    - When player rolls dice, `submitSkillCheckResult` must:
      - Call `addToolOutput` from `useChat` hook with:
        - `tool`: "requestSkillCheck"
        - `toolCallId`: The tool call ID from the part
        - `output`: Object containing:
          - `rollValue`: The d20 roll result (1-20)
          - `statValue`: The character's stat value
          - `total`: `rollValue + statValue`
          - `success`: Boolean indicating if `total >= difficulty`
          - `attribute`: The attribute checked
          - `difficulty`: The DC
          - `message`: Human-readable result string
      - Clear the pending skill check from the game store
      - Trigger the agent to continue processing with the tool result

  - **State Management**:
    - `useGameStore` must track `pendingSkillCheck` to:
      - Disable input area when skill check is pending
      - Show warning message in input area
      - Prevent multiple skill checks from being active simultaneously
    - When skill check result is submitted, `pendingSkillCheck` must be cleared

  - **Message Flow**:
    - Agent calls `requestSkillCheck` tool → Tool part created with `state: "input-available"`
    - UI detects tool part → Renders `SkillCheckInteractive` component
    - Player rolls dice → Result calculated and submitted via `addToolOutput`
    - Agent receives tool result → Continues narrative based on success/failure
    - New assistant message streams in with the outcome

  - **Error Handling**:
    - If tool part is missing required `input` properties, show error message
    - If `characterStat` is undefined, handle gracefully (show "Unknown" or default)
    - If `addToolOutput` fails, show error and allow retry
    - If tool call ID doesn't match, prevent submission and show error

- **Technical Requirements**:

  - **AI SDK v6 HITL Pattern**:
    - Tool definition must NOT have an `execute` function (already correct)
    - Tool must be included in `tools` object passed to `streamText`
    - `streamText` must be called with `maxSteps` to allow multi-step reasoning
    - Tool calls without execute functions should automatically create parts with `state: "input-available"`

  - **API Route (`src/app/api/chat/route.ts`)**:
    - Must use `createUIMessageStream` for proper HITL support
    - Must pass tools to `streamText` including `requestSkillCheck` tool
    - Must handle tool results in the message stream
    - Tool parts should be properly serialized in message storage

  - **Type Safety**:
    - `SkillCheckToolPart` type must match AI SDK v6 tool part structure
    - `isSkillCheckPart` type guard must correctly identify skill check parts
    - Tool part must have proper typing for `input` and `state` properties

  - **Component Integration**:
    - `ChatInterface` must check `message.parts` array for tool parts
    - Must iterate through parts and check each one with `isSkillCheckPart`
    - Must render `SkillCheckInteractive` before the generic tool badge fallback
    - Order matters: skill check check must come before generic `isToolUIPart` check

  - **Hook Integration**:
    - `useGameChat` must use `useChat` from `@ai-sdk/react`
    - Must have access to `addToolOutput` function from `useChat`
    - Must monitor messages for skill check parts and update game store
    - `submitSkillCheckResult` must be properly typed and handle errors

- **Data Requirements**:

  - **No Database Schema Changes Required**
  - Tool calls and results are stored in the `messages` table as JSONB
  - Message structure must support:
    - Tool parts with `state: "input-available"`
    - Tool results with output data
    - Proper serialization of tool call IDs and arguments

- **User Flow**:

  1. Player performs an action that requires a skill check (e.g., "I try to pick the lock")
  2. Agent processes the action and determines a skill check is needed
  3. Agent calls `requestSkillCheck` tool with attribute, difficulty, and reason
  4. Tool part is created with `state: "input-available"` and `input` containing tool arguments
  5. UI detects the tool part in the assistant message
  6. `ChatInterface` renders `SkillCheckInteractive` component instead of badge
  7. Player sees:
     - Skill check card with attribute, DC, character stat, and reason
     - Interactive D20 dice component
     - "Roll d20" button
  8. Player clicks dice or button
  9. Dice animation plays (1.5 seconds)
  10. Random number (1-20) is generated
  11. Total is calculated: `rollValue + characterStat`
  12. Success/failure is determined: `total >= difficulty`
  13. Result is submitted via `addToolOutput`
  14. Input area is disabled during submission
  15. Agent receives tool result and continues narrative
  16. New assistant message streams in describing the outcome
  17. Skill check component disappears (replaced by narrative)
  18. Input area is re-enabled

- **Acceptance Criteria**:

  - When agent calls `requestSkillCheck` tool, `SkillCheckInteractive` component is rendered (not just a badge)
  - Tool part has correct structure with `state: "input-available"` and `input` property
  - Player can click dice or button to roll
  - Dice animation plays smoothly
  - Random number between 1-20 is generated
  - Total is calculated correctly: `rollValue + characterStat`
  - Success/failure is determined correctly: `total >= difficulty`
  - Tool result is submitted via `addToolOutput` with correct structure
  - Agent receives tool result and continues narrative
  - Input area is disabled when skill check is pending
  - Warning message shows in input area when skill check is pending
  - Multiple skill checks cannot be active simultaneously
  - Skill check component disappears after result is submitted
  - Narrative continues based on success/failure outcome
  - All tool parts are properly stored in database
  - Type safety is maintained throughout the flow

- **Edge Cases**:

  - **Missing Character Stat**: If `characterStat` is undefined, show "Unknown" or handle gracefully
  - **Invalid Tool Part Structure**: If tool part is missing `input` or `state`, show error message
  - **Tool Call ID Mismatch**: If `toolCallId` doesn't match pending check, prevent submission
  - **Network Error During Submission**: Show error and allow retry of dice roll submission
  - **Multiple Skill Checks**: Prevent multiple active skill checks, show error if attempted
  - **Rapid Clicks**: Prevent multiple dice rolls from being submitted simultaneously
  - **Agent Timeout**: If agent doesn't respond after tool result, show loading state
  - **Invalid Roll Values**: Ensure roll values are always between 1-20
  - **Missing Tool Arguments**: If `attribute`, `difficulty`, or `reason` are missing, show error
  - **Tool Part Not Detected**: If `isSkillCheckPart` fails to identify part, fallback to badge but log error

- **Non-Functional Requirements**:

  - **Performance**: Dice animation should complete in ~1.5 seconds
  - **UX**: Visual feedback should be immediate when dice is clicked
  - **Accessibility**: Dice button should be keyboard accessible and screen reader friendly
  - **Responsiveness**: Component should work on mobile and desktop
  - **Reliability**: Tool result submission should be retryable on failure
  - **Type Safety**: All types should be properly defined and checked

- **Implementation Steps**:

  1. **Verify Tool Part Structure**:
     - Add logging to inspect tool part structure when `requestSkillCheck` is called
     - Verify `state: "input-available"` is set correctly
     - Verify `input` property contains tool arguments
     - Verify `toolCallId` is present and unique

  2. **Fix Type Guard**:
     - Review `isSkillCheckPart` function in `src/types/skill-check.ts`
     - Ensure it correctly identifies tool parts with tool name "requestSkillCheck"
     - Verify it checks for `state: "input-available"`
     - Add type narrowing for `input` property

  3. **Fix Component Rendering Order**:
     - Ensure `ChatInterface` checks for skill check parts BEFORE generic tool parts
     - Verify the condition `isSkillCheckPart(part) && part.state === "input-available"` is correct
     - Ensure `input` properties are properly extracted and passed to component

  4. **Verify Tool Result Submission**:
     - Ensure `addToolOutput` is called with correct structure
     - Verify tool name matches: `"requestSkillCheck"`
     - Verify `toolCallId` matches the part's `toolCallId`
     - Verify output structure matches expected format

  5. **Test HITL Flow**:
     - Trigger a skill check in the game
     - Verify tool part structure in browser DevTools
     - Verify component renders correctly
     - Test dice roll and submission
     - Verify agent receives result and continues

  6. **Error Handling**:
     - Add error boundaries for missing data
     - Add user-friendly error messages
     - Add retry logic for failed submissions
     - Add logging for debugging

- **Dependencies**:

  - AI SDK v6 (`ai` package, beta version)
  - `@ai-sdk/react` for `useChat` hook
  - Existing `SkillCheckInteractive` component
  - Existing `D20Anime` component
  - Existing `useGameChat` hook
  - Existing game store (`useGameStore`)

- **References**:

  - [AI SDK v6 Human-in-the-Loop Documentation](https://v6.ai-sdk.dev/cookbook/next/human-in-the-loop#human-in-the-loop-with-nextjs)
  - AI SDK v6 Tool Parts API
  - Existing skill check implementation in codebase
  - Game Master Agent Integration feature

- **Open Questions**:

  - Should we support multiple simultaneous skill checks (probably not)?
  - Should we show roll history to the player?
  - Should we allow manual roll input (for testing/debugging)?
  - Should we add sound effects for dice rolling?
  - Should we show the roll result in the UI before submitting?

