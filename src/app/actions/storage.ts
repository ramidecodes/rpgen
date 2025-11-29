"use server";

import { uploadImage } from "@/lib/storage/r2";
import { imageUploadSchema } from "@/lib/storage/schemas";
import { z } from "zod";

/**
 * Server action to upload an image to R2.
 * Note: For large files, presigned URLs are better, but for generated images
 * handling it server-side is fine since we have the buffer from Replicate/AI.
 */
export async function uploadImageAction(
  base64File: string,
  key: string,
  contentType: "image/jpeg" | "image/png" | "image/webp"
) {
  try {
    // Convert base64 to buffer
    const buffer = Buffer.from(base64File, "base64");

    // Validate input
    const validatedData = imageUploadSchema.parse({
      file: buffer,
      key,
      contentType,
    });

    // Upload to R2
    const url = await uploadImage(
      validatedData.file,
      validatedData.key,
      validatedData.contentType
    );

    return { success: true, url };
  } catch (error) {
    console.error("Upload action failed:", error);
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message };
    }
    return { success: false, error: "Failed to upload image" };
  }
}

