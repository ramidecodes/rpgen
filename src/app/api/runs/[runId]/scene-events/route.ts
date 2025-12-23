import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { runs, sseEvents } from "@/lib/db/schema";
import { eq, and, gt, asc } from "drizzle-orm";
import { getUserProfileByClerkId } from "@/lib/db/queries/user-profile";
import { sseConnectionManager } from "@/lib/sse/connection-manager";

/**
 * SSE endpoint for real-time scene update events
 *
 * Clients subscribe to this endpoint to receive instant notifications
 * when new scenes are generated for a run.
 *
 * GET /api/runs/[runId]/scene-events
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  try {
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      return new Response("Unauthorized", { status: 401 });
    }

    const userProfile = await getUserProfileByClerkId(clerkUserId);
    if (!userProfile) {
      return new Response("User profile not found", { status: 404 });
    }

    const { runId } = await params;

    // Verify run exists and user owns it
    const [run] = await db
      .select()
      .from(runs)
      .where(eq(runs.id, runId))
      .limit(1);

    if (!run) {
      return new Response("Run not found", { status: 404 });
    }

    if (run.userId !== userProfile.id) {
      return new Response("Unauthorized", { status: 403 });
    }

    // Get lastEventId from query parameter (EventSource doesn't support custom headers)
    const { searchParams } = new URL(req.url);
    const lastEventIdParam = searchParams.get("lastEventId");

    // Query for missed events if lastEventId is provided
    let missedEvents: Array<{
      id: string;
      eventType: string;
      eventData: unknown;
      createdAt: Date;
    }> = [];

    if (lastEventIdParam) {
      try {
        // Validate UUID format
        const uuidRegex =
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (uuidRegex.test(lastEventIdParam)) {
          // Query for events after the lastEventId
          // Use both UUID comparison and timestamp comparison for reliability
          const lastEvent = await db
            .select()
            .from(sseEvents)
            .where(eq(sseEvents.id, lastEventIdParam))
            .limit(1);

          if (lastEvent.length > 0) {
            const lastEventTime = lastEvent[0].createdAt;
            // Get events after this timestamp
            // Note: UUID comparison is not truly ordered, so we use timestamp as primary ordering
            missedEvents = await db
              .select({
                id: sseEvents.id,
                eventType: sseEvents.eventType,
                eventData: sseEvents.eventData,
                createdAt: sseEvents.createdAt,
              })
              .from(sseEvents)
              .where(
                and(
                  eq(sseEvents.runId, runId),
                  gt(sseEvents.createdAt, lastEventTime)
                )
              )
              .orderBy(asc(sseEvents.createdAt), asc(sseEvents.id))
              .limit(100); // Prevent sending too many events on reconnect
          } else {
            // Invalid lastEventId - send recent events as fallback
            missedEvents = await db
              .select({
                id: sseEvents.id,
                eventType: sseEvents.eventType,
                eventData: sseEvents.eventData,
                createdAt: sseEvents.createdAt,
              })
              .from(sseEvents)
              .where(eq(sseEvents.runId, runId))
              .orderBy(asc(sseEvents.createdAt), asc(sseEvents.id))
              .limit(10);
          }
        } else {
          // Invalid UUID format - send recent events as fallback
          missedEvents = await db
            .select({
              id: sseEvents.id,
              eventType: sseEvents.eventType,
              eventData: sseEvents.eventData,
              createdAt: sseEvents.createdAt,
            })
            .from(sseEvents)
            .where(eq(sseEvents.runId, runId))
            .orderBy(sseEvents.createdAt, sseEvents.id)
            .limit(10);
        }
      } catch (error) {
        console.error("[SSE] Error querying missed events", {
          runId,
          lastEventId: lastEventIdParam,
          error: error instanceof Error ? error.message : String(error),
        });
        // Continue without catch-up events if query fails
      }
    } else {
      // No lastEventId provided - send recent events (last 10 or last 5 minutes)
      try {
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        missedEvents = await db
          .select({
            id: sseEvents.id,
            eventType: sseEvents.eventType,
            eventData: sseEvents.eventData,
            createdAt: sseEvents.createdAt,
          })
          .from(sseEvents)
          .where(
            and(
              eq(sseEvents.runId, runId),
              gt(sseEvents.createdAt, fiveMinutesAgo)
            )
          )
          .orderBy(asc(sseEvents.createdAt), asc(sseEvents.id))
          .limit(10);
      } catch (error) {
        console.error("[SSE] Error querying recent events", {
          runId,
          error: error instanceof Error ? error.message : String(error),
        });
        // Continue without catch-up events if query fails
      }
    }

    // Create SSE stream
    const stream = new ReadableStream({
      start(controller) {
        // Send retry field for reconnection delay (3 seconds)
        const retryMessage = `retry: 3000\n\n`;
        controller.enqueue(new TextEncoder().encode(retryMessage));

        // Send initial connection message
        const welcomeMessage = `: SSE connection established for run ${runId}\n\n`;
        controller.enqueue(new TextEncoder().encode(welcomeMessage));

        // Send missed events immediately after connection (in chronological order)
        for (const missedEvent of missedEvents) {
          try {
            const sseFormattedEvent = `id: ${missedEvent.id}\nevent: ${missedEvent.eventType}\ndata: ${JSON.stringify(missedEvent.eventData)}\n\n`;
            controller.enqueue(new TextEncoder().encode(sseFormattedEvent));
          } catch (error) {
            console.error("[SSE] Failed to send catch-up event", {
              eventId: missedEvent.id,
              runId,
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }

        // Add connection to manager
        const connectionId = sseConnectionManager.addConnection(
          runId,
          controller
        );

        // Send keepalive comments periodically (every 30 seconds)
        const keepaliveInterval = setInterval(() => {
          try {
            const keepalive = `: keepalive ${Date.now()}\n\n`;
            controller.enqueue(new TextEncoder().encode(keepalive));
          } catch (_error) {
            // Connection is dead, stop keepalive
            clearInterval(keepaliveInterval);
            sseConnectionManager.removeConnection(connectionId);
          }
        }, 30000);

        // Handle client disconnect
        req.signal.addEventListener("abort", () => {
          clearInterval(keepaliveInterval);
          sseConnectionManager.removeConnection(connectionId);
          try {
            controller.close();
          } catch (_error) {
            // Connection already closed, ignore
          }
        });
      },
    });

    // Return SSE response with proper headers
    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no", // Disable nginx buffering
      },
    });
  } catch (error) {
    console.error("[SSE] Error setting up SSE connection", error);
    return new Response(
      error instanceof Error ? error.message : "Internal server error",
      { status: 500 }
    );
  }
}
