import Replicate from "replicate";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

/**
 * Generates an image using Replicate based on a text prompt.
 * Uses a fast, high-quality model suitable for fantasy/sci-fi landscapes.
 */
export async function generateUniverseImage(prompt: string): Promise<Buffer> {
  // Using Flux dev or similar high quality model
  // Model: black-forest-labs/flux-schnell (fast & good)
  const model = "black-forest-labs/flux-schnell";

  const input = {
    prompt: `Epic, cinematic, highly detailed concept art: ${prompt}. 8k resolution, trending on artstation.`,
    go_fast: true,
    megapixels: "1",
    num_outputs: 1,
    aspect_ratio: "16:9",
    output_format: "webp",
    output_quality: 80,
  };

  try {
    const output = (await replicate.run(model, { input })) as string[];

    if (!output || output.length === 0) {
      throw new Error("No image generated from Replicate");
    }

    // Download the image from the URL provided by Replicate
    const imageUrl = output[0];
    const response = await fetch(imageUrl);
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
export async function generateCharacterPortrait(prompt: string): Promise<Buffer> {
  const model = "black-forest-labs/flux-schnell";

  const input = {
    prompt: `Character portrait, highly detailed, expressive face, cinematic lighting: ${prompt}. 8k resolution, trending on artstation, centered composition.`,
    go_fast: true,
    megapixels: "1",
    num_outputs: 1,
    aspect_ratio: "1:1", // Square for portraits
    output_format: "webp",
    output_quality: 80,
  };

  try {
    const output = (await replicate.run(model, { input })) as string[];

    if (!output || output.length === 0) {
      throw new Error("No image generated from Replicate");
    }

    const imageUrl = output[0];
    const response = await fetch(imageUrl);
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
  const model = "black-forest-labs/flux-schnell";

  const input = {
    prompt: `Movie poster style, campaign cover art, highly detailed, atmospheric: ${prompt}. Titleless, cinematic composition, 8k resolution, dramatic lighting.`,
    go_fast: true,
    megapixels: "1",
    num_outputs: 1,
    aspect_ratio: "16:9",
    output_format: "webp",
    output_quality: 80,
  };

  try {
    const output = (await replicate.run(model, { input })) as string[];

    if (!output || output.length === 0) {
      throw new Error("No image generated from Replicate");
    }

    const imageUrl = output[0];
    const response = await fetch(imageUrl);
    const arrayBuffer = await response.arrayBuffer();
    
    return Buffer.from(arrayBuffer);
  } catch (error) {
    console.error("Error generating campaign cover with Replicate:", error);
    throw new Error("Failed to generate campaign cover");
  }
}
