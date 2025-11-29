# Feature Requirement Document - World Universe Generation

- **Feature Name**: World Universe Generation

- **Goal**: Enable players to generate or select a universe/world setting for their campaigns based on deep ontological parameters. The universe includes timeline, physics, metaphysics, social structure, regions, and history that will serve as the consistent reality for multiple campaigns.

- **User Story**: As a player, I want to define the fundamental reality of a universe (time period, magic, physics), so that I can play different campaigns in a world that feels consistent, deep, and logically grounded.

- **Functional Requirements**: 
  - **Ontology Selection Interface** (shadcn/ui components):
    - `Select` or `RadioGroup` components for core ontology parameters.
    - **Timeframe**: Early Humans, First Civilizations, Medieval, Industrial, Modern, Future, Distant Future.
    - **Magic Level**: None, Rare (Ritualistic), Common (Industrialized), High Magic (Reality warping).
    - **Physics Reality**: Hard Physics, Cartoon/Anime Logic, Dream Logic.
    - **Metaphysics**: Materialist (No Gods), Interventionist (Active Gods), Eldritch (Indifferent/Hostile Cosmos).
    - **Social Structure**: Tribal, Feudal, Imperial, Democratic, Corporate, Anarchic.
  - **Universe Generation**:
    - Use AI SDK `generateObject` to create a cohesive world based on the selected ontology.
    - Generate a unique `Region Name` and `History` that explains how this ontology shaped the world.
    - Generate `Factions` that logically emerge from the social structure and magic level.
    - Generate `Playable Locations` that fit the timeframe and physics.
  - **Data Management**:
    - Store `ontology` as a JSONB column to allow flexibility.
    - Support "Starter Universes" (pre-made templates) via `is_premade` flag.
  - **Server Actions**:
    - `createUniverseAction`: Validates ontology and generates world details.
    - `getStarterUniversesAction`: Returns curated templates (e.g., "Cyberpunk Tokyo", "Tolkenian Fantasy").

- **Data Requirements**: 
  - **Drizzle Schema Definition** (`src/lib/db/schema.ts`):
    ```typescript
    export const universes = pgTable('universes', {
      id: uuid('id').defaultRandom().primaryKey(),
      userId: uuid('user_id').references(() => userProfiles.id), // Nullable for system templates
      name: varchar('name', { length: 200 }).notNull(),
      description: text('description').notNull(),
      ontology: jsonb('ontology').$type<{
        timeframe: string;
        magicLevel: string;
        physics: string;
        metaphysics: string;
        socialStructure: string;
      }>().notNull(),
      factions: jsonb('factions').$type<Faction[]>(),
      locations: jsonb('locations').$type<Location[]>(),
      history: text('history').notNull(),
      isPremade: boolean('is_premade').default(false).notNull(),
      createdAt: timestamp('created_at').defaultNow().notNull(),
      updatedAt: timestamp('updated_at').defaultNow().notNull(),
    });
    ```
  - **Zod Schemas** (`src/lib/db/schemas/universe.ts`):
    - `ontologySchema`: Validates the enum values for each parameter.
    - `factionSchema`: Name, ideology, resources, relationships.
    - `locationSchema`: Name, type, description, key_npcs.
    - `createUniverseSchema`: Ontology inputs + optional user prompts.

- **User Flow**: 
  1. **Navigate to Universe Creation**: User starts a new game flow.
  2. **Define Reality (Ontology)**: User selects "Medieval", "High Magic", "Feudal", "Active Gods".
  3. **Review & Generate**: System uses AI to weave these into a cohesive setting (e.g., "The Kingdom of Aethelgard, where wizard-lords rule by divine right").
  4. **Save**: Universe is saved and available for Character Creation.

- **Acceptance Criteria**: 
  - Users can mix and match ontology parameters (e.g., "Medieval" + "High Tech" = Steampunk/Magitech).
  - Generated factions and history MUST reflect the chosen ontology (no spaceships in the Stone Age).
  - Starter universes are available for quick play.
  - Universe persists and can be reused for multiple campaigns.

- **Edge Cases**: 
  - **Conflicting Parameters**: e.g., "Stone Age" + "Corporate State". AI should interpret creatively (e.g., "Flintstone-style rock corporations").
  - **Empty Prompts**: System should provide sensible defaults if user skips optional details.

- **Dependencies**: 
  - AI SDK for generation.
  - Database Setup (User Profile).
