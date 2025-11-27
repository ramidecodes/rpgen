import { pgTable, timestamp, uuid } from "drizzle-orm/pg-core"

// Placeholder schema - will be expanded in future features
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})
