# Feature Requirement Document - SSE Event Storage in Database

- **Feature Name**: SSE Event Storage in Database

- **Goal**: Upgrade the Server-Sent Events (SSE) system to persist events in the database, enabling event replay for reconnecting clients, event persistence across server restarts, and improved debugging capabilities. This addresses issues where clients miss events during disconnections and events are lost when the server restarts.

- **User Story**: As a player, I want to receive all scene generation events even if my connection drops temporarily, and I want the UI to accurately reflect the current state when I reconnect, including any pending scene generations that occurred while I was disconnected.

- **Current Behavior (observed)**:

  - SSE events are only stored in-memory in the `sseConnectionManager`
  - Events are lost when the server restarts
  - Clients that disconnect/reconnect miss events that occurred during disconnection
  - No audit trail for debugging event delivery issues
  - Clients can't catch up on missed events when reconnecting
  - **Current SSE format is non-standard**: Events are sent as `data: {"type": "...", "data": {...}}` instead of proper SSE format with `id:`, `event:`, and `data:` fields
  - **No event IDs**: Events don't include unique IDs, so `Last-Event-ID` mechanism can't work
  - **No retry field**: No reconnection delay specification
  - Result: UI may show stale state (missing loading indicators, missed scene updates)

- **Functional Requirements**:

  1. **Database Event Storage**:

     - Create new `sse_events` table to store all SSE events
     - Store event type, runId, payload data, and timestamp
     - Events are persisted immediately when broadcast
     - Support event replay queries (get events for a runId after a specific timestamp)

  2. **Enhanced SSE Connection Manager**:

     - Persist events to database when broadcasting (returns event with UUID ID)
     - Format events in proper SSE format:
       - `id: <uuid>; event: <event-type>; data: <json-payload>`
     - Broadcast formatted events to active connections
     - Database writes should be awaited to get event ID, but errors don't fail broadcasts

  3. **SSE Endpoint Catch-Up**:

     - When a client connects, query for missed events since their last known event timestamp
     - Send missed events immediately after connection establishment
     - Support client-provided `lastEventId` header for efficient catch-up
     - If no `lastEventId` provided, send recent events (e.g., last 10 events or events from last 5 minutes)

  4. **Event Types Supported**:

     - `scene-generation-started`: Scene generation initiated by VEA
     - `scene-updated`: Scene image generation completed and updated
     - `scene-generation-cancelled`: Scene generation cancelled
     - `campaign-state-updated`: Campaign state changes (if applicable)
     - Extensible to support future event types

  5. **Event Cleanup**:

     - Optional cleanup of old events (e.g., older than 7 days)
     - Can be implemented as a periodic background job or manual cleanup
     - Keep recent events for catch-up functionality

  6. **Clean Implementation**:
     - No backward compatibility required - all existing runs will be deleted
     - Fresh implementation with proper SSE format from the start
     - Clients will be updated to handle new SSE format with `id:`, `event:`, and `data:` fields
     - No need to support old event format (`data: {"type": "...", "data": {...}}`)
     - Clean migration - new schema and new client implementation

- **Technical Implementation**:

  - **Database Schema** (`src/lib/db/schema.ts`):

    - Add `sseEvents` table with fields:
      - `id`: UUID primary key (used as SSE event ID)
      - `runId`: UUID foreign key to `runs.id` (with cascade delete)
      - `eventType`: VARCHAR(50) - event type (e.g., "scene-generation-started")
      - `eventData`: JSONB - event payload data (the actual data object, not wrapped)
      - `createdAt`: TIMESTAMP - event timestamp (for ordering and cleanup)
    - Add index on `(runId, createdAt DESC)` for efficient catch-up queries
    - Add index on `createdAt` for cleanup queries
    - **Note**: The `id` field serves dual purpose - database primary key and SSE event ID

  - **Zod Schema** (`src/lib/db/schemas/sse-event.ts`):

    - Create validation schema for SSE events
    - Validate event types and payload structure
    - Define allowed event types as enum: `"scene-generation-started" | "scene-updated" | "scene-generation-cancelled" | "campaign-state-updated"`

  - **Enhanced Connection Manager** (`src/lib/sse/connection-manager.ts`):

    - Add `storeEvent()` method to persist events to database (returns stored event with ID)
    - Modify `broadcast()` to:
      1. Store event in database first (non-blocking, but await to get event ID)
      2. Format event in proper SSE format: `id: <uuid>\nevent: <event-type>\ndata: <json-payload>\n\n`
      3. Broadcast to active connections
    - Database write should be non-blocking (fire-and-forget for error handling only, but await for ID)
    - Log errors but don't fail broadcasts if database write fails (fallback to timestamp-based ID)
    - Include `retry: 3000` field in connection message to specify reconnection delay (3 seconds)

  - **SSE Endpoint** (`src/app/api/runs/[runId]/scene-events/route.ts`):

    - Accept optional `lastEventId` query parameter from URL (since native EventSource doesn't support custom headers)
    - Parse `lastEventId` as UUID (validate format, handle invalid UUIDs gracefully with fallback to recent events)
    - Query database for missed events using SQL:
      ```sql
      SELECT * FROM sse_events
      WHERE run_id = ?
        AND (
          created_at > (SELECT created_at FROM sse_events WHERE id = ?)
          OR (created_at = (SELECT created_at FROM sse_events WHERE id = ?) AND id > ?)
        )
      ORDER BY created_at ASC, id ASC
      LIMIT 100  -- Prevent sending too many events on reconnect
      ```
    - If `lastEventId` is invalid/missing, send recent events (last 10 events or events from last 5 minutes)
    - Send `retry: 3000` field in initial connection message (reconnection delay in milliseconds)
    - Send missed events immediately after connection message in chronological order
    - Format catch-up events in proper SSE format with `id:`, `event:`, and `data:` fields
    - Continue sending new events as they arrive (existing behavior)

  - **Client Updates** (`src/app/runs/[id]/play/game-play-client.tsx`):
    - Track last received event ID (from `event.lastEventId` property, which EventSource populates automatically from `id:` field)
    - Store last event ID in localStorage or sessionStorage for persistence across page reloads
    - **Important**: Native `EventSource` API in browsers does NOT support custom headers, so use query parameter:
      - Use query parameter: `new EventSource(\`/api/runs/\${runId}/scene-events?lastEventId=\${lastEventId}\`)`
      - Update query parameter on reconnect if `lastEventId` changes
    - Update event handling to use new SSE format:
      - Access event type via `event.type` (from SSE `event:` field) - this is the cleanest approach
      - OR parse `event.data` as JSON (payload is stored as-is in `eventData`, no wrapper)
      - Remove old logic that expected `data: {"type": "...", "data": {...}}`
    - Handle catch-up events gracefully (avoid duplicate processing by checking event IDs)
    - Update stored event ID after processing each event (store `event.lastEventId` from EventSource)
    - Use `eventSource.addEventListener(eventType, handler)` for typed event handling (cleaner than parsing `event.data`)

- **Database Schema Definition**:

```typescript
export const sseEvents = pgTable(
  "sse_events",
  {
    id: uuid("id").defaultRandom().primaryKey(), // Serves as both DB primary key and SSE event ID
    runId: uuid("run_id")
      .references(() => runs.id, { onDelete: "cascade" })
      .notNull(),
    eventType: varchar("event_type", { length: 50 }).notNull(), // Used as SSE "event:" field
    eventData: jsonb("event_data").notNull(), // The actual payload (not wrapped in {type, data})
    createdAt: timestamp("created_at").defaultNow().notNull(), // For ordering and cleanup
  },
  (table) => [
    // Composite index for efficient catch-up queries by runId and time
    index("sse_events_run_id_created_at_idx").on(table.runId, table.createdAt),
    // Index for cleanup queries (delete old events)
    index("sse_events_created_at_idx").on(table.createdAt),
    // Note: UUID comparison works for ordering within same run, but createdAt is more reliable
  ]
);
```

**Important Notes**:

- The `id` field (UUID) is used as the SSE `id:` field value
- The `eventType` field is used as the SSE `event:` field value
- The `eventData` field contains only the payload (e.g., `{runId, sceneId, imageUrl}`), not `{type, data}`
- Events are stored before broadcasting to ensure they're available for catch-up even if broadcast fails

- **Event Storage Flow**:

```
1. Event Source (VEA, Webhook, etc.) → Calls sseConnectionManager.broadcast(runId, { type, data })
2. Connection Manager → Stores event in database, gets event ID (UUID)
3. Connection Manager → Formats event in SSE format:
   - id: <event-id-uuid>
   - event: <event-type>
   - data: <json-stringified-data>
   - (empty line)
4. Connection Manager → Broadcasts formatted event to active connections
5. Database → Event persisted for future replay
```

- **SSE Event Format** (SSE Specification Compliance):

Each event must follow the SSE format:

```
id: <uuid>\n
event: <event-type>\n
data: <json-payload>\n
\n
```

Example:

```
id: 550e8400-e29b-41d4-a716-446655440000
event: scene-generation-started
data: {"runId":"...","sceneId":"...","narrativeContext":"..."}

```

- **Event Catch-Up Flow**:

```
1. Client connects to SSE endpoint with Last-Event-ID query parameter (or header if using custom client)
2. SSE endpoint → Queries database for events:
   - WHERE runId = ? AND id > ? (UUID comparison)
   - OR WHERE runId = ? AND createdAt > (SELECT createdAt FROM sse_events WHERE id = ?)
   - ORDER BY createdAt ASC (chronological order)
3. SSE endpoint → Sends retry: 3000 (reconnection delay in milliseconds)
4. SSE endpoint → Sends missed events immediately in proper SSE format
5. SSE endpoint → Continues sending new events as they arrive
6. Client → Processes catch-up events, then new events
7. Client → Stores last received event ID (from event.lastEventId or event.id)
```

- **Event Types and Payloads**:

  **Important**: Event payloads stored in `eventData` contain ONLY the data object (not wrapped in `{type, data}`). The SSE format adds the `event:` field separately.

  - `scene-generation-started`:

    - **Event Type**: `"scene-generation-started"`
    - **Payload** (stored in `eventData`):
      ```json
      {
        "runId": "uuid",
        "sceneId": "uuid or placeholder",
        "narrativeContext": "string",
        "placeholder": boolean
      }
      ```
    - **SSE Format**:
      ```
      id: <uuid>
      event: scene-generation-started
      data: {"runId":"...","sceneId":"...","narrativeContext":"...","placeholder":true}
      ```

  - `scene-updated`:

    - **Event Type**: `"scene-updated"`
    - **Payload**:
      ```json
      {
        "runId": "uuid",
        "sceneId": "uuid",
        "imageUrl": "string (R2 key or public URL)"
      }
      ```
    - **SSE Format**:
      ```
      id: <uuid>
      event: scene-updated
      data: {"runId":"...","sceneId":"...","imageUrl":"..."}
      ```

  - `scene-generation-cancelled`:

    - **Event Type**: `"scene-generation-cancelled"`
    - **Payload**:
      ```json
      {
        "placeholderId": "string"
      }
      ```
    - **SSE Format**:
      ```
      id: <uuid>
      event: scene-generation-cancelled
      data: {"placeholderId":"..."}
      ```

  - `campaign-state-updated`:
    - **Event Type**: `"campaign-state-updated"`
    - **Payload**:
      ```json
      {
        "state": {
          /* CampaignState object */
        }
      }
      ```
    - **SSE Format**:
      ```
      id: <uuid>
      event: campaign-state-updated
      data: {"state":{...}}
      ```

- **User Experience**:

  - Clients that reconnect after disconnection automatically receive missed events
  - UI accurately reflects current state (pending scenes, completed scenes) after reconnect
  - No manual refresh needed to sync state after reconnection
  - Loading indicators appear correctly even if connection was interrupted during generation
  - Multiple browser tabs stay in sync when reconnecting

- **Acceptance Criteria**:

  - ✅ New `sse_events` table created with proper schema and indexes
  - ✅ Events are stored in database when broadcast (with UUID IDs)
  - ✅ Events are formatted in proper SSE format with `id:`, `event:`, and `data:` fields
  - ✅ Connection message includes `retry: 3000` field for reconnection delay
  - ✅ Clients can provide `lastEventId` query parameter when connecting
  - ✅ SSE endpoint queries and sends missed events on connection (by UUID and timestamp)
  - ✅ Clients receive catch-up events before new events (in chronological order)
  - ✅ Events persist across server restarts
  - ✅ Client UI correctly processes catch-up events without duplicates (using event ID deduplication)
  - ✅ Loading indicators appear correctly after reconnection if scene was pending
  - ✅ Scene updates are received correctly after reconnection
  - ✅ Database writes are awaited to get event ID (errors logged but don't fail broadcasts)
  - ✅ Migration script creates table and indexes successfully
  - ✅ Event IDs are UUIDs (globally unique, suitable for distributed systems)
  - ✅ Client stores last event ID for reconnection (localStorage or sessionStorage)
  - ✅ Client code updated to use new SSE format (accesses `event.type` or parses `event.data` correctly)
  - ✅ `pnpm check` passes for all modified files

- **Edge Cases**:

  - **Client Reconnects During Event Broadcast**:

    - Catch-up query may include the same event that's being broadcast
    - Client should handle duplicate events gracefully (idempotent processing)
    - Use event ID (UUID) to deduplicate (check if event ID already processed)
    - Store processed event IDs in a Set or Map to prevent duplicate processing

  - **Database Write Failures**:

    - Log error but continue broadcasting to active connections
    - Events may be lost in this case, but active clients still receive them
    - Consider retry mechanism for critical events (future enhancement)

  - **Very Old Events**:

    - Limit catch-up to recent events (e.g., last 24 hours or last 100 events)
    - Prevent sending too much data on reconnect
    - Old events can be cleaned up periodically

  - **Multiple Rapid Reconnects**:

    - Each reconnect should only catch up events since last known event
    - Client should track last processed event ID accurately
    - Avoid sending duplicate catch-up events

  - **High Event Volume**:

    - Database indexes ensure efficient queries
    - Limit catch-up query results to prevent large payloads
    - Consider pagination for very active runs (future enhancement)

  - **Server Restart During Active Generation**:
    - Events stored before restart are preserved
    - Clients reconnecting after restart receive missed events
    - Pending scene states are correctly restored

- **Non-Functional Requirements**:

  - **Performance**:

    - Database writes should not add > 10ms latency to broadcasts
    - Catch-up queries should complete in < 100ms for typical runs
    - Indexes ensure efficient query performance
    - Batch database writes if needed (future optimization)

  - **Reliability**:

    - Events persist even if SSE connection fails immediately after broadcast
    - Catch-up ensures clients don't miss critical events
    - Database writes are atomic (single transaction)
    - Graceful degradation if database is temporarily unavailable

  - **Scalability**:

    - Indexes support efficient queries for high event volume
    - Event cleanup prevents unbounded table growth
    - Database can handle thousands of events per run
    - UUID-based event IDs ensure global uniqueness (no collisions across servers in distributed setup)

  - **Maintainability**:
    - Clear separation between broadcast and storage concerns
    - Event schema is extensible for future event types
    - Database queries are optimized with proper indexes
    - Cleanup strategy prevents table bloat

- **Migration Strategy**:

  1. **Database Migration**:

     - Create migration for `sse_events` table with schema as defined
     - Run migration on development/staging first
     - Verify indexes are created correctly
     - **Note**: Old runs will be deleted, so no data migration needed

  2. **Connection Manager Updates**:

     - Add `storeEvent()` method to persist events (returns stored event with ID)
     - Update `broadcast()` method signature if needed (can break existing calls since runs are deleted)
     - Modify `broadcast()` to:
       - Store event first (await to get ID, but handle errors gracefully)
       - Format event in proper SSE format: `id: <uuid>\nevent: <type>\ndata: <json>\n\n`
       - Broadcast formatted event to connections
     - Add `retry: 3000` to connection welcome message

  3. **SSE Endpoint Updates**:

     - Accept `lastEventId` query parameter from URL
     - Query database for missed events (by UUID and createdAt)
     - Send catch-up events in proper SSE format
     - Ensure events are sent in chronological order
     - Update all event broadcasts to use new format

  4. **Client Updates** (Clean Implementation):

     - Remove old event parsing logic that expects `data: {"type": "...", "data": {...}}`
     - Update to use proper SSE format:
       - Access event type via `event.type` (from `event:` field) OR parse from `event.data`
       - Parse `event.data` as JSON to get payload
       - Track `event.lastEventId` (automatically set by EventSource from `id:` field)
     - Store last event ID in localStorage/sessionStorage
     - Include `lastEventId` as query parameter when creating EventSource
     - Implement event deduplication using event IDs
     - Handle catch-up events gracefully

  5. **Testing**:

     - Test with reconnection scenarios (disconnect during generation)
     - Test with server restart during active generation
     - Test with multiple browser tabs
     - Verify no duplicate events are processed
     - Verify loading indicators work correctly after reconnect
     - Verify SSE format is correct (check Network tab → EventStream)

  6. **Deployment**:

     - Delete all existing runs (clean slate)
     - Deploy database migration
     - Deploy server-side changes (connection manager + endpoint)
     - Deploy client-side changes (all at once since no backward compatibility needed)
     - Monitor for issues (database load, event delivery)

  7. **Post-Deployment**:
     - Optionally add event cleanup job (can be done later)
     - Monitor event table growth
     - Consider adding metrics/alerting for failed event deliveries

- **Testing Considerations**:

  - **Unit Tests**:

    - Test event storage to database (verify UUID generation, correct fields)
    - Test catch-up query logic (UUID-based and timestamp-based queries)
    - Test SSE event formatting (verify `id:`, `event:`, `data:` fields are correct)
    - Test event deduplication in client (using event IDs)
    - Test error handling for database write failures (fallback behavior)
    - Test connection manager broadcast with proper SSE format

  - **Integration Tests**:

    - Test full flow: broadcast → store → catch-up → replay
    - Test client reconnection with missed events (using Last-Event-ID)
    - Test multiple clients reconnecting simultaneously (no duplicate deliveries)
    - Test event persistence across server restart (simulated)
    - Test event ordering (catch-up events before new events, chronological order)

  - **Manual Testing**:
    - Disconnect client during scene generation, reconnect, verify loading indicator appears
    - Restart server during active generation, reconnect client, verify catch-up events received
    - Test with multiple browser tabs, disconnect one, verify sync on reconnect
    - Test with high event volume (rapid scene generations)
    - Verify no duplicate events are processed (check event IDs in console)
    - Verify SSE format is correct (check Network tab → EventStream)
    - Verify `retry:` field is sent in connection message
    - Verify `Last-Event-ID` query parameter works correctly
    - Test with very old `Last-Event-ID` (should still work, but may return many events)
    - Verify database cleanup (if implemented)
    - Test edge case: client sends invalid UUID as `Last-Event-ID` (should handle gracefully)

- **Future Enhancements** (Out of Scope):

  - Event replay API for debugging (query events by runId, time range, event type)
  - Event analytics and monitoring (event delivery rates, missed events, connection stats)
  - WebSocket support as alternative to SSE (bi-directional communication)
  - Event batching for high-volume scenarios (batch multiple events in single SSE message)
  - Event retention policies per event type (different retention for different event types)
  - Event compression for large payloads (compress JSONB data for storage)
  - Event delivery confirmation (acknowledge receipt from client)
  - Multi-region support (event replication across regions)
  - Event filtering (client can subscribe to specific event types only)
