import { generateObject } from "ai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import {
  campaignStateSchema,
  type CampaignState,
} from "@/lib/db/schemas/campaign";
import type { Universe, Character } from "@/lib/db/schema";

// Configure OpenRouter using the official provider
const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

const MODEL_NAME = "google/gemma-3-27b-it:free";

export async function generateCampaignState(
  universe: Universe,
  genres: string[],
  character?: Character
): Promise<CampaignState> {
  const characterContext = character
    ? `
    3. Character: "${character.name}"
       - Profession: ${character.properties?.profession || "Unknown"}
       - Stats: Strength ${character.stats.strength}, Agility ${
        character.stats.agility
      }, Intelligence ${character.stats.intelligence}, Scholarship ${
        character.stats.scholarship
      }, Intuition ${character.stats.intuition}
       - Backstory: ${
         character.properties?.backstory?.substring(0, 300) ||
         "No backstory provided"
       }...
       - Personality: ${
         character.properties?.personalityTraits?.join(", ") || "Unknown"
       }
       - Faction Alignment: ${character.properties?.factionName || "None"}
    `
    : "";

  const prompt = `
    Generate a new RPG campaign state based on the following context.

    CONTEXT:
    
    1. Universe: "${universe.name}"
       - Description: ${universe.description}
       - History Summary: ${universe.history.substring(0, 500)}...
       - Key Ontologies: ${JSON.stringify(universe.ontology)}

    2. Campaign Genres/Tone: ${genres.join(", ")}
${characterContext}
    TASK:
    Create the initial "Narrative Graph" state for this campaign${
      character
        ? `, tailored to ${character.name}'s background and capabilities`
        : ""
    }.
    
    - **Active Fronts**: Identify 3-5 impending threats or plotlines (Fronts) that are relevant to the Universe's history and factions${
      character
        ? `, and that connect meaningfully to ${character.name}'s profession and backstory`
        : ""
    }.
      - These should be "off-screen" forces moving against the world.
      - Set 'doomClock' to 0 and 'maxDoom' between 3-10.
    
    - **Narrative Vectors**: Set initial 'Hope' and 'Chaos' levels based on the genres${
      character ? ` and ${character.name}'s starting situation` : ""
    }.
    
    - **Quest Threads**: Create 1-2 broad starting hooks or mysteries for the campaign${
      character
        ? ` that ${character.name} would naturally encounter given their background`
        : ""
    }.
    
    - **Knowledge Graph**: 
      - Create nodes for key Locations from the Universe and a few NPCs implied by the Fronts${
        character
          ? `, including connections to ${character.name}'s faction or profession`
          : ""
      }.
      - Create edges defining relationships.
      - Keep it concise (max 10-15 nodes initially).

    - **Current Context**: A brief summary of the starting situation/premise of the campaign${
      character
        ? `, focusing on ${character.name}'s entry point into the story`
        : ""
    }.
  `;

  try {
    const { object } = await generateObject({
      model: openrouter.chat(MODEL_NAME),
      schema: campaignStateSchema,
      prompt,
    });

    return object;
  } catch (error) {
    console.error("Error generating campaign state:", error);
    throw new Error("Failed to generate initial campaign state");
  }
}
