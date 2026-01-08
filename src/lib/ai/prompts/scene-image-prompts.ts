/**
 * VEA Scene Image Prompt Builder
 *
 * Centralized module for building scene image prompts with comic-book / Moebius style.
 * This module ensures consistent comic-book illustration style across all VEA-generated images.
 */

export type SceneType = "portrait" | "wide-shot" | "detail-shot";

export type ScenePromptContext = {
  characterAppearance?: string;
  characterProfession?: string;
  currentNarrative: string;
  universeVisualStyle?: string;
  campaignGenres: string[];
  locationContext?: string;
  sceneType: SceneType;
  compositionGuidance?: string;
};

export type ScenePromptResult = {
  prompt: string;
  components: {
    character: string;
    environment: string;
    style: string;
    genres: string[];
    sceneType: SceneType;
    composition: string;
    negativePrompt: string;
  };
};

/**
 * Comic-book / Moebius style tokens that should always be included in VEA prompts
 */
const COMIC_BOOK_STYLE_TOKENS =
  "Moebius-inspired art style, clean fluid lines, intricate detailed linework, vibrant saturated colors, rich color palette, modern graphic novel illustration, sophisticated composition, realistic proportions, classy fantasy art, D&D fantasy illustration style, high quality detailed art, professional illustration, comic book art style, graphic novel panel, illustrated scene";

/**
 * Get genre-appropriate visual style keywords
 */
function getGenreVisualStyles(genres: string[]): string[] {
  const genreStyleMap: Record<string, string> = {
    fantasy: "fantasy illustration",
    "sci-fi": "sci-fi illustration",
    horror: "dark fantasy illustration",
    mystery: "noir illustration",
    adventure: "adventure illustration",
  };

  return genres
    .map((genre) => genreStyleMap[genre.toLowerCase()])
    .filter(Boolean) as string[];
}

/**
 * Build portrait scene prompt (character-focused, close-up)
 */
function buildPortraitPrompt(context: ScenePromptContext): {
  prompt: string;
  negativePrompt: string;
} {
  let prompt = "";
  let negativePrompt = "";

  // Lead with character appearance and expression
  if (context.characterAppearance) {
    prompt += `${context.characterAppearance}`;
    if (context.characterProfession) {
      prompt += `, a ${context.characterProfession.toLowerCase()}`;
    }
    prompt +=
      ", expressive face, close-up portrait illustration, character-centered composition";
  }

  // Add narrative as background context
  if (context.currentNarrative) {
    prompt += `. ${context.currentNarrative} (environment as background context only, out of focus). `;
  }

  // Portrait-specific composition (illustration terms, not photography)
  if (context.compositionGuidance) {
    prompt += `${context.compositionGuidance}. `;
  } else {
    prompt +=
      "Close-up illustration, character fills 70-80% of frame, centered composition, expressive lighting, character portrait, detailed facial expression, comic book panel style. ";
  }

  // No negative prompt needed for portrait (this is the default)
  return { prompt, negativePrompt };
}

/**
 * Build wide-shot scene prompt (environment-focused, establishing view)
 */
function buildWideShotPrompt(context: ScenePromptContext): {
  prompt: string;
  negativePrompt: string;
} {
  let prompt = "";
  let negativePrompt = "";

  // Lead with location/environment description (NOT character)
  if (context.locationContext) {
    prompt += `${context.locationContext}, `;
  }

  // Narrative with environmental emphasis (lead with environment)
  prompt += `${context.currentNarrative}, `;

  // Character mentioned late as small element
  if (context.characterAppearance) {
    prompt += `small figure in distance (${context.characterAppearance}), character visible but NOT the focus, `;
  }

  // Wide shot-specific composition (illustration terms, not photography)
  prompt +=
    "establishing shot illustration, wide-angle perspective, landscape composition, environmental storytelling, rule of thirds, atmospheric depth, panoramic view, comic book panel style. ";

  if (context.compositionGuidance) {
    prompt += `${context.compositionGuidance}. `;
  } else {
    prompt +=
      "Character occupies less than 20% of frame, environment is primary subject, environmental focus, illustrated landscape. ";
  }

  // Negative prompts to prevent portrait bias
  negativePrompt =
    "NOT a character portrait, NOT close-up, NOT character-focused, character is secondary element, avoid character filling frame, NOT photographic, NOT realistic photo";

  return { prompt, negativePrompt };
}

/**
 * Build detail-shot scene prompt (object/action-focused, close-up)
 */
function buildDetailShotPrompt(context: ScenePromptContext): {
  prompt: string;
  negativePrompt: string;
} {
  let prompt = "";
  let negativePrompt = "";

  // Lead with object/action description (NOT character)
  prompt += `${context.currentNarrative}, `;

  // Character mentioned only if hands/partial view relevant
  if (context.characterAppearance) {
    prompt += `${context.characterAppearance} (hands/partial view only, character face NOT visible), `;
  }

  // Detail shot-specific composition (illustration terms, not photography)
  prompt +=
    "extreme close-up illustration, detailed focus on object/item, tight framing on specific element, detail-oriented composition, macro illustration style, comic book panel detail, illustrated close-up. ";

  if (context.compositionGuidance) {
    prompt += `${context.compositionGuidance}. `;
  } else {
    prompt +=
      "Object in sharp focus, character hands/partial view if relevant, character face not visible, illustrated detail. ";
  }

  // Negative prompts to prevent portrait bias
  negativePrompt =
    "NOT a character portrait, NOT full body shot, NOT character face visible, NOT character-centered, avoid showing character's full face, NOT photographic, NOT realistic photo";

  return { prompt, negativePrompt };
}

/**
 * Append comic-book / Moebius style to a prompt
 * This ensures all VEA-generated images have consistent comic-book illustration style
 */
function appendComicBookStyle(
  prompt: string,
  genres: string[],
  universeVisualStyle?: string
): string {
  let styledPrompt = prompt;

  // Add universe visual style if provided
  if (universeVisualStyle) {
    styledPrompt += `Visual style: ${universeVisualStyle}. `;
  }

  // Add genre-appropriate aesthetics
  const genreStyles = getGenreVisualStyles(genres);
  if (genreStyles.length > 0) {
    styledPrompt += `Art style: ${genreStyles.join(", ")}. `;
  }

  // Always append comic-book / Moebius style tokens
  styledPrompt += COMIC_BOOK_STYLE_TOKENS;

  return styledPrompt;
}

/**
 * Build a complete scene image prompt with comic-book / Moebius style
 *
 * This is the main entry point for VEA scene image prompt generation.
 * It handles scene-type-specific composition and ensures comic-book style is always applied.
 */
export function buildSceneImagePrompt(
  context: ScenePromptContext
): ScenePromptResult {
  let prompt = "";
  let negativePrompt = "";

  // Build scene-type-specific prompt
  switch (context.sceneType) {
    case "portrait": {
      const result = buildPortraitPrompt(context);
      prompt = result.prompt;
      negativePrompt = result.negativePrompt;
      break;
    }
    case "wide-shot": {
      const result = buildWideShotPrompt(context);
      prompt = result.prompt;
      negativePrompt = result.negativePrompt;
      break;
    }
    case "detail-shot": {
      const result = buildDetailShotPrompt(context);
      prompt = result.prompt;
      negativePrompt = result.negativePrompt;
      break;
    }
    default: {
      // Fallback: Default to wide-shot for variety (safer than portrait)
      const result = buildWideShotPrompt(context);
      prompt = result.prompt;
      negativePrompt = result.negativePrompt;
    }
  }

  // Append comic-book style (this is critical for consistent comic-book look)
  prompt = appendComicBookStyle(
    prompt,
    context.campaignGenres,
    context.universeVisualStyle
  );

  // Append negative prompt if present (some models support negative prompts)
  const finalPrompt = negativePrompt
    ? `${prompt.trim()} | Negative: ${negativePrompt}`
    : prompt.trim();

  return {
    prompt: finalPrompt,
    components: {
      character: context.characterAppearance || "Not specified",
      environment: context.locationContext || context.currentNarrative,
      style: context.universeVisualStyle || "Default fantasy style",
      genres: context.campaignGenres,
      sceneType: context.sceneType,
      composition: context.compositionGuidance || "standard",
      negativePrompt: negativePrompt || "none",
    },
  };
}
