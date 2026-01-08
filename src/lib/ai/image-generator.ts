import { getImageModel, getReplicateClient } from "@/lib/ai/provider";

type ReplicateModelIdentifier =
  | `${string}/${string}`
  | `${string}/${string}:${string}`;

const replicate = getReplicateClient();
const imageModel = getImageModel();

/**
 * Extract image URL from Replicate API response
 * Handles various response formats: string, array of strings, or objects with url property
 */
function extractImageUrl(output: unknown): string {
  // First, check if this is a Replicate prediction object
  // Prediction objects have 'status' and 'output' fields
  if (
    typeof output === "object" &&
    output !== null &&
    "status" in output &&
    "output" in output
  ) {
    const prediction = output as {
      status: string;
      output: unknown;
      error?: unknown;
    };

    // Check prediction status
    if (prediction.status === "failed" || prediction.error) {
      throw new Error(
        `Replicate prediction failed: ${
          prediction.error ? JSON.stringify(prediction.error) : "Unknown error"
        }`
      );
    }

    if (prediction.status !== "succeeded") {
      throw new Error(
        `Replicate prediction not completed. Status: ${prediction.status}. The prediction may still be processing.`
      );
    }

    // Extract URL from prediction output
    return extractImageUrl(prediction.output);
  }

  // Handle empty array case
  if (Array.isArray(output) && output.length === 0) {
    throw new Error(
      "Replicate API returned empty array - image generation may have failed"
    );
  }

  // Replicate returns an array of URLs for multiple outputs
  if (Array.isArray(output) && output.length > 0) {
    const firstOutput = output[0];

    // Handle empty object in array - Replicate may return objects where the URL
    // is the primitive value (accessible via valueOf() or String conversion)
    if (
      typeof firstOutput === "object" &&
      firstOutput !== null &&
      Object.keys(firstOutput).length === 0
    ) {
      // Check if the object has a valueOf method that returns the URL
      // This is how Replicate SDK returns URLs in some cases
      const stringValue = String(firstOutput);
      const valueOfResult =
        typeof firstOutput.valueOf === "function"
          ? firstOutput.valueOf()
          : null;

      // If String() conversion or valueOf() gives us a URL, use it
      if (typeof stringValue === "string" && stringValue.startsWith("http")) {
        return stringValue;
      }

      if (
        typeof valueOfResult === "string" &&
        valueOfResult.startsWith("http")
      ) {
        return valueOfResult;
      }

      // Log error for empty object case
      console.error(
        "[Replicate] Empty object in array - unexpected output format"
      );

      // Check if output is null/undefined (might be a placeholder)
      if (firstOutput === null || firstOutput === undefined) {
        throw new Error(
          "Replicate API returned null/undefined in output array. The prediction may still be processing."
        );
      }

      // If images are generating successfully in Replicate but we get empty objects,
      // this suggests the SDK might be returning before output is ready
      // or the output format is different than expected
      throw new Error(
        "Replicate API returned empty object in array. Images may be generating successfully in Replicate, but the response format is unexpected. This may require webhook-based handling for async processing."
      );
    }

    // Handle case where array element might be an object with a URL property
    if (typeof firstOutput === "string") {
      return firstOutput;
    }
    if (
      typeof firstOutput === "object" &&
      firstOutput !== null &&
      "url" in firstOutput &&
      typeof (firstOutput as { url: unknown }).url === "string"
    ) {
      return (firstOutput as { url: string }).url;
    }

    // Handle other object types in array (might have different structure)
    if (typeof firstOutput === "object" && firstOutput !== null) {
      // Check for common URL field names
      const urlFields = ["url", "image_url", "output_url", "file"];
      for (const field of urlFields) {
        if (
          field in firstOutput &&
          typeof (firstOutput as Record<string, unknown>)[field] === "string"
        ) {
          return (firstOutput as Record<string, string>)[field];
        }
      }
    }
  }

  // Handle single output case - string
  if (typeof output === "string") {
    return output;
  }

  // Handle single output case - object with URL property
  if (
    typeof output === "object" &&
    output !== null &&
    "url" in output &&
    typeof (output as { url: unknown }).url === "string"
  ) {
    return (output as { url: string }).url;
  }

  // Handle empty object (indicates processing error)
  if (
    typeof output === "object" &&
    output !== null &&
    Object.keys(output).length === 0
  ) {
    throw new Error(
      "Replicate API returned empty object - image generation failed or is still processing"
    );
  }

  console.error("Unexpected Replicate output format", {
    type: typeof output,
    isArray: Array.isArray(output),
  });

  throw new Error(
    `Unexpected output format from Replicate API: ${typeof output}${
      Array.isArray(output) ? " (array)" : ""
    }`
  );
}

/**
 * Generates an image using Replicate based on a text prompt.
 * Uses a fast, high-quality model suitable for fantasy/sci-fi landscapes.
 */
export async function generateUniverseImage(prompt: string): Promise<Buffer> {
  const model = imageModel as ReplicateModelIdentifier;

  const input = {
    prompt: `Epic, highly detailed fantasy illustration, comic book art style, graphic novel panel: ${prompt}. Moebius-inspired art style, vibrant saturated colors, modern graphic novel illustration.`,
    go_fast: true,
    megapixels: "1",
    num_outputs: 1,
    aspect_ratio: "16:9",
    output_format: "webp",
    output_quality: 80,
  };

  try {
    const output = await replicate.run(model, { input });
    const imageUrl = extractImageUrl(output);

    // Download the image from the URL provided by Replicate
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(
        `Failed to download image: ${response.status} ${response.statusText}`
      );
    }
    const arrayBuffer = await response.arrayBuffer();

    return Buffer.from(arrayBuffer);
  } catch (error) {
    console.error("Error generating image with Replicate:", error);
    throw new Error("Failed to generate universe image");
  }
}

/**
 * Generates a character portrait using Replicate based on a text prompt.
 * Optimized for square aspect ratio and character focus.
 */
export async function generateCharacterPortrait(
  prompt: string
): Promise<Buffer> {
  const model = imageModel as ReplicateModelIdentifier;

  const input = {
    prompt: `Character portrait illustration, highly detailed, expressive face, comic book art style, graphic novel panel: ${prompt}. Moebius-inspired art style, vibrant saturated colors, modern graphic novel illustration, centered composition.`,
    go_fast: true,
    megapixels: "1",
    num_outputs: 1,
    aspect_ratio: "1:1", // Square for portraits
    output_format: "webp",
    output_quality: 80,
  };

  try {
    const output = await replicate.run(model, { input });
    const imageUrl = extractImageUrl(output);

    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(
        `Failed to download image: ${response.status} ${response.statusText}`
      );
    }
    const arrayBuffer = await response.arrayBuffer();

    return Buffer.from(arrayBuffer);
  } catch (error) {
    console.error("Error generating character portrait with Replicate:", error);
    throw new Error("Failed to generate character portrait");
  }
}

/**
 * Generates a campaign cover image using Replicate based on a text prompt.
 * Focuses on mood, atmosphere, and genre-blending.
 */
export async function generateCampaignCover(prompt: string): Promise<Buffer> {
  const model = imageModel as ReplicateModelIdentifier;

  const input = {
    prompt: `Campaign cover art illustration, highly detailed, atmospheric, comic book art style, graphic novel panel: ${prompt}. Moebius-inspired art style, vibrant saturated colors, modern graphic novel illustration, dramatic composition.`,
    go_fast: true,
    megapixels: "1",
    num_outputs: 1,
    aspect_ratio: "16:9",
    output_format: "webp",
    output_quality: 80,
  };

  try {
    const output = await replicate.run(model, { input });
    const imageUrl = extractImageUrl(output);

    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(
        `Failed to download image: ${response.status} ${response.statusText}`
      );
    }
    const arrayBuffer = await response.arrayBuffer();

    return Buffer.from(arrayBuffer);
  } catch (error) {
    console.error("Error generating campaign cover with Replicate:", error);
    throw new Error("Failed to generate campaign cover");
  }
}

/**
 * Generate an image using Replicate and return the URL (without downloading)
 * Useful when you need to download and process the image separately (e.g., upload to R2)
 * @param prompt - The detailed prompt for image generation
 * @param modelOverride - Optional model identifier to override the default
 * @param options - Optional generation options
 * @returns Promise<string> - The URL of the generated image
 * @throws Error if generation fails
 */
export async function generateImageUrl(
  prompt: string,
  modelOverride?: string,
  options?: {
    aspectRatio?: string;
    outputFormat?: string;
    outputQuality?: number;
    disableSafetyChecker?: boolean;
  }
): Promise<string> {
  const model = (modelOverride || imageModel) as ReplicateModelIdentifier;

  const input = {
    prompt: prompt,
    go_fast: true, // Use fast mode for consistent behavior with other image generation
    megapixels: "1", // Standard resolution for consistency
    num_outputs: 1,
    aspect_ratio: options?.aspectRatio || "16:9",
    output_format: options?.outputFormat || "webp",
    output_quality: options?.outputQuality || 90,
    disable_safety_checker: options?.disableSafetyChecker ?? true,
  };

  try {
    // Ensure prompt is not too long (Replicate may have limits)
    const maxPromptLength = 2000; // Conservative limit
    const truncatedPrompt =
      prompt.length > maxPromptLength
        ? prompt.substring(0, maxPromptLength).trim()
        : prompt;

    if (truncatedPrompt !== prompt) {
      console.warn(
        `[Replicate] Prompt truncated from ${prompt.length} to ${truncatedPrompt.length} characters`
      );
    }

    const inputWithTruncatedPrompt = {
      ...input,
      prompt: truncatedPrompt,
    };

    let output: unknown;
    try {
      // replicate.run() should automatically wait for prediction completion
      // and return the output directly, but we'll handle both cases
      output = await replicate.run(model, { input: inputWithTruncatedPrompt });
    } catch (runError) {
      console.error("[Replicate] replicate.run() failed");
      throw runError;
    }

    // Check if output is a prediction object (shouldn't happen with replicate.run() but handle it)
    if (
      typeof output === "object" &&
      output !== null &&
      "status" in output &&
      "output" in output
    ) {
      const prediction = output as {
        status: string;
        output: unknown;
        id?: string;
      };

      if (prediction.status === "succeeded") {
        return extractImageUrl(prediction.output);
      } else if (prediction.status === "failed") {
        throw new Error(
          `Replicate prediction failed. Prediction ID: ${
            prediction.id || "unknown"
          }`
        );
      } else {
        throw new Error(
          `Replicate prediction not completed. Status: ${
            prediction.status
          }. Prediction ID: ${prediction.id || "unknown"}`
        );
      }
    }

    // Check if we got an empty object array - this might indicate the prediction is still processing
    // or the response format is unexpected. Try to extract URL anyway, but log warning
    if (
      Array.isArray(output) &&
      output.length > 0 &&
      typeof output[0] === "object" &&
      output[0] !== null &&
      Object.keys(output[0]).length === 0
    ) {
      console.warn(
        "[Replicate] Received empty object in array - this may indicate async processing. Consider using webhook-based approach."
      );
      // Still try to extract URL in case there's a hidden property
      try {
        return extractImageUrl(output);
      } catch (_extractError) {
        // If extraction fails, provide helpful error message
        throw new Error(
          "Replicate returned empty object array. Images may be generating successfully, but the response format is unexpected. Consider using webhook-based image generation for async processing."
        );
      }
    }

    // Check if output indicates an error state
    if (
      Array.isArray(output) &&
      output.length > 0 &&
      typeof output[0] === "object" &&
      output[0] !== null &&
      "error" in output[0]
    ) {
      const errorObj = output[0] as { error?: unknown };
      console.error("[Replicate] Output contains error field");
      throw new Error(
        `Replicate API returned error: ${JSON.stringify(errorObj.error)}`
      );
    }

    return extractImageUrl(output);
  } catch (error) {
    console.error("[Replicate] Image generation failed");

    // Check if error has additional details from Replicate
    if (
      error &&
      typeof error === "object" &&
      "message" in error &&
      typeof error.message === "string"
    ) {
      throw new Error(`Failed to generate image: ${error.message}`);
    }

    throw new Error(
      `Failed to generate image: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

/**
 * Create a Replicate prediction with webhook support for async processing
 * This is an alternative to generateImageUrl() for truly non-blocking image generation
 *
 * @param prompt - The detailed prompt for image generation
 * @param webhookUrl - The webhook URL to receive completion events
 * @param metadata - Metadata to include in the prediction (e.g., runId, sceneId)
 * @param modelOverride - Optional model identifier to override the default
 * @param options - Optional generation options
 * @returns Promise<string> - The prediction ID (not the image URL)
 * @throws Error if prediction creation fails
 */
export async function createImagePrediction(
  prompt: string,
  webhookUrl: string,
  metadata: Record<string, unknown>,
  modelOverride?: string,
  options?: {
    aspectRatio?: string;
    outputFormat?: string;
    outputQuality?: number;
    disableSafetyChecker?: boolean;
  }
): Promise<string> {
  const model = (modelOverride || imageModel) as ReplicateModelIdentifier;

  const input = {
    prompt: prompt,
    go_fast: true,
    megapixels: "1",
    num_outputs: 1,
    aspect_ratio: options?.aspectRatio || "16:9",
    output_format: options?.outputFormat || "webp",
    output_quality: options?.outputQuality || 90,
    disable_safety_checker: options?.disableSafetyChecker ?? true,
    metadata: metadata, // Store runId, sceneId, etc. for webhook processing
  };

  try {
    // Truncate prompt if too long
    const maxPromptLength = 2000;
    const truncatedPrompt =
      prompt.length > maxPromptLength
        ? prompt.substring(0, maxPromptLength).trim()
        : prompt;

    const inputWithTruncatedPrompt = {
      ...input,
      prompt: truncatedPrompt,
    };

    // Use predictions.create() for webhook support
    const prediction = await replicate.predictions.create({
      version: model.includes(":") ? model.split(":")[1] : undefined,
      model: model.includes(":") ? model.split(":")[0] : model,
      input: inputWithTruncatedPrompt,
      webhook: webhookUrl,
      webhook_events_filter: ["completed"], // Only send webhook on completion
    });

    if (!prediction.id) {
      throw new Error(
        "Replicate prediction creation failed: No prediction ID returned"
      );
    }

    return prediction.id;
  } catch (error) {
    console.error("[Replicate] Prediction creation failed");
    throw new Error(
      `Failed to create prediction: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}
