import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { runs } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
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

    // Create SSE stream
    const stream = new ReadableStream({
      start(controller) {
        // Send initial connection message
        const welcomeMessage = `: SSE connection established for run ${runId}\n\n`;
        controller.enqueue(new TextEncoder().encode(welcomeMessage));

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
