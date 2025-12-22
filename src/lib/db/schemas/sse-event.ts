import { z } from "zod";

// Allowed SSE event types
export const sseEventTypeSchema = z.enum([
  "scene-generation-started",
  "scene-updated",
  "scene-generation-cancelled",
  "campaign-state-updated",
]);

// Event payload schemas for each event type
export const sceneGenerationStartedPayloadSchema = z.object({
  runId: z.string().uuid(),
  sceneId: z.string(), // Can be UUID or placeholder string
  narrativeContext: z.string().optional(),
  placeholder: z.boolean().optional(),
});

export const sceneUpdatedPayloadSchema = z.object({
  runId: z.string().uuid(),
  sceneId: z.string().uuid(),
  imageUrl: z.string(), // R2 key or public URL
});

export const sceneGenerationCancelledPayloadSchema = z.object({
  placeholderId: z.string(),
});

export const campaignStateUpdatedPayloadSchema = z.object({
  state: z.record(z.unknown()), // CampaignState object
});

// Union schema for all event payloads
export const sseEventPayloadSchema = z.union([
  sceneGenerationStartedPayloadSchema,
  sceneUpdatedPayloadSchema,
  sceneGenerationCancelledPayloadSchema,
  campaignStateUpdatedPayloadSchema,
]);

// Full SSE event schema (for database storage)
export const sseEventSchema = z.object({
  id: z.string().uuid(),
  runId: z.string().uuid(),
  eventType: sseEventTypeSchema,
  eventData: sseEventPayloadSchema,
  createdAt: z.date(),
});

// Input schema for creating SSE events
export const createSSEEventSchema = z.object({
  runId: z.string().uuid(),
  eventType: sseEventTypeSchema,
  eventData: sseEventPayloadSchema,
});

// Types
export type SSEEventType = z.infer<typeof sseEventTypeSchema>;
export type SceneGenerationStartedPayload = z.infer<
  typeof sceneGenerationStartedPayloadSchema
>;
export type SceneUpdatedPayload = z.infer<typeof sceneUpdatedPayloadSchema>;
export type SceneGenerationCancelledPayload = z.infer<
  typeof sceneGenerationCancelledPayloadSchema
>;
export type CampaignStateUpdatedPayload = z.infer<
  typeof campaignStateUpdatedPayloadSchema
>;
export type SSEEventPayload = z.infer<typeof sseEventPayloadSchema>;
export type SSEEvent = z.infer<typeof sseEventSchema>;
export type CreateSSEEventInput = z.infer<typeof createSSEEventSchema>;

