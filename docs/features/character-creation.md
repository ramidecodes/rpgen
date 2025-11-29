# Feature Requirement Document - Character Creation

- **Feature Name**: Character Creation

- **Goal**: Allow players to create characters that are deeply integrated into a specific Universe. Characters must be consistent with the world's ontology (Timeframe, Magic, Technology) to ensuring narrative cohesion.

- **User Story**: As a player, I want to create a character that fits the world I just chose—selecting a profession and background that makes sense for that specific reality—so that my roleplay feels authentic.

- **Functional Requirements**: 
  - **Context-Aware Creation**:
    - The creation flow **MUST** receive `universe_id` as a parameter.
    - The UI fetches the `Universe` details (Ontology, Factions) before rendering options.
    - **Public Universe Support**: Users can create characters in ANY Public Universe, not just their own. The character is owned by the user, but linked to the public universe.
  - **Profession & Origin Filtering**:
    - Instead of a static list of classes, generating/selecting professions should be filtered by the Universe Ontology.
    - *Example*: If Universe is "Sci-Fi", show "Pilot", "Hacker". If "Fantasy", show "Wizard", "Knight".
  - **Stat System (Old-School DnD Style)**:
    - **Roll Stats**: Strength, Agility, Intelligence, Scholarship, Intuition (1-20).
    - **Constraint**: Validated by Zod schema to ensure fair play (or allow "God Mode" flag for testing).
  - **Bio & Backstory**:
    - Fields for `Name`, `Appearance`, `Personality`.
    - **AI Assist**: "Generate Backstory" button that uses the Universe History + Character Stats to write a cohesive origin.
  - **AI Tool Specifications**:
    - **Provider**: OpenRouter
    - **Model**: `x-ai/grok-4.1-fast:free` (for initial implementation)
    - **`generateBackstory` Tool**:
      - *Input*: `{ universeContext, characterStats, profession }`
      - *Output*: `{ backstory: string, personalityTraits: string[] }`
      - *Usage*: Used via `generateObject` in the client/server action to draft the bio.
  - **Faction Alignment**:
    - User can optionally select a starting alignment with one of the Universe's factions (e.g., "Rebel Sympathizer").

- **Data Requirements**: 
  - **Drizzle Schema Definition** (`src/lib/db/schema.ts`):
    ```typescript
    export const characters = pgTable('characters', {
      id: uuid('id').defaultRandom().primaryKey(),
      userId: uuid('user_id').references(() => userProfiles.id).notNull(),
      universeId: uuid('universe_id').references(() => universes.id).notNull(), // Link to specific reality
      name: varchar('name', { length: 100 }).notNull(),
      stats: jsonb('stats').$type<{
        strength: number;
        agility: number;
        intelligence: number;
        scholarship: number;
        intuition: number;
      }>().notNull(),
      properties: jsonb('properties').$type<{
        origin: string;
        profession: string;
        appearance: string;
        backstory: string;
      }>(),
      createdAt: timestamp('created_at').defaultNow().notNull(),
      updatedAt: timestamp('updated_at').defaultNow().notNull(),
    });
    ```
  - **Zod Schemas & AI Generation (`src/lib/db/schemas/character.ts`)**:
    - **Schema Strategy**: Define Zod schemas that serve TWO purposes:
      1. **Validation**: Validate data before inserting into Postgres JSONB columns.
      2. **Generation**: Passed to AI SDK `generateObject` to structure the LLM output.
    - **Required Schemas**:
      - `characterStatsSchema`: Validates stats (1-20).
      - `characterBackstorySchema`: Validates `backstory`, `personalityTraits`.
      - `createCharacterSchema`: Full validation including `universeId`.

- **User Flow**: 
  1. **Select Universe**: User confirms which world this character belongs to.
  2. **Roll Stats**: User clicks "Roll" to get their attribute spread.
  3. **Define Identity**: User enters name and selects/prompts Profession (context-aware).
  4. **AI Integration**: User asks AI to "Draft a backstory for a weak but smart hacker in this Cyberpunk world."
  5. **Save**: Character is stored and linked to the Universe.

- **Acceptance Criteria**: 
  - Character Profession matches Universe Ontology (no Wizards in Hard Sci-Fi unless explained).
  - Stats are persisted correctly.
  - Character is strictly linked to ONE Universe (cannot transfer a Space Marine to a High Fantasy world without "Isekai" logic).

- **Edge Cases**: 
  - **Mismatched Ontology**: User tries to force a "Wizard" in a non-magic world. System should warn or AI should reinterpret (e.g., "Techno-Wizard" or "Stage Magician").

- **Dependencies**: 
  - World Universe Generation (Universe ID required).
  - Database Setup.
