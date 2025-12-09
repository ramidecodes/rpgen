# Feature Requirement Document - Visual Scene Generation

- **Feature Name**: Visual Scene Generation

- **Goal**: Generate and display visual scenes representing the current game environment using Replicate image generation. Scenes update based on narrative changes and can zoom to character portraits during conversations.

- **User Story**: As a player, I want to see visual representations of the game environment and characters, so that I can better visualize the story and feel more immersed in the campaign world.

- **Functional Requirements**:

  - Replicate API integration in `src/lib/image-generation/replicate.ts`:
    - Set up Replicate client using `@replicate/client` or fetch API
    - Configure image generation model: `black-forest-labs/flux-schnell`
    - Handle API authentication via environment variables
    - Create wrapper functions for image generation
  - Create Zod schemas in `src/lib/db/schemas/scene.ts`:
    - `sceneTypeSchema`: enum(['environment', 'portrait'])
    - `createSceneSchema`: campaignId, sceneType, imageUrl, generationPrompt, narrativeContext
    - `updateSceneSchema`: imageUrl, metadata updates
  - Define Drizzle schema in `src/lib/db/schema.ts`:
    - `scenes` table with all required fields
    - Foreign key to campaigns
    - Proper indexes for campaign queries
  - Scene generation:
    - Generate scene image based on environment description from narrative
    - Generate scene when environment changes significantly
    - Generate character portrait when engaging in conversation
    - Use narrative context to create appropriate prompts
    - Store generated images in R2 via storage integration
  - Scene display using shadcn/ui components:
    - Display current scene image in environment panel (shadcn/ui `Card` or custom component)
    - Support zoom functionality for character portraits (shadcn/ui `Dialog` or custom modal)
    - Show loading state while generating (shadcn/ui `Skeleton` component)
    - Handle image loading errors gracefully (shadcn/ui `Alert` component)
  - Create server actions in `src/app/actions/scenes.ts`:
    - `generateSceneAction` - Server action that:
      - Validates input with Zod
      - Creates prompt from narrative context
      - Calls Replicate API
      - Uploads image to R2
      - Saves scene record to database (Drizzle)
      - Returns scene URL
    - `getCampaignScenesAction` - Fetch scenes for campaign
    - `getCurrentSceneAction` - Get current scene for campaign
  - Scene management:
    - Cache generated scenes to avoid regeneration (check database before generating)
    - Version scenes based on narrative state
    - Store scene metadata (generation prompt, timestamp) in database
  - Prompt engineering:
    - Convert narrative environment descriptions to image generation prompts using OpenRouter (`qwen/qwen3-vl-8b-instruct`)
    - Include genre/style information in prompts
    - Include character descriptions for portraits
    - Optimize prompts for quality results
  - Scene update triggers:
    - Generate new scene when location changes (detect in narrative)
    - Generate new scene when significant environmental changes occur
    - Generate portrait when character conversation starts
    - Return to scene view when conversation ends

- **Data Requirements**:

  - **Drizzle Schema Definition** (`src/lib/db/schema.ts`):
    ```typescript
    export const scenes = pgTable("scenes", {
      id: uuid("id").defaultRandom().primaryKey(),
      campaignId: uuid("campaign_id")
        .references(() => campaigns.id)
        .notNull(),
      sceneType: varchar("scene_type", { length: 20 }).notNull(),
      imageUrl: varchar("image_url", { length: 500 }).notNull(),
      generationPrompt: text("generation_prompt").notNull(),
      narrativeContext: text("narrative_context").notNull(),
      characterName: varchar("character_name", { length: 100 }),
      createdAt: timestamp("created_at").defaultNow().notNull(),
    });
    ```
  - **Zod Validation Schema** (`src/lib/db/schemas/scene.ts`):
    - `sceneTypeSchema`: enum(['environment', 'portrait'])
    - `createSceneSchema`: campaignId, sceneType, imageUrl, generationPrompt, narrativeContext, characterName (optional)
    - `updateSceneSchema`: imageUrl, metadata updates
  - **Database Table**: `scenes`
    - `id`: UUID (primary key)
    - `campaign_id`: UUID (foreign key to campaigns.id)
    - `scene_type`: VARCHAR(20) (enum: environment, portrait)
    - `image_url`: VARCHAR(500) (URL to stored image in R2)
    - `generation_prompt`: TEXT (prompt used for generation)
    - `narrative_context`: TEXT (narrative description that triggered generation)
    - `character_name`: VARCHAR(100) (nullable, for portraits)
    - `created_at`: TIMESTAMP (default: now())
  - **Updates to `campaigns` table** (via Drizzle schema):
    - `current_scene_id`: UUID (foreign key to scenes.id, nullable)
  - **Indexes**:
    - Index on `campaign_id` for campaign scene queries (via Drizzle)
    - Index on `scene_type` for filtering (via Drizzle)
    - Index on `created_at` for chronological ordering (via Drizzle)
  - **Relationships**:
    - Many-to-one with campaigns (via Drizzle relations)
  - **Note**: Actual image files stored in Cloudflare R2 (see Storage Integration feature)

- **User Flow**:

  1. Player is in active campaign viewing narrative
  2. System detects environment description in narrative
  3. System checks if scene already exists for this context
  4. If scene doesn't exist:
     - System creates image generation prompt from narrative
     - System calls Replicate API to generate image
     - Generated image is stored in R2
     - Scene record is created in database
  5. Scene image is displayed in environment panel
  6. Player takes action that changes environment
  7. System detects significant change
  8. New scene is generated and displayed
  9. Player engages in conversation with character
  10. System generates character portrait
  11. Portrait is displayed (zoomed view)
  12. Conversation ends
  13. System returns to environment scene

- **Acceptance Criteria**:

  - Replicate API integration works correctly
  - Zod schemas validate all scene data (client and server-side)
  - Scene images are generated based on narrative descriptions
  - Generated images are appropriate for the genre and context
  - Scenes are displayed in the environment panel (shadcn/ui components)
  - Character portraits are generated and displayed correctly
  - Scene caching prevents unnecessary regeneration (database check before generation)
  - Loading states show during image generation (shadcn/ui `Skeleton`)
  - Image errors are handled gracefully (shadcn/ui `Alert`)
  - Scene metadata is stored correctly using Drizzle ORM
  - Scene updates trigger appropriately based on narrative changes
  - Generated images are stored in R2 successfully
  - Image URLs are accessible and display correctly
  - Server actions use Zod for validation before database operations

- **Edge Cases**:

  - Replicate API timeout - should retry or show error
  - Replicate API rate limit - should queue or show error
  - Generated image is inappropriate - should filter or regenerate
  - Image generation fails - should show placeholder or error
  - Narrative description is too vague - should use default scene or ask for clarification
  - Scene generation takes too long - should show progress or timeout
  - Image URL becomes invalid - should regenerate or handle gracefully
  - Multiple rapid scene changes - should queue or debounce generation

- **Non-Functional Requirements**:

  - **Performance**: Scene generation should complete in < 30 seconds
  - **Quality**: Generated images should be visually appropriate and coherent
  - **Cost**: Should optimize API calls to manage Replicate costs
  - **Caching**: Should cache scenes effectively to reduce API calls
  - **Reliability**: Should handle API failures gracefully

- **Dependencies**:
  - Base Next.js Implementation (base-implementation.md)
  - Game Loop Text Narration (game-loop-text-narration.md)
  - Storage Integration R2 (storage-integration-r2.md) - for storing generated images
