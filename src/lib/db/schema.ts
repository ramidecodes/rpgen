import {
  index,
  pgTable,
  timestamp,
  uuid,
  varchar,
  unique,
  jsonb,
  text,
  boolean,
  integer,
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

// Define Faction and Location types for JSONB columns
export type Faction = {
  name: string;
  description: string;
  ideology: string;
  resources: string;
  relationships: string;
};

export type Location = {
  name: string;
  description: string;
  type: string;
  key_npcs: string[];
};

export const universes = pgTable("universes", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => userProfiles.id), // Nullable for system templates
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description").notNull(),
  coverImage: text("cover_image"), // URL to image
  ontology: jsonb("ontology")
    .$type<{
      timeframe: string;
      magicLevel: string;
      physics: string;
      metaphysics: string;
      socialStructure: string;
    }>()
    .notNull(),
  factions: jsonb("factions").$type<Faction[]>(),
  locations: jsonb("locations").$type<Location[]>(),
  history: text("history").notNull(),
  isPremade: boolean("is_premade").default(false).notNull(),
  isPublic: boolean("is_public").default(false).notNull(), // Visibility
  likesCount: integer("likes_count").default(0).notNull(), // Aggregate likes/rating
  playCount: integer("play_count").default(0).notNull(), // Usage stats
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Type exports for Drizzle schema
export type UserProfile = typeof userProfiles.$inferSelect;
export type NewUserProfile = typeof userProfiles.$inferInsert;
export type UserProfileUpdate = Partial<
  Omit<NewUserProfile, "id" | "createdAt">
>;

export type Universe = typeof universes.$inferSelect;
export type NewUniverse = typeof universes.$inferInsert;
