import { generateObject } from "ai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import {
  characterBackstorySchema,
  type CharacterStats,
} from "@/lib/db/schemas/character";
import { type Universe } from "@/lib/db/schema";

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

// Model to use - adhering to FReD specification
const MODEL_NAME = "nvidia/nemotron-nano-12b-v2-vl:free";

export async function generateCharacterBackstory(
  universe: Universe,
  name: string,
  profession: string,
  stats: CharacterStats,
  userPrompt?: string
) {
  const prompt = `
    Create a cohesive character backstory and personality for a new RPG character in the following universe:
    
    Universe Name: ${universe.name}
    Universe Description: ${universe.description}
    Ontology:
    - Timeframe: ${universe.ontology.timeframe}
    - Magic Level: ${universe.ontology.magicLevel}
    - Physics: ${universe.ontology.physics}
    - Metaphysics: ${universe.ontology.metaphysics}
    - Social Structure: ${universe.ontology.socialStructure}
    
    Character Details:
    - Name: ${name}
    - Profession/Class: ${profession}
    - Stats (1-20):
      - Strength: ${stats.strength}
      - Agility: ${stats.agility}
      - Intelligence: ${stats.intelligence}
      - Scholarship: ${stats.scholarship}
      - Intuition: ${stats.intuition}

    ${
      userPrompt
        ? `User Guidance for Backstory: "${userPrompt}". Ensure the backstory incorporates these specific details or themes requested by the user.`
        : ""
    }

    Generate a backstory that explains the character's origin, how they acquired their skills (profession), and how their stats reflect their past experiences.
    The backstory should be firmly rooted in the specific history and factions of this universe.
    Also provide key personality traits that align with this backstory.
    Provide a visual description that can be used to generate a character portrait later.
  `;

  try {
    const { object } = await generateObject({
      model: openrouter.chat(MODEL_NAME),
      schema: characterBackstorySchema,
      prompt,
    });

    return object;
  } catch (error) {
    console.error("Error generating character backstory:", error);
    throw new Error("Failed to generate character backstory");
  }
}
