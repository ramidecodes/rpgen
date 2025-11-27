# Feature Requirement Document - Game Master Agent Integration

- **Feature Name**: Game Master Agent Integration

- **Goal**: Integrate AI SDK with OpenRouter to create a Game Master Agent (GMA) that interprets player actions, generates narrative responses, and manages campaign state. The GMA uses streaming LLM responses to provide real-time story updates.

- **User Story**: As a player, I want my actions to be interpreted by an AI Game Master that responds with dynamic narrative, so that the story adapts to my choices and creates a unique, immersive experience.

- **Functional Requirements**: 
  - Set up Vercel AI SDK (`ai` package) with OpenRouter provider:
    - Configure `createOpenRouter()` provider instance
    - Set up API key from environment variables
    - Configure default model selection (e.g., `anthropic/claude-3.5-sonnet`)
  - Create Game Master Agent abstraction in `src/agents/game-master/`:
    - `src/agents/game-master/index.ts` - Main GMA interface
    - `src/agents/game-master/prompts.ts` - System prompts and prompt templates
    - `src/agents/game-master/tools.ts` - Tool definitions for game state updates
  - Implement streaming LLM responses using **`streamText()`** from AI SDK:
    - Use `streamText()` function for narrative generation
    - Stream tokens to client via Server Actions or API routes
    - Handle streaming responses with proper error handling
  - Implement **Tool Calling** for game state updates:
    - Define tools using `tool()` function from AI SDK
    - Use Zod schemas to define tool input/output schemas
    - Tools for: `updateCampaignState`, `rollDice`, `updateFactionRelations`, `triggerEvent`
    - GMA can call tools to update game state while narrating
  - GMA capabilities:
    - Interpret player actions in context of current campaign state
    - Generate narrative responses that advance the story (via `streamText`)
    - Update campaign state via tool calls (dice rolls, state changes)
    - Maintain consistency with campaign universe, factions, and history
    - Incorporate character stats and abilities into narrative outcomes
    - Handle dice roll results and incorporate into narrative
  - Create server action in `src/app/actions/game-master.ts`:
    - `processPlayerActionAction` - Server action that:
      - Validates player action input with Zod
      - Loads campaign context from database
      - Calls `streamText()` with system prompt and tools
      - Streams response back to client
      - Updates campaign state after streaming completes
  - Implement prompt engineering for GMA:
    - System prompt with campaign context (universe, character, current state)
    - Action interpretation instructions
    - Narrative style guidelines
    - Consistency rules
    - Tool usage instructions
  - Create Zod schemas for:
    - Player action input validation
    - Tool input/output schemas
    - Campaign state updates
  - Handle GMA errors gracefully (API failures, rate limits, timeouts)
  - Support multiple LLM models via OpenRouter (configurable via environment variable)

- **Data Requirements**: 
  - **New Table**: `event_logs` (for tracking GMA interactions and narrative history)
    - `id`: UUID (primary key)
    - `campaign_id`: UUID (foreign key to campaigns.id)
    - `player_action`: TEXT (what the player did/said)
    - `gma_response`: TEXT (GMA narrative response)
    - `state_changes`: JSONB (what changed in campaign state)
    - `created_at`: TIMESTAMP (default: now())
  - **Updates to `campaigns` table**:
    - `current_narrative`: TEXT (latest story segment)
    - `last_action`: TEXT (last player action)
    - `last_response`: TEXT (last GMA response)
  - **Indexes**: 
    - Index on `campaign_id` for campaign history queries
    - Index on `created_at` for chronological ordering
  - **Relationships**: 
    - Many-to-one with campaigns

- **User Flow**: 
  1. Player is in active campaign with current narrative displayed
  2. Player types action in chat input
  3. Player submits action
  4. System sends action to GMA with campaign context:
     - Current narrative state
     - Character stats and abilities
     - Universe details (factions, locations, history)
     - Campaign elements (conflict, allies, enemies)
  5. GMA processes action and generates response
  6. Response streams to UI token-by-token (real-time display)
  7. GMA response completes
  8. System updates campaign state based on response
  9. System saves event log entry
  10. Updated narrative is displayed to player
  11. Player can take next action

- **Acceptance Criteria**: 
  - AI SDK is configured with OpenRouter successfully using `createOpenRouter()`
  - GMA uses `streamText()` for narrative generation
  - Tool calling is implemented with Zod schemas for state updates
  - GMA can process player actions with campaign context
  - Player actions are validated with Zod before processing
  - GMA generates coherent narrative responses
  - Responses stream to UI in real-time (token-by-token) via `streamText`
  - GMA can call tools to update game state (dice rolls, state changes)
  - Campaign state is updated after each interaction (via tools or post-processing)
  - Event logs are created for each GMA interaction
  - GMA maintains consistency with universe and campaign elements
  - Character stats influence narrative outcomes appropriately
  - Errors are handled gracefully with user-friendly messages
  - Multiple models can be selected via environment variable configuration
  - Streaming works reliably without interruption
  - Server actions properly handle streaming responses

- **Edge Cases**: 
  - GMA API timeout - should retry or show error message
  - GMA rate limit exceeded - should queue or show error
  - Invalid player action - should handle gracefully
  - GMA generates inappropriate content - should filter or regenerate
  - Streaming interruption - should resume or show partial response
  - Campaign state becomes inconsistent - should validate and correct
  - Very long player action - should truncate or handle appropriately
  - GMA response is too short/long - should have length guidelines

- **Non-Functional Requirements**: 
  - **Performance**: GMA response should start streaming within 2 seconds
  - **Quality**: Generated narrative should be coherent and engaging
  - **Reliability**: Should handle API failures gracefully with retries
  - **Cost**: Should optimize token usage to manage API costs
  - **Security**: API keys must be stored securely in environment variables
  - **Rate Limiting**: Should respect OpenRouter rate limits

- **Dependencies**: 
  - Base Next.js Implementation (base-implementation.md)
  - Campaign Generation (campaign-generation.md)
  - Note: Can be implemented with mock responses initially for testing game loop

