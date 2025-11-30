import { z } from "zod";
import { campaignStateSchema, type CampaignState } from "./campaign";

// --- Input Schemas ---

export const createRunSchema = z.object({
  campaignId: z.string().uuid(),
  characterId: z.string().uuid(),
});

// --- Types ---
export type CreateRunInput = z.infer<typeof createRunSchema>;
export type { CampaignState };

