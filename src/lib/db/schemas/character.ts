import { z } from "zod";

// Stats Schema (1-20 range)
export const characterStatsSchema = z.object({
  strength: z.number().int().min(1).max(20),
  agility: z.number().int().min(1).max(20),
  intelligence: z.number().int().min(1).max(20),
  scholarship: z.number().int().min(1).max(20),
  intuition: z.number().int().min(1).max(20),
});

// Backstory & Personality Schema (AI Generated)
export const characterBackstorySchema = z.object({
  backstory: z
    .string()
    .describe("A cohesive origin story woven into the universe's history"),
  personalityTraits: z
    .array(z.string())
    .describe("Key personality traits based on stats and backstory"),
  appearance: z.string().describe("Visual description of the character"),
});

// Full Character Creation Input Schema
export const createCharacterSchema = z.object({
  universeId: z.string().uuid(),
  name: z.string().min(1).max(100),
  profession: z.string().min(1),
  factionName: z
    .string()
    .optional()
    .describe("Name of the faction the character is aligned with"),
  stats: characterStatsSchema,
  backstoryPrompt: z
    .string()
    .optional()
    .describe("User prompt for AI backstory generation"),
  // Optional because it might be generated or manually entered
  backstory: z.string().optional(),
  appearance: z.string().optional(),
  personalityTraits: z.array(z.string()).optional(),
});

// Type inference
export type CharacterStats = z.infer<typeof characterStatsSchema>;
export type CharacterBackstory = z.infer<typeof characterBackstorySchema>;
export type CreateCharacterInput = z.infer<typeof createCharacterSchema>;
