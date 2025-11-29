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

