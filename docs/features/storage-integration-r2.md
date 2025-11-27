# Feature Requirement Document - Storage Integration R2

- **Feature Name**: Storage Integration R2

- **Goal**: Set up Cloudflare R2 object storage for storing and retrieving generated scene images, character portraits, and other game assets. R2 provides cheap, reliable storage with near-zero egress costs.

- **User Story**: As a player, I want generated images to be stored reliably and loaded quickly, so that visual scenes display correctly and enhance my gameplay experience without performance issues.

- **Functional Requirements**: 
  - Cloudflare R2 setup:
    - Create R2 bucket for game assets via Cloudflare dashboard
    - Configure bucket settings (public/private access, CORS if needed)
    - Set up R2 API credentials (Access Key ID, Secret Access Key)
    - Store credentials in environment variables
  - Storage client implementation in `src/lib/storage/r2.ts`:
    - Create R2 client using `@aws-sdk/client-s3` (compatible with R2)
    - Configure S3 client with R2 endpoint and credentials
    - Implement upload functionality: `uploadImage(file: Buffer, key: string)`
    - Implement download/retrieval functionality: `getImageUrl(key: string)`
    - Implement URL generation for stored objects (public URLs or signed URLs)
  - Create Zod schemas in `src/lib/storage/schemas.ts`:
    - `imageUploadSchema`: file (Buffer), key (string), contentType (enum)
    - `fileKeySchema`: key format validation
    - Validate file types and sizes before upload
  - Image upload:
    - Upload generated scene images (from Replicate or other sources)
    - Upload character portraits
    - Support different image formats (PNG, JPEG, WebP) - validated via Zod
    - Generate unique filenames/keys for each asset (UUID-based or timestamp-based)
    - Store metadata alongside images (in database, not R2 metadata)
  - Create server actions in `src/app/actions/storage.ts`:
    - `uploadImageAction` - Server action that:
      - Validates file with Zod (type, size)
      - Generates unique key
      - Uploads to R2 via storage client
      - Returns public URL
    - `getImageUrlAction` - Get image URL by key
    - `deleteImageAction` - Delete image from R2 (cleanup)
  - Image retrieval:
    - Generate public URLs for stored images (if bucket is public)
    - Retrieve images by key/identifier
    - Support CDN URLs if configured (Cloudflare CDN)
  - Asset management:
    - Organize assets by type (scenes, portraits, etc.) via key prefixes
    - Version assets (keep old versions if needed) via key naming
    - Delete unused assets (cleanup via server action)
  - Error handling:
    - Handle upload failures gracefully with retry logic
    - Handle retrieval failures gracefully with fallback
    - Provide fallback for missing images (placeholder image)
  - Security:
    - Secure API credentials in environment variables (never commit)
    - Implement proper access controls (bucket policies)
    - Validate file types and sizes before upload (Zod validation)

- **Data Requirements**: 
  - **Uses `scenes` table** (from Visual Scene Generation):
    - `image_url`: VARCHAR(500) - stores R2 URL
  - **Asset Metadata** (stored in database or R2 metadata):
    - File key/path in R2
    - File size
    - Content type
    - Upload timestamp
    - Associated campaign/scene ID

- **User Flow**: 
  1. System generates image (via Replicate or other source)
  2. System prepares image for upload (format, size optimization)
  3. System generates unique key/filename for asset
  4. System uploads image to R2 bucket
  5. Upload succeeds, R2 returns success
  6. System stores R2 URL in database (scenes table)
  7. System displays image using R2 URL
  8. Player views image in environment panel
  9. If image needs to be retrieved later:
     - System queries database for image URL
     - System retrieves image from R2 using URL
     - Image displays correctly

- **Acceptance Criteria**: 
  - R2 bucket is created and configured correctly
  - R2 API credentials are stored securely in environment variables
  - R2 client is configured using AWS S3 SDK compatible library
  - Images can be uploaded to R2 successfully via server actions
  - Uploaded images are validated with Zod before upload (type, size)
  - Uploaded images are accessible via public URLs
  - Images can be retrieved and displayed correctly
  - Image URLs are stored in database correctly (via Drizzle ORM)
  - Upload errors are handled gracefully with retry logic
  - File size limits are enforced via Zod validation
  - File type validation works correctly via Zod enum
  - Assets are organized appropriately in R2 (via key prefixes)
  - CDN URLs work if configured (Cloudflare CDN)
  - Missing images show appropriate fallback (shadcn/ui placeholder)
  - Server actions use Zod for validation before upload operations

- **Edge Cases**: 
  - R2 upload fails - should retry or show error
  - File size exceeds limit - should reject or compress
  - Invalid file type - should reject upload
  - R2 service outage - should handle gracefully with error message
  - Image URL becomes invalid - should regenerate or handle gracefully
  - Concurrent uploads - should handle race conditions
  - Storage quota exceeded - should show error and prevent upload
  - Network timeout during upload - should retry with exponential backoff

- **Non-Functional Requirements**: 
  - **Performance**: Image upload should complete in < 5 seconds for typical sizes
  - **Reliability**: Should handle R2 service issues gracefully
  - **Cost**: Should optimize storage usage to minimize costs
  - **Security**: API credentials must be secure, access controls enforced
  - **Scalability**: Should handle large numbers of assets efficiently

- **Dependencies**: 
  - Base Next.js Implementation (base-implementation.md)
  - Visual Scene Generation (visual-scene-generation.md) - for images to store

