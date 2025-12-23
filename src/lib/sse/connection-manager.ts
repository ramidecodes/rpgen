/**
 * SSE Connection Manager
 *
 * Manages Server-Sent Events (SSE) connections for real-time scene updates.
 * Supports multiple clients subscribing to the same run.
 * Persists events to database for replay and catch-up functionality.
 */

import { db } from "@/lib/db";
import { sseEvents } from "@/lib/db/schema";
import type { CreateSSEEventInput } from "@/lib/db/schemas/sse-event";

type SSEConnection = {
  id: string;
  controller: ReadableStreamDefaultController;
  runId: string;
};

class SSEConnectionManager {
  private connections: Map<string, SSEConnection[]> = new Map();

  /**
   * Add a new SSE connection for a run
   * @param runId - The run ID to subscribe to
   * @param controller - The ReadableStream controller for sending events
   * @returns Connection ID for tracking
   */
  addConnection(
    runId: string,
    controller: ReadableStreamDefaultController
  ): string {
    const connectionId = `${runId}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const connection: SSEConnection = {
      id: connectionId,
      controller,
      runId,
    };

    if (!this.connections.has(runId)) {
      this.connections.set(runId, []);
    }

    const runConnections = this.connections.get(runId);
    if (runConnections) {
      runConnections.push(connection);
    }

    return connectionId;
  }

  /**
   * Remove a connection by ID
   * @param connectionId - The connection ID to remove
   */
  removeConnection(connectionId: string): void {
    for (const [runId, connections] of this.connections.entries()) {
      const index = connections.findIndex((c) => c.id === connectionId);
      if (index >= 0) {
        connections.splice(index, 1);

        // Clean up empty run entries
        if (connections.length === 0) {
          this.connections.delete(runId);
        }
        return;
      }
    }
  }

  /**
   * Store an event in the database
   * @param eventInput - The event data to store
   * @returns The stored event with ID, or null if storage failed
   */
  async storeEvent(
    eventInput: CreateSSEEventInput
  ): Promise<{ id: string; createdAt: Date } | null> {
    try {
      const [storedEvent] = await db
        .insert(sseEvents)
        .values({
          runId: eventInput.runId,
          eventType: eventInput.eventType,
          eventData: eventInput.eventData,
        })
        .returning({ id: sseEvents.id, createdAt: sseEvents.createdAt });

      if (!storedEvent) {
        console.error("[SSE] Failed to store event - no result returned", {
          runId: eventInput.runId,
          eventType: eventInput.eventType,
        });
        return null;
      }

      return {
        id: storedEvent.id,
        createdAt: storedEvent.createdAt,
      };
    } catch (error) {
      console.error("[SSE] Failed to store event in database", {
        runId: eventInput.runId,
        eventType: eventInput.eventType,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  /**
   * Broadcast an event to all connections for a specific run
   * Stores the event in the database first, then broadcasts in proper SSE format.
   * @param runId - The run ID to broadcast to
   * @param event - The event data to send
   */
  async broadcast(
    runId: string,
    event: { type: string; data: unknown }
  ): Promise<void> {
    // Store event in database first (await to get event ID)
    const storedEvent = await this.storeEvent({
      runId,
      eventType: event.type as CreateSSEEventInput["eventType"],
      eventData: event.data as CreateSSEEventInput["eventData"],
    });

    // Use stored event ID, or fallback to timestamp-based ID if storage failed
    const eventId =
      storedEvent?.id ||
      `${Date.now()}-${Math.random().toString(36).substring(7)}`;

    // Format event in proper SSE format
    const sseFormattedEvent = `id: ${eventId}\nevent: ${event.type}\ndata: ${JSON.stringify(event.data)}\n\n`;

    const connections = this.connections.get(runId);
    if (!connections || connections.length === 0) {
      return;
    }

    const deadConnections: string[] = [];

    for (const connection of connections) {
      try {
        connection.controller.enqueue(
          new TextEncoder().encode(sseFormattedEvent)
        );
      } catch (error) {
        // Connection is dead, mark for removal
        console.error("[SSE] Failed to send event to connection", {
          connectionId: connection.id,
          runId,
          error,
        });
        deadConnections.push(connection.id);
      }
    }

    // Remove dead connections
    for (const connectionId of deadConnections) {
      this.removeConnection(connectionId);
    }
  }

  /**
   * Get the number of active connections for a run
   * @param runId - The run ID
   * @returns Number of active connections
   */
  getConnectionCount(runId: string): number {
    return this.connections.get(runId)?.length || 0;
  }

  /**
   * Get total number of connections across all runs
   * @returns Total number of connections
   */
  getTotalConnections(): number {
    let total = 0;
    for (const connections of this.connections.values()) {
      total += connections.length;
    }
    return total;
  }
}

// Singleton instance
export const sseConnectionManager = new SSEConnectionManager();
