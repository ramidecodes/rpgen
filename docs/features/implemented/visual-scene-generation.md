# Feature Requirement Document - Visual Scene Generation

- **Feature Name**: Visual Scene Generation

- **Goal**: Automatically generate and display visual scene images based on narrative changes in the game. The Visual Engine Agent monitors the game narrative and triggers scene image generation when significant location or environment changes occur. Images are stored in R2 and displayed in the game UI.

- **User Story**: As a player, I want to see visual representations of the scenes I'm experiencing in the game, so that the narrative feels more immersive and engaging. The scenes should update automatically as the story progresses and locations change.

- **Functional Requirements**:

  - **Visual Engine Agent (VEA)**:
    - Background agent that runs non-blocking after each Game Master Agent response
    - Analyzes recent narrative messages to determine if scene regeneration is needed
    - Uses AI SDK v6 `ToolLoopAgent` with limited tool cycles (3 max) for efficiency
    - Crafts detailed image prompts with character appearance, universe style, and narrative context
    - Generates scene images via Replicate API (flux-schnell model)
    - Stores images in R2 with structured key format
    - Updates run's `currentSceneId` to track the latest scene

  - **Scene Generation Tools**:
    - `shouldGenerateScene`: Determines if scene regeneration is needed based on narrative changes
    - `generateImagePrompt`: Crafts detailed image generation prompts with context
    - `generateSceneImage`: Generates and stores scene images (factory function with runId bound)

  - **Scene Storage**:
    - R2 storage key format: `gen-dnd/{userId}/runs/{runId}/scenes/{sceneId}.webp`
    - Database stores R2 key (not full URL) in `scenes.imageUrl` field
    - Scene metadata stored: generation prompt, narrative context, previous scene ID
    - Run's `currentSceneId` tracks the latest scene

  - **Scene Display**:
    - Play page fetches current scene from database
    - Converts R2 key to public/signed URL using `getPublicUrl()`
    - SceneVisualizer component displays scene with zoom functionality
    - Images served via public domain or signed URLs (1-hour expiration)

  - **Non-Blocking Architecture**:
    - Visual Engine Agent runs in fire-and-forget pattern (doesn't block chat responses)
    - Errors in scene generation don't affect main game flow
    - Players can continue playing while images generate in background

- **Technical Implementation**:

  - **Agent Location**: `src/agents/visual-engine.ts`
  - **Tools Location**: `src/lib/ai/tools.ts` (scene generation tools)
  - **Scene Generator**: `src/lib/ai/scene-generator.ts` (prompt validation and enhancement)
  - **Image Generator**: `src/lib/ai/image-generator.ts` (Replicate API integration with proper response handling)
  - **Scene Actions**: `src/app/actions/scenes.ts` (server actions for scene queries)
  - **Scene Component**: `src/components/game/scene-visualizer.tsx` (UI component)
  - **Webhook Endpoint**: `src/app/api/webhooks/replicate/route.ts` (optional async processing)

  - **Database Schema**:
    - `scenes` table with fields: id, runId, sceneType, imageUrl (R2 key), generationPrompt, narrativeContext, previousSceneId, createdAt
    - `runs.currentSceneId` foreign key to scenes table

  - **Replicate API Handling**:
    - Properly extracts image URLs from Replicate response objects (handles valueOf() primitive values)
    - Handles async responses and prediction objects
    - Supports webhook-based processing for truly non-blocking workflows

- **User Experience**:

  - Scene images appear automatically as narrative progresses
  - Images update when significant location/environment changes occur
  - Full-size view available via zoom button
  - Loading states shown during generation
  - Error states handled gracefully (doesn't block gameplay)

- **Acceptance Criteria**:

  - Visual Engine Agent triggers after each assistant message (non-blocking)
  - Scene images generate successfully via Replicate API
  - Images stored correctly in R2 with proper key format
  - Scene records created in database with metadata
  - Run's currentSceneId updates correctly
  - Scene images display in UI with proper URL conversion
  - Zoom functionality works in dialog
  - Errors in scene generation don't block chat responses
  - Scene generation is non-blocking (fire-and-forget pattern)

- **Edge Cases**:

  - Replicate API returns empty object arrays (handled via valueOf() extraction)
  - Image generation fails (logged but doesn't block game)
  - Scene generation takes longer than expected (non-blocking, updates when ready)
  - Multiple scene generation requests (latest scene wins)
  - R2 key to URL conversion failures (fallback to signed URLs)

- **Non-Functional Requirements**:

  - **Performance**: Scene generation doesn't block chat responses (< 100ms overhead)
  - **Reliability**: Scene generation failures don't affect main game flow
  - **Scalability**: Can handle multiple concurrent scene generations
  - **Cost**: Efficient prompt crafting to minimize Replicate API calls
  - **User Experience**: Images appear automatically without user intervention

- **Dependencies**:

  - Replicate API for image generation
  - Cloudflare R2 for image storage
  - AI SDK v6 for agent orchestration
  - OpenRouter for LLM inference (Visual Engine Agent decisions)

