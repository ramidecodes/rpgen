# Feature Requirement Document - Webhook-Based Scene Generation with Real-Time UI Updates

- **Feature Name**: Webhook-Based Scene Generation with Real-Time UI Updates

- **Goal**: Replace the current synchronous Replicate image generation with a non-blocking webhook-based approach and implement Server-Sent Events (SSE) for real-time UI updates. The Visual Engine Agent should trigger image generation asynchronously and return immediately, while the UI receives instant notifications when new scenes are ready without polling.

- **User Story**: As a player, I want scene images to generate in the background without blocking my game interactions, and I want to see new scenes appear instantly when they're ready, without waiting for polling intervals or page refreshes.

- **Functional Requirements**:

  - **Non-Blocking Image Generation**:

    - Visual Engine Agent triggers image generation and returns immediately (doesn't wait for completion)
    - Uses Replicate's `predictions.create()` API with webhook support instead of synchronous `replicate.run()`
    - Creates scene record immediately with pending state (`imageUrl: null`)
    - Stores `predictionId` for tracking (can be stored in scene metadata or tracked separately)
    - Returns success response with `predictionId` to agent (non-blocking)

  - **Webhook Processing**:

    - Existing webhook endpoint (`/api/webhooks/replicate`) receives Replicate completion events
    - Validates webhook signature using `REPLICATE_WEBHOOK_SECRET_B64` (base64-encoded secret)
    - Validates webhook payload (predictionId, status, output, metadata)
    - Extracts `runId` and `sceneId` from metadata
    - Downloads image from Replicate URL
    - Uploads image to R2 with proper key format
    - Updates scene record with `imageUrl` (R2 key)
    - Updates run's `currentSceneId` to latest scene
    - Notifies connected SSE clients about scene update

  - **Server-Sent Events (SSE) Endpoint**:

    - New endpoint: `/api/runs/[runId]/scene-events`
    - Authenticates user and verifies run ownership
    - Maintains persistent connection with proper SSE headers
    - Sends keepalive comments periodically to prevent connection timeout
    - Subscribes to scene update events for the specific run
    - Broadcasts events when scenes are updated via webhook
    - Handles connection cleanup on disconnect

  - **SSE Connection Management**:

    - Connection manager utility tracks active SSE connections per runId
    - Supports multiple clients subscribing to same run
    - Broadcasts events to all connected clients for a run
    - Handles connection add/remove operations
    - Prevents memory leaks with proper cleanup

  - **Real-Time UI Updates**:

    - Client subscribes to SSE endpoint on component mount
    - Replaces current polling mechanism (5-second intervals)
    - Receives `scene-updated` events with scene data
    - Updates `currentSceneState` immediately when events arrive
    - Handles automatic reconnection on connection drops
    - Shows loading state when scene is pending (`imageUrl === null`)

  - **Scene Pending State**:
    - Scene records can have `imageUrl: null` to indicate pending generation
    - SceneVisualizer component handles pending state gracefully
    - Displays "Generating scene..." message when image is not yet available
    - Updates automatically when SSE event arrives with completed scene

- **Technical Implementation**:

  - **Modified Files**:

    - `src/lib/ai/tools.ts`: Update `createGenerateSceneImageTool()` to use `createImagePrediction()` instead of `generateImage()`
      - Construct webhook URL using `NGROK_HOST` (dev) or `NEXT_PUBLIC_SITE_URL`/`WEBHOOK_BASE_URL` (prod)
      - Pass webhook URL to `createImagePrediction()` along with metadata
    - `src/app/api/webhooks/replicate/route.ts`:
      - Add webhook signature validation using `REPLICATE_WEBHOOK_SECRET_B64`
      - Add SSE notification after database update
      - Validate signature before processing payload
    - `src/app/runs/[id]/play/game-play-client.tsx`: Replace polling with SSE subscription
    - `src/components/game/scene-visualizer.tsx`: Handle pending state (imageUrl === null)

  - **New Files**:

    - `src/app/api/runs/[runId]/scene-events/route.ts`: SSE endpoint for scene update events
    - `src/lib/sse/connection-manager.ts`: SSE connection management utility

  - **Image Generation Flow**:

    ```
    VEA → createImagePrediction() → Returns predictionId immediately (non-blocking)
         ↓
    Replicate processes image (async, 10-30 seconds)
         ↓
    Webhook receives completion → Downloads image → Uploads to R2 → Updates DB
         ↓
    Webhook notifies SSE connection manager → Broadcasts to connected clients
         ↓
    Client receives SSE event → Updates UI instantly
    ```

  - **SSE Event Format**:

    ```json
    {
      "type": "scene-updated",
      "data": {
        "sceneId": "uuid",
        "runId": "uuid",
        "imageUrl": "r2-key-or-url"
      }
    }
    ```

  - **Webhook URL Construction**:

    - **Development**: Uses `NGROK_HOST` environment variable to construct webhook URL
      - Format: `https://${NGROK_HOST}/api/webhooks/replicate`
      - Example: If `NGROK_HOST=abc123.ngrok.io`, webhook URL is `https://abc123.ngrok.io/api/webhooks/replicate`
      - Requires ngrok tunnel to be running and `NGROK_HOST` to be set
    - **Production**: Uses `NEXT_PUBLIC_SITE_URL` or `WEBHOOK_BASE_URL` environment variable
      - Format: `${NEXT_PUBLIC_SITE_URL}/api/webhooks/replicate` or `${WEBHOOK_BASE_URL}/api/webhooks/replicate`
    - Webhook URL is passed to Replicate's `predictions.create()` API via `webhook` parameter

  - **Metadata Passed to Replicate**:
    - `{ runId: string, sceneId: string }` stored in prediction input metadata
    - Replicate passes metadata through to webhook payload
    - Used to identify which scene to update when webhook fires

- **User Experience**:

  - Visual Engine Agent returns immediately after triggering generation (no blocking)
  - Scene appears in UI within 1-2 seconds of webhook completion (real-time)
  - No visible polling or unnecessary network requests
  - Loading state shown while scene is generating
  - Smooth transition when new scene becomes available
  - Multiple browser tabs/windows stay in sync (all receive SSE events)
  - Graceful handling of connection drops with automatic reconnection

- **Acceptance Criteria**:

  - ✅ Visual Engine Agent returns immediately after triggering image generation (< 100ms)
  - ✅ Scene record created with pending state (`imageUrl: null`) before generation completes
  - ✅ Webhook validates signatures using `REPLICATE_WEBHOOK_SECRET_B64` before processing
  - ✅ Webhook successfully processes Replicate completion events
  - ✅ Webhook updates scene record with R2 key after image upload
  - ✅ Webhook updates run's `currentSceneId` to latest scene
  - ✅ SSE endpoint authenticates users and verifies run ownership
  - ✅ SSE endpoint maintains persistent connections with keepalive
  - ✅ SSE connection manager broadcasts events to all connected clients for a run
  - ✅ UI subscribes to SSE endpoint on component mount
  - ✅ UI receives `scene-updated` events and updates scene state immediately
  - ✅ UI shows loading state when scene is pending
  - ✅ No polling requests appear in network tab
  - ✅ Multiple clients can subscribe to same run simultaneously
  - ✅ Connection reconnection works automatically on network drops
  - ✅ Scene updates appear in UI within 1-2 seconds of webhook completion
  - ✅ Webhook URL constructed correctly using `NGROK_HOST` (dev) or `NEXT_PUBLIC_SITE_URL` (prod)
  - ✅ Webhook signature validation works correctly with `REPLICATE_WEBHOOK_SECRET_B64`

- **Edge Cases**:

  - **Webhook Failures**:

    - Log errors and mark scene as failed (optional status field or error tracking)
    - Don't crash or block other operations
    - Retry mechanism can be added later if needed

  - **SSE Connection Drops**:

    - EventSource API handles automatic reconnection
    - Client reconnects and resumes receiving events
    - No data loss (scene state can be re-fetched on reconnect if needed)

  - **Replicate API Failures**:

    - Webhook receives error status from Replicate
    - Scene marked as failed, error logged
    - UI can show error state or retry option

  - **Multiple Scene Generations**:

    - Latest scene wins (updates `currentSceneId`)
    - Previous scenes remain in database for history
    - SSE events sent for each completion (client handles latest)

  - **Network Issues**:

    - SSE reconnects automatically
    - Fallback to polling can be added if SSE unavailable (future enhancement)
    - Graceful degradation: scenes still appear, just with slight delay

  - **Concurrent Clients**:

    - Multiple browser tabs/windows all receive same events
    - Connection manager handles multiple connections per run
    - No race conditions (database updates are atomic)

  - **Webhook URL Not Available**:

    - Development: `NGROK_HOST` must be set and ngrok tunnel must be running
      - If not set, log warning and fallback to synchronous approach
      - Provide clear error message if webhook URL construction fails
    - Production: `NEXT_PUBLIC_SITE_URL` or `WEBHOOK_BASE_URL` must be set
      - If not set, log error and fallback to synchronous approach
    - Fallback: Can still use synchronous approach if webhook unavailable (with warning)

  - **Webhook Signature Validation Failures**:
    - If `REPLICATE_WEBHOOK_SECRET_B64` is not set, log warning but allow processing (development mode)
    - If signature validation fails, reject webhook with 401 Unauthorized
    - Log security events for failed signature validations
    - In production, signature validation should be mandatory

- **Non-Functional Requirements**:

  - **Performance**:

    - VEA returns in < 100ms (non-blocking)
    - SSE events delivered within 1-2 seconds of webhook completion
    - No noticeable UI lag when scenes update
    - Connection manager operations are O(1) for add/remove/broadcast

  - **Reliability**:

    - Scene generation failures don't affect main game flow
    - SSE connection drops handled gracefully with auto-reconnect
    - Webhook processing is idempotent (safe to retry)
    - Database updates are atomic (no partial states)

  - **Scalability**:

    - SSE connection manager handles hundreds of concurrent connections
    - Webhook processing is stateless and can scale horizontally
    - No shared state between webhook and SSE (database is source of truth)

  - **Security**:

    - SSE endpoint authenticates users via Clerk
    - Verifies run ownership before allowing subscription
    - Webhook endpoint validates Replicate webhook signatures using `REPLICATE_WEBHOOK_SECRET_B64`
      - Secret is base64-encoded and must be decoded before use
      - Signature validation prevents unauthorized webhook calls
      - Reject webhook requests with invalid signatures (return 401 Unauthorized)
    - Metadata validation prevents injection attacks
    - Webhook endpoint should verify signature before processing any payload

  - **Cost**:
    - No additional API costs (Replicate pricing unchanged)
    - SSE connections are lightweight (minimal server resources)
    - Reduced polling reduces database query costs

- **Dependencies**:

  - Replicate API with webhook support (already available)
  - Next.js App Router with streaming responses (SSE support)
  - EventSource API (browser native, no additional dependencies)
  - Existing webhook endpoint infrastructure
  - Clerk authentication for SSE endpoint security
  - ngrok (development only) for exposing localhost to receive webhooks

- **Environment Variables**:

  - **`NGROK_HOST`** (Development):

    - The ngrok hostname (e.g., `abc123.ngrok.io`) without protocol
    - Used to construct webhook URL: `https://${NGROK_HOST}/api/webhooks/replicate`
    - Required for local development to receive Replicate webhooks
    - Example: `NGROK_HOST=abc123.ngrok.io`
    - Not required in production

  - **`REPLICATE_WEBHOOK_SECRET_B64`** (Required):

    - Base64-encoded webhook secret from Replicate
    - Used to validate webhook signatures and prevent unauthorized requests
    - Must be decoded before use in signature validation
    - Required in both development and production
    - Example: `REPLICATE_WEBHOOK_SECRET_B64=dGVzdC1zZWNyZXQ=`
    - If not set, webhook will log warning but may still process (development mode only)

  - **`NEXT_PUBLIC_SITE_URL`** (Production):

    - Production application URL (e.g., `https://app.example.com`)
    - Used to construct webhook URL in production
    - Alternative to `WEBHOOK_BASE_URL` if preferred
    - Required in production

  - **`WEBHOOK_BASE_URL`** (Production, Optional):
    - Alternative to `NEXT_PUBLIC_SITE_URL` for webhook URL construction
    - Used if `NEXT_PUBLIC_SITE_URL` is not available
    - Required in production if `NEXT_PUBLIC_SITE_URL` is not set

- **Migration Strategy**:

  1. Deploy webhook endpoint enhancements (add SSE notification)
  2. Deploy SSE endpoint and connection manager
  3. Update image generation tool to use webhook approach
  4. Deploy UI changes to use SSE (keep polling as fallback initially)
  5. Monitor for issues and verify real-time updates work
  6. Remove polling code after SSE is proven stable
  7. Add error tracking and monitoring for webhook/SSE failures

- **Testing Considerations**:

  - **Unit Tests**:

    - SSE connection manager: add/remove/broadcast operations
    - Webhook payload parsing and validation
    - Webhook signature validation with `REPLICATE_WEBHOOK_SECRET_B64`
    - Webhook URL construction with `NGROK_HOST` (development) and `NEXT_PUBLIC_SITE_URL` (production)
    - Scene creation with pending state
    - Metadata extraction from Replicate webhook

  - **Integration Tests**:

    - End-to-end flow: VEA → Replicate → Webhook → SSE → UI
    - Multiple clients subscribing to same run
    - Connection reconnection handling
    - Webhook processing with various Replicate response formats

  - **Manual Testing**:
    - Verify non-blocking behavior (VEA returns quickly)
    - Verify real-time updates (scene appears immediately)
    - Test with slow network (SSE reconnection)
    - Test webhook with ngrok for local development:
      - Start ngrok tunnel: `ngrok http 3000`
      - Set `NGROK_HOST` to ngrok hostname (e.g., `abc123.ngrok.io`)
      - Verify webhook URL is constructed correctly
      - Test webhook receives events from Replicate
    - Test webhook signature validation:
      - Verify valid signatures are accepted
      - Verify invalid signatures are rejected (401)
      - Test with missing `REPLICATE_WEBHOOK_SECRET_B64` (should warn in dev)
    - Test multiple browser tabs receiving same events
    - Test error scenarios (failed generations, connection drops)
    - Test webhook URL fallback when `NGROK_HOST` or `NEXT_PUBLIC_SITE_URL` not set

- **Success Metrics**:

  - VEA response time: < 100ms (measured from tool call to return)
  - UI update latency: < 2 seconds from webhook completion to UI update
  - Zero polling requests in production
  - SSE connection uptime: > 99% (with auto-reconnect)
  - Webhook processing success rate: > 99%
