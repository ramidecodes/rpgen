import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import Replicate from "replicate";

// ============================================================================
// Types
// ============================================================================

export type TextModelCategory = "free" | "base" | "reasoning";

export type ImageModelCategory = "standard";

export type ModelIdentifier = string;

export type TextModelRegistry = Record<TextModelCategory, ModelIdentifier>;

export type ImageModelRegistry = Record<ImageModelCategory, ModelIdentifier>;

export type ModelRegistry = {
  text: TextModelRegistry;
  image: ImageModelRegistry;
};

// ============================================================================
// Model Registries
// ============================================================================

const TEXT_MODELS: TextModelRegistry = {
  free: "mistralai/mistral-small-3.1-24b-instruct:free",
  base: "x-ai/grok-4.1-fast",
  reasoning: "x-ai/grok-4.1-fast",
};

const IMAGE_MODELS: ImageModelRegistry = {
  standard: "black-forest-labs/flux-schnell",
};

// ============================================================================
// Helper Functions
// ============================================================================

const requireEnv = (value: string | undefined, name: string): string => {
  if (!value) {
    throw new Error(`${name} is not configured`);
  }

  return value;
};

const assertModelConfigured = (
  identifier: ModelIdentifier | undefined,
  category: string
): ModelIdentifier => {
  if (!identifier) {
    throw new Error(`Model not configured for category "${category}"`);
  }

  return identifier;
};

// ============================================================================
// Provider Clients (Singletons)
// ============================================================================

let openRouterClient: ReturnType<typeof createOpenRouter> | null = null;
let replicateClient: Replicate | null = null;

/**
 * Returns a singleton OpenRouter client configured with the project API key.
 * Throws if `OPENROUTER_API_KEY` is missing to surface configuration issues early.
 * Includes required headers for paid models (HTTP-Referer and X-Title).
 *
 * Required environment variable:
 * - OPENROUTER_API_KEY: Your OpenRouter API key
 *
 * Optional environment variable (for paid models):
 * - NEXT_PUBLIC_SITE_URL: Production site URL for HTTP-Referer header (defaults to "https://rpgen-ai.vercel.app" in production)
 *
 * In development, HTTP-Referer defaults to "http://localhost:3000".
 */
export const getOpenRouterClient = (): ReturnType<typeof createOpenRouter> => {
  if (openRouterClient) {
    return openRouterClient;
  }

  const apiKey = requireEnv(
    process.env.OPENROUTER_API_KEY,
    "OPENROUTER_API_KEY"
  );
  const referer =
    process.env.NEXT_PUBLIC_SITE_URL || "https://rpgen-ai.vercel.app";

  openRouterClient = createOpenRouter({
    apiKey,
    compatibility: "strict",
    headers: {
      "HTTP-Referer": referer,
      "X-Title": "RPG Generator",
    },
    // Configure provider routing at the client level to avoid Azure routing issues
    // This applies to all requests made through this client
    extraBody: {
      provider: {
        ignore: ["azure"],
      },
    },
  });

  return openRouterClient;
};

/**
 * Returns a singleton Replicate client configured with the project API token.
 * Throws if `REPLICATE_API_TOKEN` is missing to surface configuration issues early.
 */
export const getReplicateClient = (): Replicate => {
  if (replicateClient) {
    return replicateClient;
  }

  const auth = requireEnv(
    process.env.REPLICATE_API_TOKEN,
    "REPLICATE_API_TOKEN"
  );
  replicateClient = new Replicate({ auth });

  return replicateClient;
};

// ============================================================================
// Model Registry Functions
// ============================================================================

const modelRegistry: ModelRegistry = {
  text: TEXT_MODELS,
  image: IMAGE_MODELS,
};

/**
 * Returns the configured text model identifier for the given category.
 * Throws if no model is configured to avoid silent fallbacks.
 */
export const getTextModel = (category: TextModelCategory): ModelIdentifier => {
  const model = modelRegistry.text[category];

  return assertModelConfigured(model, `text:${category}`);
};

/**
 * Returns the configured image model identifier for the given category.
 * Defaults to the standard image generation model.
 */
export const getImageModel = (
  category: ImageModelCategory = "standard"
): ModelIdentifier => {
  const model = modelRegistry.image[category];

  return assertModelConfigured(model, `image:${category}`);
};

/**
 * Provides a read-only view of the configured model registry for debugging or introspection.
 */
export const getModelRegistry = (): ModelRegistry => modelRegistry;
