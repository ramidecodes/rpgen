import { z } from "zod";

// Enums for Ontology
export const TimeframeEnum = z.enum([
  "Early Humans",
  "First Civilizations",
  "Medieval",
  "Industrial",
  "Modern",
  "Future",
  "Distant Future",
]);

export const MagicLevelEnum = z.enum([
  "None",
  "Rare (Ritualistic)",
  "Common (Industrialized)",
  "High Magic (Reality warping)",
]);

export const PhysicsEnum = z.enum([
  "Hard Physics",
  "Cartoon/Anime Logic",
  "Dream Logic",
]);

export const MetaphysicsEnum = z.enum([
  "Materialist (No Gods)",
  "Interventionist (Active Gods)",
  "Eldritch (Indifferent/Hostile Cosmos)",
]);

export const SocialStructureEnum = z.enum([
  "Tribal",
  "Feudal",
  "Imperial",
  "Democratic",
  "Corporate",
  "Anarchic",
]);

// Ontology Schema
export const ontologySchema = z.object({
  timeframe: TimeframeEnum,
  magicLevel: MagicLevelEnum,
  physics: PhysicsEnum,
  metaphysics: MetaphysicsEnum,
  socialStructure: SocialStructureEnum,
});

// Sub-schemas for generation
export const factionSchema = z.object({
  name: z.string(),
  description: z.string(),
  ideology: z.string(),
  resources: z.string(),
  relationships: z.string(),
});

export const locationSchema = z.object({
  name: z.string(),
  description: z.string(),
  type: z.string(),
  key_npcs: z.array(z.string()),
});

// Full Universe Generation Schema (Output from AI)
export const generatedUniverseSchema = z.object({
  name: z.string(),
  description: z.string(),
  history: z.string(),
  factions: z.array(factionSchema),
  locations: z.array(locationSchema),
  visualDescription: z
    .string()
    .describe(
      "A detailed visual prompt to generate a cover image for this universe"
    ),
});

// Input Schema for Creation Action
export const createUniverseInputSchema = z.object({
  ontology: ontologySchema,
  additionalPrompts: z
    .string()
    .optional()
    .describe("Arbitrary user description to guide the universe generation"),
  isPublic: z.boolean().default(false),
});

export type Ontology = z.infer<typeof ontologySchema>;
export type GeneratedUniverse = z.infer<typeof generatedUniverseSchema>;
export type CreateUniverseInput = z.infer<typeof createUniverseInputSchema>;
