import { z } from "zod";

export const sceneTypeSchema = z.enum(["environment"]);

export const createSceneSchema = z.object({
  runId: z.string().uuid(),
  sceneType: sceneTypeSchema,
  imageUrl: z.string().url(),
  generationPrompt: z.string().min(1),
  narrativeContext: z.string().min(1),
  previousSceneId: z.string().uuid().optional().nullable(),
});

export const updateSceneSchema = z.object({
  imageUrl: z.string().url().optional(),
});
