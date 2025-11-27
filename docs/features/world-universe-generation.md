# Feature Requirement Document - World Universe Generation

- **Feature Name**: World Universe Generation

- **Goal**: Enable players to generate or select a universe/world setting for their campaigns. The universe includes genre selection, region details, playable locations, world factions, and history that will shape the campaign narrative.

- **User Story**: As a player, I want to generate or select a universe setting for my campaign, so that my adventures take place in a rich, detailed world with factions, locations, and history that make the story immersive and unique.

- **Functional Requirements**: 
  - Genre selection interface using shadcn/ui components:
    - `RadioGroup` or `Select` component for genre selection
    - Four options: Fantasy, Sci-fi, Slice-of-life, Horror
    - Genre stored as enum type in database
  - Create Zod schemas in `src/lib/db/schemas/universe.ts`:
    - `genreSchema`: enum validation for genre types
    - `locationSchema`: Zod object schema for location structure
    - `factionSchema`: Zod object schema for faction structure
    - `createUniverseSchema`: region name, locations array, factions array, history
    - `updateUniverseSchema`: all fields optional (for custom universes)
  - Define Drizzle schema in `src/lib/db/schema.ts`:
    - `universes` table with JSONB columns for locations and factions
    - Use Drizzle's `jsonb()` type for complex nested data
    - Foreign key to user_profiles (nullable for pre-made)
  - Universe generation options:
    - Select from pre-made universes (one per genre, pre-generated)
    - Generate custom universe with player-provided details/prompts
    - Custom generation can use AI SDK `streamText()` or template-based generation
  - Universe elements to generate/store:
    - Region name (string, validated via Zod)
    - Playable locations (array validated via Zod array of locationSchema)
    - World factions (array validated via Zod array of factionSchema)
    - History (text, validated via Zod)
  - Custom universe generation:
    - Player provides optional prompt/details via shadcn/ui `Textarea`
    - System fills in gaps and generates complete universe description
    - Player can review and regenerate if unsatisfied
  - Create server actions in `src/app/actions/universes.ts`:
    - `createUniverseAction` - Server action with Zod validation
    - `getPremadeUniversesAction` - Fetch pre-made universes by genre
    - `getUserUniversesAction` - Fetch user's custom universes
    - `updateUniverseAction` - Update custom universe (Zod validated)
  - Universe persistence in database using Drizzle ORM
  - Universe selection/loading interface using shadcn/ui components
  - Display universe details in readable format (shadcn/ui `Card` components)
  - Allow universe editing (for custom universes only, using Zod validation)
  - Pre-made universes should be read-only templates

- **Data Requirements**: 
  - **Drizzle Schema Definition** (`src/lib/db/schema.ts`):
    ```typescript
    export const universes = pgTable('universes', {
      id: uuid('id').defaultRandom().primaryKey(),
      userId: uuid('user_id').references(() => userProfiles.id),
      genre: varchar('genre', { length: 20 }).notNull(),
      regionName: varchar('region_name', { length: 200 }).notNull(),
      playableLocations: jsonb('playable_locations').$type<Location[]>(),
      worldFactions: jsonb('world_factions').$type<Faction[]>(),
      history: text('history').notNull(),
      isPremade: boolean('is_premade').default(false).notNull(),
      createdAt: timestamp('created_at').defaultNow().notNull(),
      updatedAt: timestamp('updated_at').defaultNow().notNull(),
    });
    ```
  - **Zod Schemas** (`src/lib/db/schemas/universe.ts`):
    - `locationSchema`: name, description, type (all strings)
    - `factionSchema`: name, demographics, culture, values, goals (all strings)
    - `genreSchema`: enum(['fantasy', 'sci-fi', 'slice-of-life', 'horror'])
    - `createUniverseSchema`: genre, regionName, playableLocations (array), worldFactions (array), history
    - `updateUniverseSchema`: all fields optional
  - **Database Table**: `universes`
    - `id`: UUID (primary key)
    - `user_id`: UUID (foreign key, nullable for pre-made)
    - `genre`: VARCHAR(20) (not null, enum)
    - `region_name`: VARCHAR(200) (not null)
    - `playable_locations`: JSONB (array of Location objects, validated via Zod)
    - `world_factions`: JSONB (array of Faction objects, validated via Zod)
    - `history`: TEXT (not null)
    - `is_premade`: BOOLEAN (default: false)
    - `created_at`: TIMESTAMP (default: now())
    - `updated_at`: TIMESTAMP (default: now())
  - **Indexes**: 
    - Index on `genre` for filtering (via Drizzle)
    - Index on `user_id` for user's custom universes (via Drizzle)
    - Index on `is_premade` for template queries (via Drizzle)
  - **Relationships**: 
    - Many-to-one with user_profiles (via Drizzle relations, nullable)
    - Future: One-to-many with campaigns (via Drizzle relations)

- **User Flow**: 
  1. User navigates to universe generation/selection page
  2. User selects a genre (Fantasy, Sci-fi, Slice-of-life, or Horror)
  3. User chooses to either:
     - Select a pre-made universe for that genre
     - Generate a custom universe
  4. If selecting pre-made: User views available pre-made universes and selects one
  5. If generating custom: User provides optional details/prompt
  6. System generates universe with all required elements
  7. User reviews generated universe
  8. User can regenerate if unsatisfied (for custom universes)
  9. User saves universe (custom) or confirms selection (pre-made)
  10. Universe is stored/associated with user account
  11. Universe is available for campaign creation

- **Acceptance Criteria**: 
  - All four genres are available for selection
  - Pre-made universes exist for each genre (at least one per genre)
  - Custom universe generation creates all required elements (region name, locations, factions, history)
  - Generated universe elements are coherent and match the selected genre
  - Universe is persisted to database correctly
  - Custom universes are associated with the creating user
  - Pre-made universes are available to all users
  - Universe details are displayed in readable format
  - Custom universes can be edited
  - Pre-made universes cannot be edited
  - Universe can be selected for campaign creation
  - Generated content is unique (no exact duplicates)

- **Edge Cases**: 
  - User provides very vague custom prompt - system should generate comprehensive universe
  - User provides extremely detailed custom prompt - system should incorporate details
  - Universe generation fails - should show error and allow retry
  - User tries to edit pre-made universe - should prevent or create copy
  - Generated universe has missing elements - should validate and regenerate
  - User deletes custom universe that's used in campaign - should warn or prevent
  - Network error during generation - should handle gracefully

- **Non-Functional Requirements**: 
  - **Performance**: Universe generation should complete in < 10 seconds
  - **Quality**: Generated content should be coherent and genre-appropriate
  - **Scalability**: Pre-made universes should be efficiently stored and retrieved
  - **UX**: Generation process should show progress/loading state

- **Dependencies**: 
  - Base Next.js Implementation (base-implementation.md)
  - Database Setup with User Profile (database-setup-user-profile.md)
  - Note: Universe generation may use AI (Game Master Agent) but can start with template-based generation

