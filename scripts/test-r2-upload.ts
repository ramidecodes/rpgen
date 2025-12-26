import { config } from "dotenv";
import { resolve } from "node:path";
import { existsSync } from "node:fs";

// Load environment variables from .env.local BEFORE importing r2.ts
// This is critical because r2.ts reads process.env at module load time
const envPath = resolve(process.cwd(), ".env.local");

if (!existsSync(envPath)) {
  console.error(`❌ .env.local file not found at: ${envPath}`);
  console.error("Please ensure .env.local exists in the project root");
  process.exit(1);
}

const result = config({ path: envPath });

if (result.error) {
  console.error("❌ Error loading .env.local:", result.error);
  process.exit(1);
}

async function testR2Upload() {
  console.log("🧪 Testing R2 bucket access...\n");
  console.log(`📁 Loaded .env.local from: ${envPath}\n`);

  // Check required environment variables
  const requiredVars = [
    "R2_ACCOUNT_ID",
    "R2_ACCESS_KEY_ID",
    "R2_SECRET_ACCESS_KEY",
    "R2_BUCKET_NAME",
  ];

  // Optional: R2_JURISDICTION (e.g., "eu" for EU buckets)
  const jurisdiction = process.env.R2_JURISDICTION?.toLowerCase().trim() || "";

  const missingVars = requiredVars.filter((varName) => !process.env[varName]);

  if (missingVars.length > 0) {
    console.error("❌ Missing required environment variables:");
    missingVars.forEach((varName) => {
      console.error(`   - ${varName}`);
    });
    console.error("\nPlease ensure these are set in .env.local");
    process.exit(1);
  }

  console.log("✅ All required environment variables are present");

  // Trim quotes and whitespace from bucket name (in case .env.local has quotes)
  const bucketName =
    process.env.R2_BUCKET_NAME?.trim().replace(/^["']|["']$/g, "") || "";
  const accountId =
    process.env.R2_ACCOUNT_ID?.trim().replace(/^["']|["']$/g, "") || "";

  console.log(`📦 Bucket name (raw): "${process.env.R2_BUCKET_NAME}"`);
  console.log(`📦 Bucket name (cleaned): "${bucketName}"`);
  console.log(`   Bucket length: ${bucketName.length} characters`);
  console.log(`🆔 Account ID (raw): "${process.env.R2_ACCOUNT_ID}"`);
  console.log(`🆔 Account ID (cleaned): "${accountId}"`);
  console.log(`   Account ID length: ${accountId.length} characters`);
  if (jurisdiction) {
    console.log(
      `🌍 Jurisdiction: "${jurisdiction}" (EU buckets require this!)`
    );
  } else {
    console.log(`🌍 Jurisdiction: Not set (using default endpoint)`);
  }
  console.log();

  // Update process.env with cleaned values
  process.env.R2_BUCKET_NAME = bucketName;
  process.env.R2_ACCOUNT_ID = accountId;

  // Create test file content
  const timestamp = new Date().toISOString();
  const testContent = `R2 Connection Test
Generated at: ${timestamp}
This is a test file to verify R2 bucket access and credentials.
`;

  const testKey = `test/r2-connection-test-${Date.now()}.txt`;

  console.log(`📤 Uploading test file to: ${testKey}`);
  console.log(`📦 Target bucket: "${bucketName}"`);
  const endpoint = jurisdiction
    ? `https://${accountId}.${jurisdiction}.r2.cloudflarestorage.com`
    : `https://${accountId}.r2.cloudflarestorage.com`;
  console.log(`🔗 Endpoint: ${endpoint}\n`);

  try {
    // Dynamically import after env vars are loaded
    const r2Module = await import("@/lib/storage/r2");
    const { uploadImage } = r2Module;

    // First, try to list buckets to see what's accessible
    // Check both default and EU endpoints since buckets can be in different jurisdictions
    console.log("🔍 Checking accessible buckets...");
    const allBuckets: Array<{ name: string; jurisdiction: string }> = [];

    const endpoints = [
      {
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        jurisdiction: "default",
      },
      {
        endpoint: `https://${accountId}.eu.r2.cloudflarestorage.com`,
        jurisdiction: "EU",
      },
    ];

    for (const {
      endpoint: testEndpoint,
      jurisdiction: endpointJurisdiction,
    } of endpoints) {
      try {
        const { S3Client, ListBucketsCommand } = await import(
          "@aws-sdk/client-s3"
        );

        const testS3 = new S3Client({
          region: "auto",
          endpoint: testEndpoint,
          credentials: {
            accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
            secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
          },
        });

        const listCommand = new ListBucketsCommand({});
        const listResponse = await testS3.send(listCommand);

        if (listResponse.Buckets && listResponse.Buckets.length > 0) {
          listResponse.Buckets.forEach((bucket) => {
            if (bucket.Name) {
              allBuckets.push({
                name: bucket.Name,
                jurisdiction: endpointJurisdiction,
              });
            }
          });
        }
      } catch {
        // Silently continue - endpoint might not be accessible or no buckets in this jurisdiction
      }
    }

    if (allBuckets.length > 0) {
      console.log(
        `✅ Found ${allBuckets.length} accessible bucket(s) across jurisdictions:`
      );
      allBuckets.forEach((bucket) => {
        const match = bucket.name === bucketName ? " ← MATCHES TARGET" : "";
        const jurisdictionNote = bucket.jurisdiction === "EU" ? " (EU)" : "";
        console.log(`   - "${bucket.name}"${jurisdictionNote}${match}`);
      });
      console.log();

      // Check if target bucket was found
      const targetBucket = allBuckets.find((b) => b.name === bucketName);
      if (targetBucket) {
        const targetJurisdiction =
          targetBucket.jurisdiction === "EU" ? "eu" : "";
        if (targetJurisdiction !== jurisdiction) {
          console.log(
            `⚠️  WARNING: Target bucket "${bucketName}" is in ${targetBucket.jurisdiction} jurisdiction,`
          );
          console.log(
            `   but R2_JURISDICTION is set to "${jurisdiction || "default"}".`
          );
          console.log(
            `   You may need to set R2_JURISDICTION=${
              targetJurisdiction || ""
            } in .env.local\n`
          );
        }
      } else {
        console.log(
          `⚠️  WARNING: Target bucket "${bucketName}" not found in any jurisdiction!`
        );
        console.log(
          `   Available buckets: ${allBuckets.map((b) => b.name).join(", ")}\n`
        );
      }
    } else {
      console.log("⚠️  No buckets found (or no permission to list buckets)");
      console.log();
    }

    const buffer = Buffer.from(testContent, "utf-8");
    const result = await uploadImage(buffer, testKey, "text/plain");

    console.log("\n✅ Upload successful!");
    console.log(`   Key: ${result.key}`);
    console.log(`   URL: ${result.url}`);
    console.log("\n🎉 R2 bucket access is working correctly!");
    process.exit(0);
  } catch (error) {
    console.error("\n❌ Upload failed!");
    console.error("\nError details:");

    if (error instanceof Error) {
      console.error(`   Message: ${error.message}`);
      if (error.stack) {
        console.error(`   Stack: ${error.stack}`);
      }
    } else {
      console.error("   Unknown error:", error);
    }

    // Try to extract more details if it's an AWS SDK error
    if (error && typeof error === "object") {
      if ("$metadata" in error) {
        const awsError = error as {
          $metadata?: { httpStatusCode?: number; requestId?: string };
        };
        if (awsError.$metadata) {
          console.error(`   HTTP Status: ${awsError.$metadata.httpStatusCode}`);
          if (awsError.$metadata.requestId) {
            console.error(`   Request ID: ${awsError.$metadata.requestId}`);
          }
        }
      }

      // Check for Code property (AccessDenied, NoSuchBucket, etc.)
      if ("Code" in error) {
        console.error(`   Error Code: ${(error as { Code?: string }).Code}`);
      }

      // Log full error object for debugging
      console.error("\n   Full error object:", JSON.stringify(error, null, 2));
    }

    console.error("\n💡 Troubleshooting tips:");
    console.error(
      "   1. Verify R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY are correct"
    );
    console.error(
      "   2. Check that the API token has 'Object Read & Write' permissions"
    );
    console.error(
      "   3. Ensure the bucket name matches exactly (case-sensitive)"
    );
    console.error(
      "   4. Verify R2_ACCOUNT_ID is correct (32-char hex, no dashes)"
    );
    console.error(
      "   5. Check that the token is scoped to the correct bucket(s)"
    );

    process.exit(1);
  }
}

// Run the test
testR2Upload();
