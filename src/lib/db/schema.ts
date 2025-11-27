import {
  index,
  pgTable,
  timestamp,
  uuid,
  varchar,
  unique,
} from "drizzle-orm/pg-core";

export const userProfiles = pgTable(
  "user_profiles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    clerkUserId: varchar("clerk_user_id", { length: 255 }).notNull(),
    username: varchar("username", { length: 100 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("user_profiles_clerk_user_id_idx").on(table.clerkUserId),
    unique("user_profiles_clerk_user_id_unique").on(table.clerkUserId),
  ]
);

// Type exports for Drizzle schema
export type UserProfile = typeof userProfiles.$inferSelect;
export type NewUserProfile = typeof userProfiles.$inferInsert;
export type UserProfileUpdate = Partial<
  Omit<NewUserProfile, "id" | "createdAt">
>;
