import { generateText, Output } from "ai";
import {
  generatedUniverseSchema,
  type Ontology,
} from "@/lib/db/schemas/universe";
import { getOpenRouterClient, getTextModel } from "@/lib/ai/provider";

const openrouter = getOpenRouterClient();
const MODEL_NAME = getTextModel("base");

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
    const result = await generateText({
      model: openrouter.chat(MODEL_NAME),
      prompt,
      output: Output.object({ schema: generatedUniverseSchema }),
    });

    return result.output;
  } catch (error) {
    console.error("Error generating universe:", error);
    throw new Error("Failed to generate universe content");
  }
}
