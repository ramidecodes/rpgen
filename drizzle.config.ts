import { config } from "dotenv";
import { resolve } from "node:path";
import type { Config } from "drizzle-kit";

// Load .env.local file
config({ path: resolve(process.cwd(), ".env.local") });

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not set");
}

export default {
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
} satisfies Config;
