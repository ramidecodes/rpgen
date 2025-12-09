import { generateObject } from "ai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import {
  generatedUniverseSchema,
  type Ontology,
} from "@/lib/db/schemas/universe";

// Configure OpenRouter using the official provider
const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

// Model to use - adhering to FReD specification
const MODEL_NAME = "nvidia/nemotron-nano-12b-v2-vl:free";

export async function generateUniverse(
  ontology: Ontology,
  additionalPrompts?: string
) {
  const prompt = `
    Create a unique and detailed fictional universe based on the following ontological parameters:
    - Timeframe: ${ontology.timeframe}
    - Magic Level: ${ontology.magicLevel}
    - Physics Reality: ${ontology.physics}
    - Metaphysics: ${ontology.metaphysics}
    - Social Structure: ${ontology.socialStructure}

    ${
      additionalPrompts
        ? `Additional User Guidance: "${additionalPrompts}". Incorporate these themes, elements, or specific details into the world generation.`
        : ""
    }

    Generate a cohesive world that logically integrates these elements.
    - The history should explain how the world came to be this way.
    - Factions should emerge naturally from the social structure and magic/tech level.
    - Locations should be playable and interesting.
    - Provide a "visualDescription" that can be used to generate a high-quality cover image for this world.
  `;

  try {
    const { object } = await generateObject({
      model: openrouter.chat(MODEL_NAME),
      schema: generatedUniverseSchema,
      prompt,
    });

    return object;
  } catch (error) {
    console.error("Error generating universe:", error);
    throw new Error("Failed to generate universe content");
  }
}
