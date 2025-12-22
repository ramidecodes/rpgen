import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { scenes, runs } from "@/lib/db/schema";
import { eq, desc, isNull } from "drizzle-orm";
import { uploadImage } from "@/lib/storage/r2";
import { getPublicUrl } from "@/lib/storage/r2";
import { sseConnectionManager } from "@/lib/sse/connection-manager";
import crypto from "node:crypto";

/**
 * Constant-time string comparison to prevent timing attacks
 */
function constantTimeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

/**
 * Get Replicate webhook signing key (base64-encoded)
 * Checks environment variable first, then falls back to API fetch
 */
let REPLICATE_SIGNING_KEY_B64: string | null = null;
async function getReplicateSigningKeyBase64(): Promise<string> {
  if (REPLICATE_SIGNING_KEY_B64) return REPLICATE_SIGNING_KEY_B64;

  // Try environment variable first
  const envSecret = process.env.REPLICATE_WEBHOOK_SECRET_B64;
  if (envSecret) {
    REPLICATE_SIGNING_KEY_B64 = envSecret.replace(/^whsec_?/, "");
    return REPLICATE_SIGNING_KEY_B64;
  }

  // Fallback to fetching from Replicate API
  const apiToken = process.env.REPLICATE_API_TOKEN;
  if (!apiToken) {
    throw new Error(
      "REPLICATE_WEBHOOK_SECRET_B64 or REPLICATE_API_TOKEN environment variable is required"
    );
  }

  const res = await fetch(
    "https://api.replicate.com/v1/webhooks/default/secret",
    {
      headers: { Authorization: `Token ${apiToken}` },
      cache: "no-store",
    }
  );

  if (!res.ok) {
    throw new Error(
      `Failed to fetch webhook secret: ${res.status} ${res.statusText}`
    );
  }

  const { key } = (await res.json()) as { key: string };
  REPLICATE_SIGNING_KEY_B64 = key.replace(/^whsec_?/, "");

  return REPLICATE_SIGNING_KEY_B64;
}

/**
 * Validate Replicate webhook signature
 * Replicate uses HMAC-SHA256 with webhook-id, webhook-timestamp, and body
 */
function validateReplicateWebhook(
  body: string,
  id: string,
  timestamp: string,
  signature: string,
  secretB64: string
): boolean {
  // Decode secret from base64 to Buffer (not UTF-8 string)
  const key = Buffer.from(secretB64, "base64");

  // Create signed content: id.timestamp.body
  const signedContent = `${id}.${timestamp}.${body}`;

  // Compute HMAC
  const hmac = crypto
    .createHmac("sha256", key)
    .update(signedContent)
    .digest("base64");

  // Parse signature header: "v1,<base64> v1,<base64>" (space-separated)
  const signatureParts = signature.split(" ");
  const candidates = signatureParts
    .map((part) => {
      const [version, sig] = part.split(",");
      return version === "v1" ? sig : null;
    })
    .filter((sig): sig is string => sig !== null);

  // Check if any candidate matches (constant-time)
  const ok = candidates.some((candidate) => constantTimeEqual(candidate, hmac));

  // Check timestamp freshness (within 5 minutes)
  const fresh = Math.abs(Date.now() / 1000 - Number(timestamp)) < 5 * 60;

  return ok && fresh;
}

/**
 * Webhook endpoint for Replicate prediction completion events
 *
 * Replicate will POST to this endpoint when a prediction completes.
 * This allows truly non-blocking image generation.
 *
 * For local development, use ngrok to expose this endpoint:
 * ngrok http 3000
 * Then set the webhook URL in Replicate dashboard or via API
 */
export async function POST(req: NextRequest) {
  try {
    // Get raw body for signature validation
    const rawBody = await req.text();

    let body: Record<string, unknown>;
    try {
      body = JSON.parse(rawBody);
    } catch (error) {
      console.error("[Webhook] Invalid JSON payload", error);
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    // Read correct headers
    const id = req.headers.get("webhook-id") ?? "";
    const ts = req.headers.get("webhook-timestamp") ?? "";
    const sig = req.headers.get("webhook-signature") ?? "";

    // Validate signature
    try {
      const secretB64 = await getReplicateSigningKeyBase64();

      if (!validateReplicateWebhook(rawBody, id, ts, sig, secretB64)) {
        console.error("[Webhook] Invalid signature or stale timestamp", {
          webhookId: id,
          hasTimestamp: !!ts,
          hasSignature: !!sig,
          timestampAge: Math.abs(Date.now() / 1000 - Number(ts)),
        });
        return NextResponse.json(
          { error: "Invalid signature or stale timestamp" },
          { status: 400 }
        );
      }
    } catch (error) {
      // In development, allow without validation if secret not configured
      if (process.env.NODE_ENV === "development") {
        console.warn(
          "[Webhook] Signature validation skipped (development mode)",
          error
        );
      } else {
        console.error("[Webhook] Signature validation error", error);
        return NextResponse.json(
          { error: "Cannot verify webhook" },
          { status: 400 }
        );
      }
    }

    const {
      id: predictionId,
      status,
      output,
      error: payloadError,
      input,
    } = body;

    if (!predictionId) {
      console.error("[Webhook] Missing prediction ID", { webhookId: id });
      return NextResponse.json(
        { error: "Missing prediction ID" },
        { status: 400 }
      );
    }

    // Process prediction event

    // Handle intermediate statuses (respond quickly)
    if (status === "processing" || status === "starting") {
      return NextResponse.json({ received: true });
    }

    // Handle terminal failure states (respond quickly)
    if (status === "failed" || status === "canceled") {
      console.error("[Webhook] Prediction failed/canceled", {
        webhookId: id,
        predictionId,
        status,
        error: payloadError,
      });
      // Optionally: Update scene record with error status if we have metadata
      return NextResponse.json({ received: true });
    }

    // Only process succeeded predictions
    if (status !== "succeeded") {
      return NextResponse.json({ received: true });
    }

    // Extract metadata from input (we store runId and sceneId in input.metadata)
    // Replicate passes metadata through the input object
    // Try multiple extraction methods
    let metadata: { runId?: string; sceneId?: string } | undefined;
    let runId: string;
    let sceneId: string;

    // Method 1: input.metadata (expected format)
    if (input && typeof input === "object" && input !== null) {
      if ("metadata" in input) {
        const inputMetadata = (input as { metadata?: unknown }).metadata;
        if (
          inputMetadata &&
          typeof inputMetadata === "object" &&
          inputMetadata !== null
        ) {
          metadata = inputMetadata as { runId?: string; sceneId?: string };
        }
      }

      // Method 2: Direct on input object (fallback)
      if (!metadata && "runId" in input && "sceneId" in input) {
        metadata = {
          runId: input.runId as string,
          sceneId: input.sceneId as string,
        };
      }
    }

    // Check if we have valid metadata, otherwise try fallback
    if (metadata?.runId && metadata?.sceneId) {
      runId = metadata.runId;
      sceneId = metadata.sceneId;
    } else {
      // Method 3: Fallback - find most recent pending scene
      console.error("[Webhook] Missing metadata in prediction input", {
        predictionId,
      });

      try {
        // Find the most recent scene with null imageUrl
        const pendingScenes = await db
          .select()
          .from(scenes)
          .where(isNull(scenes.imageUrl))
          .orderBy(desc(scenes.createdAt))
          .limit(5);

        if (pendingScenes.length > 0) {
          // Use the most recent pending scene
          const fallbackScene = pendingScenes[0];

          // Verify the scene belongs to a valid run
          const [fallbackRun] = await db
            .select()
            .from(runs)
            .where(eq(runs.id, fallbackScene.runId))
            .limit(1);

          if (fallbackRun) {
            runId = fallbackScene.runId;
            sceneId = fallbackScene.id;
          } else {
            console.error("[Webhook] Fallback scene's run not found");
            return NextResponse.json(
              { error: "Missing metadata and fallback failed" },
              { status: 400 }
            );
          }
        } else {
          console.error("[Webhook] No pending scenes found for fallback");
          return NextResponse.json(
            { error: "Missing metadata (runId, sceneId)" },
            { status: 400 }
          );
        }
      } catch (fallbackError) {
        console.error("[Webhook] Fallback lookup failed", fallbackError);
        return NextResponse.json(
          { error: "Missing metadata (runId, sceneId)" },
          { status: 400 }
        );
      }
    }

    // Extract image URL from output
    // Process output

    if (!output || !Array.isArray(output) || output.length === 0) {
      console.error("[Webhook] Invalid output format", {
        predictionId,
        output,
        outputType: typeof output,
        isArray: Array.isArray(output),
      });
      return NextResponse.json(
        { error: "Invalid output format" },
        { status: 400 }
      );
    }

    const imageUrl = output[0];
    if (typeof imageUrl !== "string" || !imageUrl) {
      console.error("[Webhook] Invalid image URL in output", {
        predictionId,
        imageUrl,
        imageUrlType: typeof imageUrl,
      });
      return NextResponse.json({ error: "Invalid image URL" }, { status: 400 });
    }

    // Verify scene exists and belongs to the run
    const [scene] = await db
      .select()
      .from(scenes)
      .where(eq(scenes.id, sceneId))
      .limit(1);

    if (!scene) {
      console.error("[Webhook] Scene not found", {
        sceneId,
        runId,
        predictionId,
      });
      return NextResponse.json({ error: "Scene not found" }, { status: 404 });
    }

    if (scene.runId !== runId) {
      console.error("[Webhook] Scene runId mismatch", {
        sceneId,
        sceneRunId: scene.runId,
        expectedRunId: runId,
        predictionId,
      });
      return NextResponse.json(
        { error: "Scene runId mismatch" },
        { status: 400 }
      );
    }

    // Download image from Replicate URL
    let imageResponse: Response;
    try {
      imageResponse = await fetch(imageUrl);
      if (!imageResponse.ok) {
        throw new Error(
          `Failed to download image: ${imageResponse.status} ${imageResponse.statusText}`
        );
      }
    } catch (fetchError) {
      console.error("[Webhook] Failed to download image from Replicate", {
        predictionId,
        sceneId,
        imageUrl: imageUrl.substring(0, 100),
        error:
          fetchError instanceof Error ? fetchError.message : String(fetchError),
      });
      throw fetchError;
    }

    const arrayBuffer = await imageResponse.arrayBuffer();
    const imageBuffer = Buffer.from(arrayBuffer);

    // Get userId from run for R2 path
    const [runData] = await db
      .select({ userId: runs.userId })
      .from(runs)
      .where(eq(runs.id, runId))
      .limit(1);

    if (!runData) {
      throw new Error(`Run not found: ${runId}`);
    }

    // Construct R2 storage key: <user-id>/runs/<run-id>/scenes/<scene-id>.webp
    const r2Key = `${runData.userId}/runs/${runId}/scenes/${sceneId}.webp`;

    // Upload image to R2

    let storedKey: string;
    try {
      const uploadResult = await uploadImage(imageBuffer, r2Key, "image/webp");
      storedKey = uploadResult.key;
    } catch (uploadError) {
      console.error("[Webhook] Failed to upload image to R2", {
        predictionId,
        sceneId,
        r2Key,
        error:
          uploadError instanceof Error
            ? uploadError.message
            : String(uploadError),
      });
      throw uploadError;
    }

    // Update scene record with R2 key (not URL - URLs are generated on-demand)

    try {
      await db
        .update(scenes)
        .set({
          imageUrl: storedKey, // Store R2 key, not signed URL (keys are permanent, URLs expire)
        })
        .where(eq(scenes.id, sceneId));
    } catch (updateError) {
      console.error("[Webhook] Failed to update scene record", {
        predictionId,
        sceneId,
        error:
          updateError instanceof Error
            ? updateError.message
            : String(updateError),
      });
      throw updateError;
    }

    // Update run's current scene if this is the latest scene
    try {
      await db
        .update(runs)
        .set({
          currentSceneId: sceneId,
          updatedAt: new Date(),
        })
        .where(eq(runs.id, runId));
    } catch (updateError) {
      console.error("[Webhook] Failed to update run currentSceneId", {
        predictionId,
        sceneId,
        runId,
        error:
          updateError instanceof Error
            ? updateError.message
            : String(updateError),
      });
      // Don't throw - scene is already updated, this is less critical
    }

    // Generate URL for SSE broadcast (one-time use for immediate display)
    const publicUrl = await getPublicUrl(storedKey);

    // Notify SSE clients about the scene update
    try {
      await sseConnectionManager.broadcast(runId, {
        type: "scene-updated",
        data: {
          sceneId,
          runId,
          imageUrl: publicUrl, // URL for immediate display (not stored in DB)
        },
      });
    } catch (broadcastError) {
      console.error("[Webhook] Failed to broadcast SSE event", {
        predictionId,
        sceneId,
        runId,
        error:
          broadcastError instanceof Error
            ? broadcastError.message
            : String(broadcastError),
      });
      // Don't throw - scene is already updated, SSE is just for UI
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Webhook] Error processing Replicate webhook", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      errorType: error instanceof Error ? error.constructor.name : typeof error,
    });
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
