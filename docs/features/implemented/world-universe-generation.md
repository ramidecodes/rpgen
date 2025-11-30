# Feature Requirement Document - World Universe Generation

- **Feature Name**: World Universe Generation

- **Goal**: Enable players to generate or select a universe/world setting for their campaigns based on deep ontological parameters. The universe includes timeline, physics, metaphysics, social structure, regions, and history. Universes can be private for personal use or public for the community to explore and play in.

- **User Story**: As a player, I want to define the fundamental reality of a universe or choose a popular community-created one, so that I can play different campaigns in a world that feels consistent, deep, and logically grounded.

- **Functional Requirements**:

  - **Ontology Selection Interface** (shadcn/ui components):
    - `Select` or `RadioGroup` components for core ontology parameters.
    - **Timeframe**: Early Humans, First Civilizations, Medieval, Industrial, Modern, Future, Distant Future.
    - **Magic Level**: None, Rare (Ritualistic), Common (Industrialized), High Magic (Reality warping).
    - **Physics Reality**: Hard Physics, Cartoon/Anime Logic, Dream Logic.
    - **Metaphysics**: Materialist (No Gods), Interventionist (Active Gods), Eldritch (Indifferent/Hostile Cosmos).
    - **Social Structure**: Tribal, Feudal, Imperial, Democratic, Corporate, Anarchic.
  - **Universe Metadata & Visibility**:
    - **Visibility Toggle**: Option to mark universe as `Private` (default) or `Public`.
    - **Metadata**:
      - `Name`: Unique name for the universe.
      - `Description`: Short summary (generated or edited).
      - `Cover Image`: AI-generated or uploaded image representing the universe's vibe.
  - **Universe Generation**:
    - Use AI SDK `generateObject` to create a cohesive world based on the selected ontology.
    - **Provider**: OpenRouter.
    - **Model**: `x-ai/grok-4.1-fast:free` (for initial implementation).
    - **Schema Requirement**: The `generateObject` call MUST use the Zod schemas defined in `src/lib/db/schemas/universe.ts`.
      - `ontologySchema`, `factionSchema`, `locationSchema`, `historySchema`.
      - This ensures the generated output matches the JSONB columns in the database perfectly.
    - **AI Tool Specifications**:
      - **`generateUniverse` Tool**:
        - _Input_: Ontology parameters (Timeframe, Magic, etc.).
        - _Output Schema_: `{ name, description, history, factions: Faction[], locations: Location[] }`.
        - _Usage_: Passed to `generateObject` to produce the structured world data.
    - Generate a unique `Region Name` and `History` that explains how this ontology shaped the world.
    - Generate `Factions` that logically emerge from the social structure and magic level.
    - Generate `Playable Locations` that fit the timeframe and physics.
    - Generate `Cover Image` based on the visual description of the world.
  - **Community & Social Features**:
    - **Browse**: Interface to list public universes (filtered by ontology, popularity, recency).
    - **Rating System**: Users can rate (1-5 stars) or "Like" public universes.
    - **Play Count**: Track how many campaigns have been started in this universe.
  - **Data Management**:
    - Store `ontology` as a JSONB column to allow flexibility.
    - Support "Starter Universes" (pre-made templates) via `is_premade` flag.
  - **Server Actions**:
    - `createUniverseAction`: Validates ontology, generates details and cover image.
    - `getStarterUniversesAction`: Returns curated templates.
    - `getPublicUniversesAction`: Returns paginated public universes with sorting.
    - `rateUniverseAction`: Allows users to rate a universe.

- **Data Requirements**:

  - **Drizzle Schema Definition** (`src/lib/db/schema.ts`):

    ```typescript
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

    // Separate table for user ratings could be added: universe_ratings
    ```

  - **Zod Schemas & AI Generation (`src/lib/db/schemas/universe.ts`)**:
    - **Schema Strategy**: Define Zod schemas that serve TWO purposes:
      1. **Validation**: Validate data before inserting into Postgres JSONB columns.
      2. **Generation**: Passed to AI SDK `generateObject` to structure the LLM output.
    - **Required Schemas**:
      - `ontologySchema`: Validates the enum values for each parameter.
      - `factionSchema`: Name, ideology, resources, relationships.
      - `locationSchema`: Name, type, description, key_npcs.
      - `createUniverseSchema`: Ontology inputs, visibility preference, optional user prompts.
      - `updateUniverseSchema`: For editing visibility, name, description, cover.

- **User Flow**:

  1. **Navigate to Universe Creation**: User starts a new game flow.
  2. **Select Source**: Choose between "Create New", "Starter Templates", or "Community Universes".
  3. **Define Reality (Ontology)**: (If creating) User selects "Medieval", "High Magic", "Feudal", "Active Gods".
  4. **Review & Generate**: System uses AI to weave these into a cohesive setting and generates a cover image.
  5. **Configure Visibility**: User chooses to keep it Private or make it Public.
  6. **Save**: Universe is saved and available for Character Creation.

- **Acceptance Criteria**:

  - Users can mix and match ontology parameters.
  - Users can toggle between Private and Public visibility.
  - Public universes appear in the community list.
  - Users can see a cover image for each universe.
  - Generated factions and history MUST reflect the chosen ontology.
  - Starter universes are available for quick play.
  - Universe persists and can be reused for multiple campaigns.

- **Edge Cases**:

  - **Conflicting Parameters**: e.g., "Stone Age" + "Corporate State". AI should interpret creatively (e.g., "Flintstone-style rock corporations").
  - **Empty Prompts**: System should provide sensible defaults if user skips optional details.

- **Dependencies**:
  - AI SDK for generation.
  - Database Setup (User Profile).
