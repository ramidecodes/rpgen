import { z } from "zod";

// Maximum file size: 5MB
const MAX_FILE_SIZE = 5 * 1024 * 1024;

export const imageUploadSchema = z.object({
  file: z
    .instanceof(Buffer)
    .refine((file) => file.length <= MAX_FILE_SIZE, `Max file size is 5MB.`),
  contentType: z.enum(["image/jpeg", "image/png", "image/webp"]),
  key: z.string().min(1, "File key is required"),
});

export const fileKeySchema = z.object({
  key: z.string().min(1, "File key is required"),
});

export type ImageUploadParams = z.infer<typeof imageUploadSchema>;
