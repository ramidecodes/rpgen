# Feature Requirement Document - Quest Logs and State Refactoring

- **Feature Name**: Quest Logs and Campaign State Refactoring

- **Goal**: Refactor the campaign state storage architecture by splitting the monolithic `state` JSONB column into separate, queryable structures. Create a dedicated `quests` table (following the pattern of `scenes` and `messages` tables) and separate JSONB columns for `relationships`, `activeFronts`, and `narrativeVectors`. Repurpose the `logEvent` tool to create quest-specific logs, and add new UI components for quest management and relationship visualization with D3.js.

- **User Story**: As a player, I want to see detailed logs for each quest showing my progress and relevant events, and I want to visualize the relationships between entities in my campaign world. As a developer, I want quests to be stored in a normalized table structure (consistent with scenes and messages) for better queryability, indexing, and maintainability.

- **Functional Requirements**:

  ## 1. Database Schema Refactoring

  - **Runs Table Changes**:

    - Split the `state` JSONB column into separate structures:
      - **New `quests` table**: Separate table with foreign key to `runs.id` (following pattern of `scenes` and `messages` tables)
      - `relationships` JSONB column: Knowledge graph structure (nodes and edges)
      - `activeFronts` JSONB column: Array of front objects
      - `narrativeVectors` JSONB column: Hope and chaos values
    - Remove the `state` column entirely (no backward compatibility needed - all old runs deleted)
    - Update Drizzle schema definition in `src/lib/db/schema.ts`
    - Generate migration using `pnpm db:generate`

  - **Quests Table Creation**:

    - Create new `quests` table in `src/lib/db/schema.ts`:
      - `id`: UUID primary key (auto-generated)
      - `runId`: UUID foreign key to `runs.id` with `onDelete: "cascade"`
      - `title`: varchar(200) - Quest title
      - `status`: varchar(20) with enum type `"active" | "completed" | "failed" | "dormant"` (default: "active")
      - `description`: text - Quest description
      - `clues`: JSONB array of strings - Observations and potential actions
      - `logs`: JSONB array of strings - Event logs related to this quest
      - `createdAt`: timestamp - Quest creation time
      - `updatedAt`: timestamp - Last update time
    - Add indexes:
      - `quests_run_id_idx` on `runId` (for efficient queries by run)
      - `quests_status_idx` on `status` (for filtering by status)
      - `quests_created_at_idx` on `createdAt` (for chronological ordering)
    - Follow the same pattern as `scenes` and `messages` tables (foreign key with cascade delete)

  - **Quest Schema Updates**:

    - Update `questThreadSchema` in `src/lib/db/schemas/campaign.ts`:
      - Keep for validation/type checking purposes
      - Fields: `id`, `title`, `status`, `description`, `clues`, `logs`
      - Status enum: `"active" | "completed" | "failed" | "dormant"`

  - **Type Definitions**:

    - Create `Quest` type from Drizzle schema inference
    - Update `CampaignState` type to remove `questThreads` (quests are now in separate table)
    - Create new `RunState` type or update existing to reflect separated structure
    - Update all TypeScript references throughout codebase

  ## 2. Tool Updates - Optimized Quest Management

  **Design Philosophy**: Following best practices for agent tool composition, we consolidate quest operations into fewer, more powerful tools to reduce cognitive load and improve performance. Research shows that fewer, well-designed tools perform better than many small tools.

  - **Consolidate Quest Tools** (Reduce from 3+ tools to 2 focused tools):

    - **`createQuest` Tool** (Create only):

      - Purpose: Create new quests when objectives emerge
      - Accept `title: string` (required)
      - Accept `description: string` (required)
      - Accept optional `type?: "main" | "side" | "mystery"` for categorization
      - Generate unique `id` using Drizzle `defaultRandom()`
      - Initialize `logs: []` and `clues: []` as empty arrays
      - Insert new quest record into `quests` table
      - Set `runId` from tool context
      - Set `status: "active"` by default
      - Return quest object with generated ID
      - Handle duplicate detection (check for existing quest with same title)

    - **`updateQuest` Tool** (Unified update - replaces `logEvent` and `updateQuestStatus`):
      - Purpose: Single tool for all quest updates (status, logs, clues)
      - Accept `questId: string` (required) - identifies which quest to update
      - Accept optional parameters (at least one required):
        - `status?: "active" | "completed" | "failed" | "dormant"` - Update quest status
        - `addLog?: string` - Append a new log entry to quest's logs array
        - `addClue?: string` - Append a new clue to quest's clues array
        - `logType?: string` - Optional type for log entry (e.g., "progress", "discovery", "failure")
        - `logImportance?: "low" | "medium" | "high" | "critical"` - Optional importance for log entry
      - Query quest from `quests` table by ID
      - Validate quest belongs to correct `runId` (from tool context)
      - Update quest record atomically (all provided fields in single UPDATE)
      - Format log entry: `[${logType || "general"}] ${addLog} (${logImportance || "medium"})` if `addLog` provided
      - Update `updatedAt` timestamp
      - Return success confirmation with updated quest details
      - Handle error cases: quest not found, invalid quest ID, invalid status transition
      - **Benefits**:
        - Single tool call can update status + add log + add clue simultaneously
        - Reduces tool count from 3+ to 1 for quest updates
        - Clearer intent: "update this quest" rather than separate "log event" and "change status"

  - **Remove General `logEvent` Tool**:

    - Remove the general-purpose `logEvent` tool (no longer needed)
    - All event logging now goes through quest-specific `updateQuest` tool
    - This eliminates ambiguity about where events should be logged
    - Simplifies agent decision-making (fewer tools to choose from)

  - **Update `manageRelationship` Tool**:

    - Write to `relationships` JSONB column instead of `state.knowledgeGraph`
    - Maintain same structure (nodes and edges arrays)
    - Update relationship logic to mutate in-memory state (like other JSONB column tools)
    - State will be persisted after agent execution

  - **Update Other State-Mutating Tools**:

    - `updateNarrativeVector`: Write to `narrativeVectors` column (unchanged)
    - `advanceFront`: Write to `activeFronts` column (unchanged)
    - Update `createGameMasterTools` factory function:
      - Change signature to accept `runId` parameter: `createGameMasterTools(state, runId)`
      - Pass `runId` to quest-related tools (`createQuest`, `updateQuest`) so they can query/update the `quests` table
      - Tools that work with JSONB columns continue to mutate in-memory state
      - Quest tools query/update database directly
    - All tools should work with separate columns/table instead of nested state object

  - **Tool Count Optimization**:

    - **Before**: 5+ tools for quest management (createQuest, logEvent, updateQuestStatus, potentially addClue, etc.)
    - **After**: 2 focused tools (createQuest, updateQuest)
    - **Result**: ~60% reduction in quest-related tools, improving agent performance
    - **Agent Tool Sets** (Strict Separation):
      - **GMA Tool Set** (Narration Only):
        - `requestSkillCheck` - HITL tool for player skill checks
        - **Total: 1 tool** (focused on fast, interactive narration)
      - **CMA Tool Set** (Complete State Management):
        - `updateNarrativeVector` - Narrative mood
        - `manageRelationship` - Knowledge graph
        - `advanceFront` - Plot threats
        - `createQuest` - New objectives
        - `updateQuest` - Quest lifecycle management
        - **Total: 5 tools** (all state mutations handled by CMA)

  ## 3. Agent Updates

  - **Campaign Manager Agent (CMA)**:

    - **Complete State Management Responsibility**: CMA handles ALL state mutations (quests, fronts, narrative vectors, relationships)
    - **Sole State Manager**: CMA is the ONLY agent with access to state-mutating tools
    - **Non-Blocking Background Processing**: CMA runs asynchronously after GMA responses, ensuring fast player interactions
    - **Performance Benefit**: By removing state tools from GMA, player interactions remain fast and responsive
    - Update system prompt to emphasize CMA's role as the sole state manager and that GMA does NOT modify state
    - Add instructions to:
      - Analyze GMA narration and player actions for state implications
      - Use `updateQuest` tool to log events, add clues, and update status in a single operation
      - When player actions relate to active quests, use `updateQuest` with `addLog` parameter
      - When quests are completed or failed, use `updateQuest` with `status` parameter (can combine with `addLog` for final entry)
      - When new information is discovered, use `updateQuest` with `addClue` parameter
      - Close quests (mark as `completed` or `failed`) when they are no longer relevant or reachable
      - Prefer single `updateQuest` calls that update multiple fields (status + log + clue) when appropriate
      - Query active quests from `quests` table to determine which quests to update
      - Manage all state components: quests, active fronts, narrative vectors, relationships
      - Do NOT produce narration or user-facing text (GMA handles that)
    - Update agent constructor to:
      - Query active quests from `quests` table when agent is created
      - Include active quest list in system prompt for context (title, description, current status)
      - Include all state information (fronts, vectors, relationships) for comprehensive state management
    - Update state access patterns to query `quests` table and access separate columns
    - Update `buildSystemPrompt` to include active quest context and tool usage examples
    - **Complete Tool Set** (all state-mutating tools):
      - `updateNarrativeVector` - Narrative mood management
      - `manageRelationship` - Knowledge graph management
      - `advanceFront` - Plot threat management
      - `createQuest` - Quest creation
      - `updateQuest` - Quest lifecycle management
    - Update `activeTools` array to include all state management tools
    - **No HITL Tools**: CMA does NOT have `requestSkillCheck` (GMA handles player interactions)

  - **Game Master Agent (GMA)**:

    - **Strict Separation of Concerns**: GMA focuses SOLELY on narration and player interaction
    - **NO State Management Tools**: GMA does NOT have access to ANY state-mutating tools
      - **NO** `createQuest`, `updateQuest` (quest management)
      - **NO** `updateNarrativeVector` (narrative vectors)
      - **NO** `advanceFront` (plot threats)
      - **NO** `manageRelationship` (knowledge graph)
    - **Tool Access**: GMA ONLY has access to:
      - `requestSkillCheck` - HITL tool for player skill checks (ONLY tool for interactive gameplay)
    - **Performance Optimization**: Removing all state tools from GMA ensures fast, non-blocking player interactions
    - Update agent constructor to:
      - Query active quests from `quests` table when agent is created (for READ-ONLY context only)
      - Include active quest list in system prompt for narrative context (read-only awareness)
      - Include state information (fronts, vectors, relationships) in prompt for narrative awareness (read-only)
      - Quest and state information is for narrative context only, NOT for modification
    - Update state access patterns to READ-ONLY access (for context in narration)
    - Update system prompt to:
      - Emphasize that GMA should NOT use state-mutating tools
      - Reference quests and state for narrative context only
      - Focus on immersive storytelling based on current state
      - Make clear that state management is handled by CMA
    - **Purpose**: GMA uses quest/state context to inform narration, but NEVER modifies state
    - **Performance Benefit**: By removing state-mutating tools, GMA can respond immediately to player actions
    - Update `activeTools` in `prepareStep` to ONLY include `requestSkillCheck` (no state tools ever)
    - Remove ALL state-mutating tools from GMA's tool set
    - **Rationale**:
      - Player interactions must be fast and responsive (streaming narration)
      - State management is handled asynchronously by CMA (non-blocking background processing)
      - Clear separation ensures GMA stays focused on storytelling without tool selection overhead

  - **Visual Engine Agent (VEA)**:

    - Update state access patterns if needed (likely minimal changes)

  ## 4. API and Actions Updates

  - **Run Actions**:

    - Update `createRun` in `src/app/actions/run.ts`:
      - Use `generateRunState` (renamed from `generateCampaignState`) to build initial run state without quests
      - Initialize new columns: `relationships: { nodes: [], edges: [] }`, `activeFronts: []`, `narrativeVectors: { hope: 0.5, chaos: 0.5 }`
      - Remove `state` column initialization
      - After creating run, insert initial quests from `generateInitialQuests` into `quests` table
    - Create new quest query functions in `src/lib/db/queries/quests.ts` (new file):
      - `getQuestsByRunId(runId: string): Promise<Quest[]>` - Get all quests for a run
      - `getActiveQuestsByRunId(runId: string): Promise<Quest[]>` - Get only active quests
      - `getQuestById(questId: string): Promise<Quest | null>` - Get single quest by ID
      - `createQuest(data: NewQuest): Promise<Quest>` - Insert new quest (used by tool)
      - `updateQuestStatus(questId: string, status: QuestStatus): Promise<Quest>` - Update quest status
      - `updateQuestLogs(questId: string, logs: string[]): Promise<Quest>` - Update quest logs array
    - Update all queries that read/write `run.state` to use new columns
    - Update type definitions for Run type (remove quests from Run type, query separately)

  - **Game Actions**:

    - Update `getRunStateAction` in `src/app/actions/game.ts`:
      - Return new structure with separate columns
      - Query quests separately from `quests` table
      - Combine columns and quests into a state-like object if needed for compatibility
    - Update `continueGame` to handle new column structure
    - Update state persistence logic to write to separate columns
    - Ensure quest queries are included when fetching run state

  - **Chat API Route**:

    - Update `src/app/api/chat/route.ts`:
      - **GMA Creation** (Fast, Non-Blocking):
        - Query active quests from `quests` table for READ-ONLY context (narrative awareness only)
        - Pass quests to GMA constructor for narrative context (read-only, no modification)
        - Create GMA with ONLY `requestSkillCheck` tool (NO state-mutating tools)
        - Do NOT pass `runId` to GMA (GMA doesn't need database access)
        - Do NOT pass state-mutating tools to GMA (strict separation)
        - GMA focuses on streaming narration response to player (fast, responsive)
        - GMA does NOT persist state (no state tools = no state changes)
      - **CMA Creation** (Background, Asynchronous):
        - Query active quests and all state information when creating CMA
        - Pass complete state context to CMA constructor
        - Create CMA with ALL state-mutating tools:
          - `createQuest`, `updateQuest` (quest management)
          - `updateNarrativeVector` (narrative vectors)
          - `advanceFront` (plot threats)
          - `manageRelationship` (knowledge graph)
        - Pass `runId` to `createGameMasterTools` for CMA so quest tools can access database
        - CMA runs asynchronously after GMA response (fire-and-forget pattern, non-blocking)
        - CMA persists all state changes (JSONB columns + quest updates)
      - Update state access patterns when creating agents (load from separate columns)
      - Update state persistence logic:
        - **GMA**: No state persistence (GMA never modifies state)
        - **CMA**: Persist JSONB columns (`relationships`, `activeFronts`, `narrativeVectors`) after CMA execution
        - Quest changes are persisted directly by CMA tools (no need to persist quests in main flow)
      - Update `hasStateChanged` logic:
        - **GMA**: No state change check needed (GMA never changes state)
        - **CMA**: Check state changes for JSONB columns (quests are persisted directly by tools)
      - Update `triggerBackgroundStateReconciliation` to query quests and pass to CMA
      - **Strict Enforcement**: Ensure GMA tool set excludes ALL state-mutating tools (only `requestSkillCheck`)

  ## 5. UI Components

  - **Update CampaignDetailsDialog**:

    - File: `src/components/game/campaign-details-dialog.tsx`
    - Remove quest threads and knowledge graph sections
    - Keep only:
      - Campaign info (name, description, genres)
      - Active Fronts (with doom clock visualization)
      - Narrative Vectors (hope and chaos bars)
    - Update to read from new column structure (`run.activeFronts`, `run.narrativeVectors`)

  - **Create QuestLogsDialog Component**:

    - File: `src/components/game/quest-logs-dialog.tsx` (new)
    - Accept `runId` as prop to query quests
    - Query quests from `quests` table using `getQuestsByRunId(runId)`
    - Display all quests for the run
    - Show quest details:
      - Title with status badge
      - Description
      - Clues discovered (array display)
      - Event logs (chronological list with timestamps if available)
      - Created/updated timestamps
    - Group quests by status (active, completed, failed, dormant)
    - Allow filtering by status
    - Allow search/filter by quest title
    - Display logs in chronological order (newest first or oldest first)
    - Show quest count summary
    - Use shadcn Dialog component for consistency
    - Handle loading and error states

  - **Create RelationshipsDialog Component**:

    - File: `src/components/game/relationships-dialog.tsx` (new)
    - Use D3.js to render knowledge graph visualization
    - Display nodes:
      - Different node types: NPCs, locations, items, events, factions, concepts
      - Visual distinction by node type (color, shape, or icon)
      - Node labels showing entity names
    - Display edges:
      - Relationship types as edge labels
      - Edge thickness or color based on relationship weight
      - Directional arrows showing relationship direction
    - Interactive features:
      - Zoom and pan functionality
      - Node selection on click
      - Hover to show node details (description, type)
      - Force-directed layout or hierarchical layout
    - Show relationship summary (node count, edge count)
    - Use shadcn Dialog component for consistency

  - **Update GamePlayClient**:

    - File: `src/app/runs/[id]/play/game-play-client.tsx`
    - Query quests separately using `getQuestsByRunId(run.id)` or pass quests as prop from page
    - Add "Quests" card in right sidebar:
      - Similar styling to Campaign card
      - Show active quest count: `quests.filter(q => q.status === "active").length`
      - Show total quest count: `quests.length`
      - Clickable to open QuestLogsDialog
    - Add "Relationships" card in right sidebar:
      - Show relationship count: `run.relationships.nodes.length` nodes, `run.relationships.edges.length` edges
      - Clickable to open RelationshipsDialog
    - Update Campaign card:
      - Show only fronts count and narrative vectors
      - Remove quest count (moved to Quests card)
    - Add state management for quest and relationship dialogs
    - Update all references from `run.state.*` to new column structure
    - Pass `runId` to QuestLogsDialog for quest queries

  ## 6. Dependencies

  - **Install D3.js**:

    - Add `d3` package: `pnpm add d3`
    - Add `@types/d3` package: `pnpm add -D @types/d3`
    - D3.js will be used for force-directed graph layout and SVG rendering

  ## 7. Data Migration

  - **Migration Strategy**:

    - Since all old runs have been deleted, no data migration needed
    - Simply update schema and generate migration using `pnpm db:generate`
    - Migration will:
      - Create new `quests` table with foreign key to `runs.id`
      - Add indexes on `runId`, `status`, and `createdAt`
      - Add new columns to `runs` table: `relationships`, `activeFronts`, `narrativeVectors`
      - Drop `state` column from `runs` table
      - Set default values for new columns on existing runs (if any remain)

- **User Flow**:

  1. **Player views campaign**:
     - Sees Campaign card showing fronts and narrative vectors
     - Sees Quests card showing active quest count
     - Sees Relationships card showing graph statistics
  2. **Player clicks Quests card**:
     - QuestLogsDialog opens showing all quests
     - Player can see quest details, clues, and event logs
     - Player can filter by status or search
  3. **Player clicks Relationships card**:
     - RelationshipsDialog opens with D3.js graph visualization
     - Player can interact with graph (zoom, pan, select nodes)
     - Player can see relationship details on hover/click
  4. **During gameplay**:
     - CMA logs events to relevant quests using `logEvent` with `questId`
     - Quest logs accumulate as story progresses
     - CMA closes quests when appropriate (completed/failed)
  5. **Player reviews quest progress**:
     - Opens Quests dialog to see all event logs for active quests
     - Can see which quests have been completed or failed

- **Acceptance Criteria**:

  - Database schema updated with `quests` table and separate columns for relationships, activeFronts, narrativeVectors
  - `quests` table created with proper foreign key, indexes, and cascade delete
  - `state` column removed from runs table
  - Migration generated and applied successfully
  - `createQuest` tool generates quest IDs and inserts into `quests` table
  - `updateQuest` tool handles all quest updates (status, logs, clues) in a single operation
  - `logEvent` tool removed (replaced by `updateQuest`)
  - Separate `updateQuestStatus` tool removed (replaced by `updateQuest`)
  - Quest queries work correctly (get by runId, filter by status)
  - All state-mutating tools work with new table/column structure
  - CMA can use `updateQuest` to log events, add clues, and close quests appropriately
  - GMA does NOT have access to quest tools (strict separation of concerns)
  - GMA only has `requestSkillCheck` tool (focused on fast narration)
  - CMA has all state-mutating tools (complete state management responsibility)
  - CMA prefers single `updateQuest` calls that update multiple fields when appropriate
  - GMA responses are fast and non-blocking (no state mutations)
  - CMA runs asynchronously in background (all state updates non-blocking)
  - CampaignDetailsDialog shows only campaign info, fronts, and vectors
  - QuestLogsDialog queries and displays all quests with logs, clues, and filtering
  - RelationshipsDialog displays interactive D3.js graph
  - GamePlayClient has Quests and Relationships cards in sidebar
  - All TypeScript references updated from `run.state.*` to new structure
  - No runtime errors when accessing campaign state or quests
  - Quest logs accumulate during gameplay
  - Quest status updates work correctly (active → completed/failed)
  - Cascade delete works correctly (deleting run deletes all quests)
  - Tool count reduced (5 tools for CMA instead of 6+)

- **Edge Cases**:

  - **Quest ID not found**: When logging to non-existent quest ID, return error (don't create quest automatically)
  - **Empty quests**: Handle gracefully in UI (show "No quests" message when query returns empty array)
  - **Run deletion**: Ensure cascade delete works (deleting run deletes all associated quests)
  - **Empty relationships**: Handle empty graph in D3.js visualization
  - **Large quest logs**: Consider pagination or virtualization for long log lists
  - **D3.js rendering errors**: Handle gracefully with fallback UI
  - **Concurrent quest updates**: Ensure atomic updates when multiple agents modify quests (use database transactions if needed)
  - **Invalid quest status**: Validate status transitions (e.g., can't mark completed quest as active)
  - **Quest query failures**: Handle database errors gracefully in UI components
  - **Missing runId**: Validate runId exists before querying quests

- **Technical Implementation Details**:

  - **Schema Update Location**: `src/lib/db/schema.ts` - Create `quests` table and update `runs` table definition
  - **Quest Schema Location**: `src/lib/db/schemas/campaign.ts` - Update `questThreadSchema` for validation (keep for type checking)
  - **Quest Queries Location**: `src/lib/db/queries/quests.ts` (new file) - Create query functions for quest operations
  - **Tool Updates Location**: `src/lib/ai/tools.ts` - Update all state-mutating tools:
    - Change `createGameMasterTools` signature to `createGameMasterTools(state: CampaignState, runId: string)`
    - Quest tools (`createQuest`, `updateQuest`) use `runId` to query/update database
    - Remove `logEvent` tool (replaced by `updateQuest`)
    - Remove separate `updateQuestStatus` tool (replaced by `updateQuest`)
    - `updateQuest` tool handles all quest updates (status, logs, clues) in a single operation
    - JSONB column tools (`updateNarrativeVector`, `advanceFront`, `manageRelationship`) continue to mutate in-memory state
  - **Agent Updates Location**: `src/agents/campaign-manager.ts`, `src/agents/game-master.ts`, `src/agents/visual-engine.ts`:
    - **GMA Updates**:
      - Query active quests for read-only context (narrative awareness)
      - Remove all state-mutating tools from GMA tool set
      - Keep only `requestSkillCheck` tool
      - Update system prompt to emphasize narration-only role
    - **CMA Updates**:
      - Query active quests and all state when creating CMA
      - Include complete state context in system prompts
      - Include all state-mutating tools (quests, fronts, vectors, relationships)
      - Pass `runId` to `createGameMasterTools` for CMA only
    - **VEA Updates**:
      - Minimal changes (likely no quest access needed)
  - **Campaign Generator Update**: `src/lib/ai/campaign-generator.ts`:
    - `generateRunState` returns run state (no quests embedded)
    - `generateInitialQuests` returns initial quest threads to seed the `quests` table
    - `questThreads` removed from returned `CampaignState`
  - **State Change Detection**:
    - JSONB columns: Continue using `hasStateChanged` with in-memory state comparison
    - Quests: Track quest changes separately or query quest table before/after agent execution
    - Consider adding `getQuestChanges(runId, beforeQuests, afterQuests)` utility
  - **Migration Generation**: Run `pnpm db:generate` after schema changes
  - **D3.js Integration**: Use React hooks (`useEffect`, `useRef`) for D3.js DOM manipulation in RelationshipsDialog
  - **Quest ID Generation**: Use Drizzle `defaultRandom()` in schema (auto-generated UUIDs)
  - **State Access Pattern**:
    - Update from `run.state.questThreads` → query `quests` table
    - Update from `run.state.knowledgeGraph` → `run.relationships`
    - Update from `run.state.activeFronts` → `run.activeFronts`
    - Update from `run.state.narrativeVectors` → `run.narrativeVectors`
  - **Database Operations**: Use Drizzle ORM for all quest operations (INSERT, UPDATE, SELECT via query functions)
  - **Foreign Key Pattern**: Follow same pattern as `scenes` table: `runId` with `onDelete: "cascade"`
  - **Tool Execution Pattern**:
    - Quest tools execute database operations directly (synchronous)
    - JSONB column tools mutate in-memory state (persisted after agent execution)
    - Both patterns work together - tools can call both types in same agent execution

- **Dependencies**:

  - Drizzle ORM (already in use)
  - Drizzle Kit for migrations (already in use)
  - D3.js library (needs to be installed)
  - React hooks for D3.js integration
  - Existing shadcn Dialog component
  - Existing campaign state schemas

- **Files to Create**:

  - `src/components/game/quest-logs-dialog.tsx` - New quest logs dialog component
  - `src/components/game/relationships-dialog.tsx` - New relationships graph dialog component
  - `src/lib/db/queries/quests.ts` - Quest query functions (required for tool and UI access)

- **Files to Modify**:

  - `src/lib/db/schema.ts` - Create `quests` table and update `runs` table schema
  - `src/lib/db/schemas/campaign.ts` - Update `questThreadSchema` and remove `questThreads` from `CampaignState`
  - `src/lib/db/queries/` - Create `quests.ts` file with query functions
  - `src/lib/ai/tools.ts` - Update all state-mutating tools:
    - Change `createGameMasterTools` signature to accept `runId`
    - Update `createQuest`, `updateQuest` to use database queries
    - Remove `logEvent` tool (replaced by `updateQuest`)
    - Remove separate `updateQuestStatus` tool (replaced by `updateQuest`)
    - Update other tools to work with JSONB columns
  - `src/lib/ai/campaign-generator.ts` - Modify to return quest data separately or create quests in DB
  - `src/agents/campaign-manager.ts` - Update to query quests and include in prompt, pass `runId` to tools, include all state tools
  - `src/agents/game-master.ts` - Update to query quests for read-only context, remove all state-mutating tools, keep only `requestSkillCheck`
  - `src/agents/visual-engine.ts` - Update state access if needed (likely minimal)
  - `src/app/actions/run.ts` - Update run creation to handle quest insertion
  - `src/app/actions/game.ts` - Update game state actions to query quests separately
  - `src/app/api/chat/route.ts` - Update state access, quest queries, and persistence logic
  - `src/components/game/campaign-details-dialog.tsx` - Simplify to show only fronts and vectors
  - `src/app/runs/[id]/play/game-play-client.tsx` - Add Quests and Relationships cards, query quests
  - `src/app/runs/[id]/play/page.tsx` - Query quests and pass to client component
  - `src/lib/utils/campaign-state-toasts.ts` - Update to work with new structure and detect quest changes
  - `package.json` - Add d3 and @types/d3 dependencies

- **Testing Requirements**:

  - Test database migration applies successfully
  - Test `quests` table creation with proper foreign key and indexes
  - Test quest creation with ID generation and database insertion
  - Test quest queries (get by runId, filter by status, get by ID)
  - Test `updateQuest` tool with various combinations:
    - Update status only
    - Add log only
    - Add clue only
    - Update status + add log simultaneously
    - Add log + add clue simultaneously
    - Update status + add log + add clue simultaneously
  - Test quest status updates with `updateQuest` tool (active → completed/failed)
  - Test that `logEvent` tool is removed and no longer available
  - Test cascade delete (deleting run deletes all quests)
  - Test `createGameMasterTools` accepts `runId` parameter
  - Test quest tools can access database with `runId`
  - Test JSONB column tools continue to mutate in-memory state
  - Test agents receive quest context in system prompts
  - Test state persistence works correctly (JSONB columns persisted, quests persisted by tools)
  - Test state change detection works for JSONB columns
  - Test quest change detection (if implemented)
  - Test initial quest creation in `createRun` (from `generateCampaignState`)
  - Test CampaignDetailsDialog shows correct data
  - Test QuestLogsDialog queries and displays quests and logs correctly
  - Test RelationshipsDialog renders D3.js graph correctly
  - Test graph interaction (zoom, pan, node selection)
  - Test GamePlayClient sidebar cards work correctly with quest queries
  - Test CMA can use `updateQuest` to log events, add clues, and close quests
  - Test GMA does NOT have access to quest tools (`createQuest`, `updateQuest`)
  - Test GMA only has `requestSkillCheck` tool available
  - Test CMA has all state-mutating tools available
  - Test that CMA prefers single `updateQuest` calls over multiple separate calls
  - Test strict separation: GMA cannot modify state, CMA handles all state mutations
  - Test all TypeScript types are correct (Quest type from schema)
  - Test no runtime errors when accessing state or querying quests
  - Test quest logs accumulate during gameplay
  - Test filtering and search in QuestLogsDialog
  - Test concurrent quest updates (atomicity)
  - Test error handling for invalid quest IDs
  - Test quest tools validate `runId` matches quest's `runId`

- **Migration Notes**:

  - Since all old runs have been deleted, migration is straightforward:
    1. Update schema in `src/lib/db/schema.ts`:
       - Create `quests` table definition with foreign key to `runs.id`
       - Add indexes on `runId`, `status`, and `createdAt`
       - Update `runs` table: add `relationships`, `activeFronts`, `narrativeVectors` columns
       - Remove `state` column from `runs` table
    2. Run `pnpm db:generate` to generate migration
    3. Review generated migration SQL:
       - Verify `quests` table creation
       - Verify foreign key constraint with cascade delete
       - Verify indexes are created
       - Verify `runs` table column changes
    4. Run `pnpm db:migrate` to apply migration
  - No data migration script needed (no existing quest data)
  - No backward compatibility concerns
  - Migration will create empty `quests` table ready for new quests

- **Key Architectural Decisions**:

  - **Hybrid State Management**:

    - JSONB columns (`relationships`, `activeFronts`, `narrativeVectors`) are mutated in-memory and persisted after agent execution
    - Quest operations query/update the database directly during tool execution
    - This hybrid approach allows quests to be queryable while maintaining efficient in-memory state mutations for other data

  - **Tool Context Pattern**:

    - `createGameMasterTools` now accepts `runId` parameter: `createGameMasterTools(state, runId)`
    - Quest tools use `runId` to access database
    - JSONB column tools continue to work with in-memory state
    - Both patterns work together in the same agent execution

  - **Quest Context for Agents**:

    - **GMA**: Queries active quests for READ-ONLY narrative context (awareness only, no modification)
    - **CMA**: Queries active quests for state management (full read/write access)
    - Active quests are included in system prompts for agent context
    - This ensures agents are aware of quests without storing them in state
    - GMA uses quest context to inform narration; CMA uses quest context to manage state

  - **State Change Detection**:

    - JSONB columns: Continue using `hasStateChanged` with in-memory state comparison
    - Quests: Changes are persisted directly by tools, so no separate change detection needed
    - Consider adding quest change tracking if needed for notifications/toasts

  - **Initial Quest Generation**:

- `generateRunState` returns run state; `generateInitialQuests` returns starter quests separately

  - Initial quests are inserted into `quests` table during `createRun`
  - This maintains the AI-generated initial quests while using the new table structure

  - **Strict Separation of Concerns (GMA vs CMA)**:
    - **GMA (Game Master Agent)**: Narration and player interaction only
      - **Tool Set**: Only `requestSkillCheck` (HITL tool for player skill checks)
      - **Purpose**: Fast, responsive narration without state mutation overhead
      - **Performance**: Minimal tool set = faster response times for player interactions
      - **State Access**: Read-only quest/state context for narrative awareness only
      - **No State Mutations**: GMA cannot modify quests, fronts, vectors, or relationships
      - **Benefits**:
        - Instant player responses (no state mutation delays)
        - Focused on storytelling and player engagement
        - Non-blocking for main game loop
    - **CMA (Campaign Manager Agent)**: Complete state management responsibility
      - **Tool Set**: All state-mutating tools (quests, fronts, vectors, relationships)
        - `updateNarrativeVector` - Narrative mood management
        - `manageRelationship` - Knowledge graph management
        - `advanceFront` - Plot threat management
        - `createQuest` - Quest creation
        - `updateQuest` - Quest lifecycle management
      - **Purpose**: Background state reconciliation and updates
      - **Performance**: Runs asynchronously, non-blocking for main game loop
      - **State Access**: Full read/write access to all state components
      - **Execution**: Fire-and-forget pattern after GMA responses
      - **Benefits**:
        - Thorough state processing without blocking player interaction
        - Can analyze full context before making state decisions
        - Handles all state complexity in background
    - **Clear Boundaries**:
      - GMA: "What should I narrate?" (narration decisions only)
      - CMA: "How should the world state change?" (all state mutations)
      - No overlap: GMA never mutates state, CMA never narrates
    - **Performance Impact**:
      - GMA responds instantly (1 tool, no state mutations)
      - CMA processes thoroughly in background (5 tools, complete state management)
      - Player experiences fast, dynamic interactions
