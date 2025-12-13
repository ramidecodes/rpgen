/**
 * SSE Connection Manager
 * 
 * Manages Server-Sent Events (SSE) connections for real-time scene updates.
 * Supports multiple clients subscribing to the same run.
 */

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

    console.log("[SSE] Connection added", {
      connectionId,
      runId,
      totalConnections: runConnections?.length || 0,
    });

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
        console.log("[SSE] Connection removed", {
          connectionId,
          runId,
          remainingConnections: connections.length,
        });

        // Clean up empty run entries
        if (connections.length === 0) {
          this.connections.delete(runId);
        }
        return;
      }
    }
  }

  /**
   * Broadcast an event to all connections for a specific run
   * @param runId - The run ID to broadcast to
   * @param event - The event data to send
   */
  broadcast(runId: string, event: { type: string; data: unknown }): void {
    const connections = this.connections.get(runId);
    if (!connections || connections.length === 0) {
      console.log("[SSE] No connections to broadcast to", { runId });
      return;
    }

    const eventData = `data: ${JSON.stringify(event)}\n\n`;
    const deadConnections: string[] = [];

    for (const connection of connections) {
      try {
        connection.controller.enqueue(
          new TextEncoder().encode(eventData)
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

    console.log("[SSE] Event broadcasted", {
      runId,
      eventType: event.type,
      sentTo: connections.length - deadConnections.length,
      failed: deadConnections.length,
    });
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

