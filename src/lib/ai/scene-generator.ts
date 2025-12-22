import { generateImageUrl } from "@/lib/ai/image-generator";

/**
 * Generate an image using Replicate's Flux Schnell model for scene generation
 * This is a convenience wrapper around generateImageUrl with scene-specific defaults
 * @param prompt - The detailed prompt for image generation
 * @returns Promise<string> - The URL of the generated image
 * @throws Error if generation fails
 */
export async function generateImage(prompt: string): Promise<string> {
  // Use the standard image model (flux-schnell) with scene-specific defaults
  return generateImageUrl(prompt, undefined, {
    aspectRatio: "16:9", // Landscape for scene visuals
    outputFormat: "webp",
    outputQuality: 90,
    disableSafetyChecker: true,
  });
}

/**
 * Validation result type for detailed error reporting
 */
export type ValidationResult =
  | { valid: true }
  | { valid: false; reason: string; details: string };

/**
 * Validate that a prompt is suitable for scene generation
 * @param prompt - The prompt to validate
 * @returns ValidationResult - Detailed validation result with error information
 */
export function validateScenePrompt(prompt: string): ValidationResult {
  const trimmed = prompt.trim();

  if (trimmed.length < 10) {
    return {
      valid: false,
      reason: "too_short",
      details: `Prompt is ${trimmed.length} characters, minimum is 10`,
    };
  }

  if (trimmed.length > 1000) {
    return {
      valid: false,
      reason: "too_long",
      details: `Prompt is ${trimmed.length} characters, maximum is 1000`,
    };
  }

  if (/\b(nsfw|nsfl|violent|gore|explicit)\b/i.test(trimmed)) {
    return {
      valid: false,
      reason: "content_filter",
      details: "Prompt contains filtered content",
    };
  }

  return { valid: true };
}

/**
 * Generate a standardized scene prompt with safety checks
 * @param basePrompt - The raw prompt from the agent (already includes scene type-specific composition)
 * @param characterAppearance - Optional character appearance description
 * @param universeStyle - Optional universe visual style
 * @returns string - A validated and enhanced prompt
 * @throws Error with detailed message if validation fails and cannot be fixed
 */
export function createScenePrompt(
  basePrompt: string,
  characterAppearance?: string,
  universeStyle?: string
): string {
  let prompt = basePrompt.trim();

  // Check if quality instructions are already present
  const hasQualityKeywords =
    /(high quality|detailed|cinematic|professional|illustration)/i.test(prompt);

  // Add character appearance if provided and not already in prompt
  if (characterAppearance && !prompt.includes(characterAppearance)) {
    const potentialLength = `${characterAppearance}. ${prompt}`.length;
    if (potentialLength <= 950) {
      prompt = `${characterAppearance}. ${prompt}`;
    }
  }

  // Add universe style if provided and not already in prompt
  if (universeStyle && !prompt.includes(universeStyle)) {
    const potentialLength = `${prompt}. Style: ${universeStyle}`.length;
    if (potentialLength <= 950) {
      prompt = `${prompt}. Style: ${universeStyle}`;
    }
  }

  // Only add quality text if not already present and we have room
  if (!hasQualityKeywords && prompt.length <= 850) {
    prompt = `${prompt}. High quality, detailed, cinematic, digital art, vivid colors, professional illustration.`;
  }

  // Check length and truncate if needed (preserve core content)
  if (prompt.length > 1000) {
    // Try to truncate intelligently at sentence boundaries
    const sentences = prompt.match(/[^.!?]+[.!?]+/g) || [];
    let truncated = "";
    for (const sentence of sentences) {
      if ((truncated + sentence).length <= 950) {
        truncated += sentence;
      } else {
        break;
      }
    }
    prompt = truncated || prompt.substring(0, 950).trim();
  }

  // Validate the prompt
  const validation = validateScenePrompt(prompt);
  if (!validation.valid) {
    // If validation fails, try to create a minimal valid prompt
    if (validation.reason === "too_short") {
      prompt = `${prompt}. Scene illustration.`.substring(0, 1000);
    } else if (validation.reason === "too_long") {
      // Already handled above, but ensure it's valid
      prompt = prompt.substring(0, 1000).trim();
    } else {
      // Content filter - can't fix, throw with details
      throw new Error(
        `Generated prompt failed validation: ${validation.reason}. ${validation.details}`
      );
    }

    // Re-validate after fix attempt
    const revalidation = validateScenePrompt(prompt);
    if (!revalidation.valid) {
      throw new Error(
        `Could not create valid prompt: ${revalidation.reason}. ${revalidation.details}. Original prompt length: ${basePrompt.length}`
      );
    }
  }

  return prompt;
}
