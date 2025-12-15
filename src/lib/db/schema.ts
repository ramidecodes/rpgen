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
  foreignKey,
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

export const characters = pgTable("characters", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .references(() => userProfiles.id)
    .notNull(),
  universeId: uuid("universe_id")
    .references(() => universes.id)
    .notNull(), // Link to specific reality
  name: varchar("name", { length: 100 }).notNull(),
  stats: jsonb("stats")
    .$type<{
      strength: number;
      agility: number;
      intelligence: number;
      scholarship: number;
      intuition: number;
    }>()
    .notNull(),
  properties: jsonb("properties").$type<{
    origin?: string;
    profession: string;
    appearance?: string;
    backstory?: string;
    personalityTraits?: string[];
    factionName?: string;
    imageUrl?: string;
  }>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const campaigns = pgTable("campaigns", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .references(() => userProfiles.id)
    .notNull(),
  universeId: uuid("universe_id")
    .references(() => universes.id)
    .notNull(),
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),
  coverImage: text("cover_image"),
  genres: jsonb("genres").$type<string[]>().notNull(), // e.g. ["fantasy", "horror"]

  isPublic: boolean("is_public").default(false).notNull(),
  likesCount: integer("likes_count").default(0).notNull(),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const runs = pgTable("runs", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .references(() => userProfiles.id)
    .notNull(),
  campaignId: uuid("campaign_id")
    .references(() => campaigns.id)
    .notNull(),
  characterId: uuid("character_id")
    .references(() => characters.id)
    .notNull(),
  // Split state into separate columns for better queryability
  relationships: jsonb("relationships")
    .$type<{
      nodes: Array<{
        id: string;
        type: string;
        label: string;
        description: string | null;
        data: Record<string, unknown> | null;
      }>;
      edges: Array<{
        source: string;
        target: string;
        relation: string;
        weight: number;
      }>;
    }>()
    .default({ nodes: [], edges: [] })
    .notNull(),
  activeFronts: jsonb("active_fronts")
    .$type<
      Array<{
        name: string;
        description: string;
        doomClock: number;
        maxDoom: number;
      }>
    >()
    .default([])
    .notNull(),
  narrativeVectors: jsonb("narrative_vectors")
    .$type<{
      hope: number;
      chaos: number;
    }>()
    .default({ hope: 0.5, chaos: 0.5 })
    .notNull(),
  currentContext: text("current_context"),
  status: varchar("status", { length: 20 }).default("active").notNull(),
  currentSceneId: uuid("current_scene_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Define scenes table - use foreignKey operator for self-reference to avoid TypeScript circular reference
export const scenes = pgTable(
  "scenes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    runId: uuid("run_id")
      .references(() => runs.id, { onDelete: "cascade" })
      .notNull(),
    sceneType: varchar("scene_type", { length: 20 }).notNull(), // 'environment'
    imageUrl: varchar("image_url", { length: 500 }), // Nullable to support pending state
    generationPrompt: text("generation_prompt").notNull(),
    narrativeContext: text("narrative_context").notNull(),
    previousSceneId: uuid("previous_scene_id"), // Track scene transitions - foreign key defined below
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("scenes_run_id_idx").on(table.runId),
    index("scenes_created_at_idx").on(table.createdAt),
    // Self-referencing foreign key using foreignKey operator to avoid TypeScript circular reference
    foreignKey({
      columns: [table.previousSceneId],
      foreignColumns: [table.id],
      name: "scenes_previous_scene_id_fkey",
    }),
  ]
);

// Define quests table - separate table for quest management
export const quests = pgTable(
  "quests",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    runId: uuid("run_id")
      .references(() => runs.id, { onDelete: "cascade" })
      .notNull(),
    title: varchar("title", { length: 200 }).notNull(),
    status: varchar("status", { length: 20 }).default("active").notNull(), // "active" | "completed" | "failed" | "dormant"
    description: text("description").notNull(),
    clues: jsonb("clues").$type<string[]>().default([]).notNull(),
    logs: jsonb("logs").$type<string[]>().default([]).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("quests_run_id_idx").on(table.runId),
    index("quests_status_idx").on(table.status),
    index("quests_created_at_idx").on(table.createdAt),
  ]
);

export const messages = pgTable(
  "messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    runId: uuid("run_id")
      .references(() => runs.id, { onDelete: "cascade" })
      .notNull(),
    role: varchar("role", { length: 20 }).notNull(), // system, user, assistant, tool, data
    content: jsonb("content").notNull(), // string or Array<TextPart | ImagePart | ToolCallPart | ToolResultPart>
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("messages_run_id_idx").on(table.runId),
    index("messages_created_at_idx").on(table.createdAt),
  ]
);

// Type exports for Drizzle schema
export type UserProfile = typeof userProfiles.$inferSelect;
export type NewUserProfile = typeof userProfiles.$inferInsert;
export type UserProfileUpdate = Partial<
  Omit<NewUserProfile, "id" | "createdAt">
>;

export type Universe = typeof universes.$inferSelect;
export type NewUniverse = typeof universes.$inferInsert;

export type Character = typeof characters.$inferSelect;
export type NewCharacter = typeof characters.$inferInsert;

export type Campaign = typeof campaigns.$inferSelect;
export type NewCampaign = typeof campaigns.$inferInsert;

export type Run = typeof runs.$inferSelect;
export type NewRun = typeof runs.$inferInsert;

export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;

export type Scene = typeof scenes.$inferSelect;
export type NewScene = typeof scenes.$inferInsert;

export type Quest = typeof quests.$inferSelect;
export type NewQuest = typeof quests.$inferInsert;
