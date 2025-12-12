# Feature Requirement Document - Visual Scene Generation

- **Feature Name**: Visual Scene Generation

- **Goal**: Generate and display visual scenes representing the current game environment using a background Visual Engine Agent that monitors narrative changes and generates images via Replicate when scenes dramatically change or the character moves to a different location.

- **User Story**: As a player, I want to see visual representations of the game environment that update automatically when the scene changes significantly, so that I can better visualize the story and feel more immersed in the campaign world.

- **Functional Requirements**:

  - **Visual Engine Agent** (`src/agents/visual-engine.ts`):

    - Background agent that monitors narrative changes from the Game Master Agent
    - Uses AI SDK v6 `ToolLoopAgent` pattern (similar to Campaign Manager Agent)
    - Uses BASE model from `src/lib/ai/provider.ts` (`x-ai/grok-4.1-fast`)
    - Reads new narrative descriptions from:
      - Latest assistant messages from the GM agent
      - `campaignState.currentContext` field
      - Recent message history for scene context
    - Decision-making tool: `shouldGenerateScene` - Analyzes narrative to determine if:
      - Scene has dramatically changed (location shift, major environmental change)
      - Character has moved to a different scene/location
      - Current scene image is no longer appropriate
    - Prompt generation tool: `generateImagePrompt` - Crafts detailed image generation prompts that include:
      - Character appearance (`character.properties.appearance`)
      - Universe visual description (`universe.visualDescription` if available)
      - Universe ontology (timeframe, magic level, physics, metaphysics, social structure)
      - Campaign genres (for style consistency)
      - Current scene description from narrative
      - Character name and profession for context
    - Image generation tool: `generateSceneImage` - Calls Replicate API to generate image
    - Runs asynchronously in the background after GM agent completes a turn
    - Does not produce user-facing text output (background processing only)

  - **Replicate API Integration** (`src/lib/image-generation/replicate.ts`):

    - Use existing Replicate client from `src/lib/ai/provider.ts` (`getReplicateClient()`)
    - Configure image generation model: `black-forest-labs/flux-schnell` (via `getImageModel("standard")`)
    - Create wrapper function `generateImage(prompt: string): Promise<string>` that:
      - Calls Replicate API with the crafted prompt
      - Handles API authentication via environment variables
      - Returns image URL from Replicate
      - Handles errors and retries appropriately

  - **Database Schemas**:

    - Create Zod schemas in `src/lib/db/schemas/scene.ts`:
      - `sceneTypeSchema`: enum(['environment']) - Only environment scenes for now
      - `createSceneSchema`: runId, sceneType, imageUrl, generationPrompt, narrativeContext, previousSceneId (for tracking scene transitions)
      - `updateSceneSchema`: imageUrl, metadata updates
    - Define Drizzle schema in `src/lib/db/schema.ts`:
      - `scenes` table with all required fields
      - Foreign key to `runs` (not campaigns, since scenes are per-run)
      - Proper indexes for run queries
      - `previous_scene_id` field to track scene transitions

  - **Scene Generation Flow**:

    - After GM agent completes a turn and updates campaign state:
      1. Visual Engine Agent is triggered (background process)
      2. Agent reads latest narrative from messages and `currentContext`
      3. Agent uses `shouldGenerateScene` tool to analyze if new scene needed
      4. If scene generation needed:
         - Agent uses `generateImagePrompt` tool to craft detailed prompt
         - Agent uses `generateSceneImage` tool to call Replicate API
         - Generated image is uploaded to R2 via storage integration
         - Scene record is created in database with metadata
         - `runs.current_scene_id` is updated to point to new scene
      5. If scene generation not needed, agent exits without action
    - Scene caching: Check database for existing scenes matching narrative context before generating
    - Store scene metadata (generation prompt, narrative context, timestamp) in database

  - **Scene Display** using shadcn/ui components:

    - Display current scene image in environment panel (shadcn/ui `Card` or custom component)
    - Show loading state while generating (shadcn/ui `Skeleton` component)
    - Handle image loading errors gracefully (shadcn/ui `Alert` component)
    - Display scene transition animations when scene changes

  - **Game UI Layout** (`src/app/runs/[id]/play/page.tsx`):

    The game interface uses a two-column layout optimized for immersive gameplay:

    - **Left Column - Chat Area**:

      - Full-height text chat interface using AI SDK v6 `useChat` hook
      - Displays conversation history between player and Game Master Agent
      - Input field for player actions at the bottom
      - Streaming responses from GM agent appear in real-time
      - Skill check prompts and dice roll results displayed inline
      - Uses shadcn/ui components: `Card`, `ScrollArea`, `Input`, `Button`
      - Responsive: Takes full width on mobile, ~60% width on desktop

    - **Right Column - Game Information Panel**:

      - Split into two sections vertically:

        - **Top Section - Scene Visualizer**:

          - Displays current scene image generated by Visual Engine Agent
          - Full-width image with aspect ratio maintained
          - Loading skeleton while scene is generating
          - Smooth fade transition when scene changes
          - Optional zoom/fullscreen functionality (shadcn/ui `Dialog`)
          - Scene metadata tooltip (generation timestamp, narrative context)
          - Uses shadcn/ui components: `Card`, `Skeleton`, `Image` (Next.js Image component)
          - Responsive: Full width on mobile, ~40% width on desktop

        - **Bottom Section - Campaign Details**:
          - Collapsible/expandable panels using shadcn/ui `Accordion` or `Tabs`
          - **Character Panel**:
            - Character name, profession, stats display
            - Character appearance description
            - Current inventory/equipment (if applicable)
            - Character image/portrait (if available)
          - **Campaign Panel**:
            - Active quests/quest threads
            - Narrative vectors (Hope/Chaos meters)
            - Active fronts (doom clocks)
            - Knowledge graph summary
            - Campaign metadata
          - **Universe Panel** (optional, collapsible):
            - Universe name and description
            - Current location information
            - Faction relationships
          - Uses shadcn/ui components: `Card`, `Accordion`, `Tabs`, `Progress`, `Badge`
          - Responsive: Stacks vertically on mobile, maintains side-by-side on desktop

    - **Layout Implementation**:

      - Uses CSS Grid or Flexbox for responsive two-column layout
      - Breakpoints: Mobile (< 768px) stacks vertically, Desktop (≥ 768px) side-by-side
      - Left column: `flex: 1` or `grid-column: 1` (takes available space)
      - Right column: `flex: 0 0 40%` or `grid-column: 2` (fixed width on desktop)
      - Right column split: Top section ~60% height, Bottom section ~40% height
      - Uses Tailwind CSS for responsive utilities
      - Maintains scrollable areas for each section independently

    - **Component Structure**:

      ```typescript
      // Layout structure
      <div className="flex flex-col md:flex-row h-screen">
        {/* Left: Chat Area */}
        <div className="flex-1 flex flex-col">
          <ChatInterface />
        </div>

        {/* Right: Game Info Panel */}
        <div className="flex flex-col w-full md:w-2/5">
          {/* Top: Scene Visualizer */}
          <SceneVisualizer />

          {/* Bottom: Campaign Details */}
          <CampaignDetailsPanels />
        </div>
      </div>
      ```

  - **Server Actions** in `src/app/actions/scenes.ts`:

    - `getCurrentSceneAction` - Fetch current scene for a run
      - Queries `runs.current_scene_id` to get active scene
      - Returns scene URL and metadata
    - `getRunScenesAction` - Fetch all scenes for a run (for history/gallery)
    - `triggerSceneGenerationAction` - Manually trigger Visual Engine Agent (for testing/debugging)

  - **Integration with Game Loop**:
    - Visual Engine Agent is triggered after GM agent completes a turn
    - Runs asynchronously in the background (does not block user interaction)
    - Updates are reflected in UI when scene generation completes
    - Scene generation status can be tracked via run state or separate status field

- **Data Requirements**:

  - **Drizzle Schema Definition** (`src/lib/db/schema.ts`):

    ```typescript
    export const scenes = pgTable(
      "scenes",
      {
        id: uuid("id").defaultRandom().primaryKey(),
        runId: uuid("run_id")
          .references(() => runs.id, { onDelete: "cascade" })
          .notNull(),
        sceneType: varchar("scene_type", { length: 20 }).notNull(), // 'environment'
        imageUrl: varchar("image_url", { length: 500 }).notNull(),
        generationPrompt: text("generation_prompt").notNull(),
        narrativeContext: text("narrative_context").notNull(),
        previousSceneId: uuid("previous_scene_id")
          .references(() => scenes.id)
          .nullable(), // Track scene transitions
        createdAt: timestamp("created_at").defaultNow().notNull(),
      },
      (table) => [
        index("scenes_run_id_idx").on(table.runId),
        index("scenes_created_at_idx").on(table.createdAt),
      ]
    );
    ```

  - **Update `runs` table** (via Drizzle schema):

    - `current_scene_id`: UUID (foreign key to scenes.id, nullable)

  - **Zod Validation Schema** (`src/lib/db/schemas/scene.ts`):

    ```typescript
    export const sceneTypeSchema = z.enum(["environment"]);

    export const createSceneSchema = z.object({
      runId: z.string().uuid(),
      sceneType: sceneTypeSchema,
      imageUrl: z.string().url(),
      generationPrompt: z.string().min(1),
      narrativeContext: z.string().min(1),
      previousSceneId: z.string().uuid().optional().nullable(),
    });

    export const updateSceneSchema = z.object({
      imageUrl: z.string().url().optional(),
    });
    ```

  - **Database Table**: `scenes`

    - `id`: UUID (primary key)
    - `run_id`: UUID (foreign key to runs.id, cascade delete)
    - `scene_type`: VARCHAR(20) (enum: 'environment')
    - `image_url`: VARCHAR(500) (URL to stored image in R2)
    - `generation_prompt`: TEXT (prompt used for generation)
    - `narrative_context`: TEXT (narrative description that triggered generation)
    - `previous_scene_id`: UUID (nullable, foreign key to scenes.id for tracking transitions)
    - `created_at`: TIMESTAMP (default: now())

  - **Indexes**:

    - Index on `run_id` for run scene queries
    - Index on `created_at` for chronological ordering

  - **Relationships**:

    - Many-to-one with runs (via Drizzle relations)
    - Self-referential relationship for scene transitions (previous_scene_id)

  - **Note**: Actual image files stored in Cloudflare R2 (see Storage Integration feature)

- **User Flow**:

  1. Player is in active campaign viewing narrative
  2. Player submits an action via chat
  3. Game Master Agent processes the action and generates narrative response
  4. Campaign state is updated (including `currentContext` if scene changed)
  5. Visual Engine Agent is triggered in the background:
     - Reads latest narrative from messages and `currentContext`
     - Analyzes if scene has dramatically changed or character moved locations
     - If new scene needed:
       - Crafts detailed image prompt including:
         - Character appearance and context
         - Universe visual style and ontology
         - Campaign genres
         - Current scene description
       - Generates image via Replicate API
       - Uploads image to R2
       - Creates scene record in database
       - Updates `runs.current_scene_id`
  6. Scene image is displayed/updated in environment panel
  7. Player continues playing with visual context

- **Acceptance Criteria**:

  - Visual Engine Agent runs in background after GM agent turns
  - Agent correctly identifies when scenes need regeneration (dramatic changes, location shifts)
  - Agent crafts high-quality image prompts that maintain character and universe consistency
  - Replicate API integration works correctly
  - Zod schemas validate all scene data (client and server-side)
  - Scene images are generated based on narrative descriptions
  - Generated images are appropriate for the genre, universe style, and context
  - Character appearance is consistently represented across scenes
  - Universe visual style is maintained across scenes
  - Scenes are displayed in the environment panel (shadcn/ui components)
  - Scene caching prevents unnecessary regeneration (database check before generation)
  - Loading states show during image generation (shadcn/ui `Skeleton`)
  - Image errors are handled gracefully (shadcn/ui `Alert`)
  - Scene metadata is stored correctly using Drizzle ORM
  - Scene updates trigger appropriately based on narrative changes
  - Generated images are stored in R2 successfully
  - Image URLs are accessible and display correctly
  - Background agent processing does not block user interactions
  - Agent uses BASE model from provider configuration

- **Edge Cases**:

  - Replicate API timeout - should retry or show error
  - Replicate API rate limit - should queue or show error
  - Generated image is inappropriate - should filter or regenerate
  - Image generation fails - should show placeholder or error
  - Narrative description is too vague - agent should use universe/character context to enhance prompt
  - Scene generation takes too long - should show progress or timeout
  - Image URL becomes invalid - should regenerate or handle gracefully
  - Multiple rapid scene changes - agent should debounce or queue generation
  - Agent fails to determine scene change - should have fallback logic
  - Character appearance not available - should still generate scene without character details
  - Universe visual description not available - should use ontology and genres for style

- **Non-Functional Requirements**:

  - **Performance**: Scene generation should complete in < 30 seconds
  - **Quality**: Generated images should be visually appropriate, coherent, and consistent with character/universe
  - **Cost**: Should optimize API calls to manage Replicate costs (only generate when necessary)
  - **Caching**: Should cache scenes effectively to reduce API calls
  - **Reliability**: Should handle API failures gracefully
  - **Background Processing**: Agent should not block user interactions or game flow
  - **Consistency**: Character appearance and universe style should be maintained across all generated scenes

- **Agent Architecture Details**:

  - **Visual Engine Agent Structure**:

    ```typescript
    // Similar pattern to Campaign Manager Agent
    export function createVisualEngineAgent(
      options: VisualEngineAgentOptions
    ): VisualEngineAgent {
      const openrouter = getOpenRouterClient();
      const model = openrouter.chat(getTextModel("base")); // BASE model

      const systemPrompt = buildSystemPrompt(options);
      const tools = createVisualEngineTools(options);

      const agent = new ToolLoopAgent({
        model,
        instructions: systemPrompt,
        tools,
        activeTools: [
          "shouldGenerateScene",
          "generateImagePrompt",
          "generateSceneImage",
        ],
        stopWhen: [stepCountIs(3)], // Limit tool cycles
      });

      return {
        getAgent: () => agent,
        // ... agent interface
      };
    }
    ```

  - **Agent Tools**:

    - `shouldGenerateScene`: Analyzes narrative and returns boolean decision with reasoning
    - `generateImagePrompt`: Crafts detailed image prompt with all context
    - `generateSceneImage`: Calls Replicate API and handles image upload

  - **Agent Context**:
    - Character: appearance, name, profession
    - Universe: visualDescription, ontology, genres
    - Campaign: genres, current state
    - Recent narrative: latest messages and currentContext
    - Previous scene: for comparison

- **Dependencies**:
  - Base Next.js Implementation (base-implementation.md)
  - Game Loop Text Narration (game-loop-text-narration.md)
  - Storage Integration R2 (storage-integration-r2.md) - for storing generated images
  - AI SDK v6 Agent Architecture (chat-agent-v6-refactor.md) - for agent pattern
  - Game Master Agent (game-master-agent-integration.md) - for narrative source
