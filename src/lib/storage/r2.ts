import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL;

if (
  !R2_ACCOUNT_ID ||
  !R2_ACCESS_KEY_ID ||
  !R2_SECRET_ACCESS_KEY ||
  !R2_BUCKET_NAME
) {
  console.warn(
    "R2 environment variables are missing. Storage functionality will not work."
  );
}

const S3 = new S3Client({
  region: "auto",
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID || "",
    secretAccessKey: R2_SECRET_ACCESS_KEY || "",
  },
});

/**
 * Uploads an image buffer to Cloudflare R2
 * @param buffer - The image file buffer
 * @param key - The unique key (path) for the file
 * @param contentType - The MIME type of the file
 * @returns Object containing the key and key-based URL
 */
export async function uploadImage(
  buffer: Buffer,
  key: string,
  contentType: string
): Promise<{ key: string; url: string }> {
  if (!R2_BUCKET_NAME) {
    throw new Error("R2_BUCKET_NAME is not configured");
  }

  try {
    const command = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    });

    await S3.send(command);

    // We return the key as the primary identifier to be stored in the DB
    // The URL is returned for immediate display if needed, but should be derived from key usually
    const url = await getPublicUrl(key);

    return { key, url };
  } catch (error) {
    console.error("Error uploading to R2:", error);
    throw new Error("Failed to upload image to storage");
  }
}

/**
 * Generates a public URL for the given key using the configured R2_PUBLIC_URL.
 * If R2_PUBLIC_URL is not set, falls back to a signed URL.
 */
export async function getPublicUrl(key: string): Promise<string> {
  // Check if R2_PUBLIC_URL is the raw R2 endpoint, which requires auth/signing
  const isR2Endpoint = R2_PUBLIC_URL?.includes("r2.cloudflarestorage.com");

  // If we have a valid public URL (custom domain), return that directly
  if (R2_PUBLIC_URL && !isR2Endpoint) {
    const baseUrl = R2_PUBLIC_URL.endsWith("/")
      ? R2_PUBLIC_URL.slice(0, -1)
      : R2_PUBLIC_URL;

    // Ensure key doesn't start with slash to avoid double slashes
    const cleanKey = key.startsWith("/") ? key.slice(1) : key;

    return `${baseUrl}/${cleanKey}`;
  }

  if (isR2Endpoint) {
    console.warn(
      "R2_PUBLIC_URL is set to the R2 endpoint. This is incorrect for public access. Falling back to signed URLs."
    );
  }

  // Fallback to signed URL if no public domain configured
  return await getSignedUrl(
    S3,
    new GetObjectCommand({ Bucket: R2_BUCKET_NAME, Key: key }),
    { expiresIn: 3600 }
  );
}

/**
 * Generates a signed URL for reading a private object
 * Use this when you explicitly want a temporary, secure link
 */
export async function getPrivateUrl(key: string): Promise<string> {
  if (!R2_BUCKET_NAME) {
    throw new Error("R2_BUCKET_NAME is not configured");
  }

  const command = new GetObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
  });

  // URL valid for 1 hour
  return await getSignedUrl(S3, command, { expiresIn: 3600 });
}

// Deprecated alias for backward compatibility if needed, but prefer explicit public/private
export const getImageUrl = getPublicUrl;
