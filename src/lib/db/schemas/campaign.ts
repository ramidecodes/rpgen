import { z } from "zod";

// --- Narrative Graph / State Components ---

// 1. Narrative Vectors
export const narrativeVectorsSchema = z.object({
  hope: z
    .number()
    .min(0)
    .max(1)
    .describe("0.0 (Despair) to 1.0 (Heroic/Hopeful)"),
  chaos: z
    .number()
    .min(0)
    .max(1)
    .describe("0.0 (Order/Stagnation) to 1.0 (Anarchy/Chaos)"),
});

// 2. Active Fronts (PbtA Style)
export const frontSchema = z.object({
  name: z.string(),
  description: z.string(),
  doomClock: z.number().int().min(0).describe("Current steps advanced"),
  maxDoom: z
    .number()
    .int()
    .min(3)
    .max(12)
    .describe("Steps until the impending doom happens"),
});

// 3. Quest Threads (for validation/type checking - quests are now in separate table)
export const questThreadSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string(),
  status: z.enum(["active", "completed", "failed", "dormant"]),
  description: z.string(),
  clues: z.array(z.string()),
  logs: z.array(z.string()).optional(),
});

// 4. Knowledge Graph
export const graphNodeSchema = z.object({
  id: z.string(),
  type: z.enum(["npc", "location", "item", "event", "faction", "concept"]),
  label: z.string(),
  description: z.string().nullable(),
  data: z.object({}).nullable(),
});

export const graphEdgeSchema = z.object({
  source: z.string(),
  target: z.string(),
  relation: z.string(), // e.g., "hates", "located_in", "owns"
  weight: z.number().min(0).max(1), // Strength of the relationship
});

export const knowledgeGraphSchema = z.object({
  nodes: z.array(graphNodeSchema),
  edges: z.array(graphEdgeSchema),
});

// --- Full Campaign State Schema ---
// Note: questThreads are now stored in separate quests table, not in state
// This schema is used for in-memory state management (fronts, vectors, relationships)
export const campaignStateSchema = z.object({
  activeFronts: z.array(frontSchema),
  narrativeVectors: narrativeVectorsSchema,
  knowledgeGraph: knowledgeGraphSchema,
  // Optional: Summary of the last turn or current situation for context
  currentContext: z.string().nullable(),
});

// --- Input Schemas ---

export const createCampaignSchema = z.object({
  universeId: z.string().uuid(),
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  genres: z.array(z.string()).min(1).max(3),
  isPublic: z.boolean().default(false),
});

// --- Types ---
export type NarrativeVectors = z.infer<typeof narrativeVectorsSchema>;
export type Front = z.infer<typeof frontSchema>;
export type QuestThread = z.infer<typeof questThreadSchema>;
export type GraphNode = z.infer<typeof graphNodeSchema>;
export type GraphEdge = z.infer<typeof graphEdgeSchema>;
export type KnowledgeGraph = z.infer<typeof knowledgeGraphSchema>;
export type CampaignState = z.infer<typeof campaignStateSchema>;
export type CreateCampaignInput = z.infer<typeof createCampaignSchema>;
