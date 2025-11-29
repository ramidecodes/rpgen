# Feature Requirement Document - Campaign Generation

- **Feature Name**: Campaign Generation & Living World State

- **Goal**: Create an open-ended, multi-genre campaign engine where the "State" is not just a log, but a sophisticated **Narrative Graph**. This allows the Game Master Agent (GMA) to track complex relationships, unfolding plots (Fronts), and world changes dynamically. Campaigns can be shared with the community to showcase interesting narratives.

- **User Story**: As a player, I want to play a campaign that feels alive—where my actions have consequences. I also want to be able to share my unique campaign story with the community or keep it private.

- **Functional Requirements**:

  - **Multi-Genre Selection**:
    - User selects up to **3 Genres** to define the _narrative lens_ (e.g., "Fantasy" + "Horror" = Dark Fantasy).
    - Genres: `Fantasy`, `Sci-Fi`, `Slice of Life`, `Horror`.
  - **Campaign Metadata & Visibility**:
    - **Visibility Toggle**: `Private` (default) or `Public` (view-only for others, or "forkable").
    - **Metadata**:
      - `Name`: Campaign title.
      - `Description`: Short premise or summary.
      - `Cover Image`: AI-generated or selected image.
  - **Campaign Setup**:

    - Select `Universe` (Private or Community) + `Character`.
    - Select `Genres`.
    - AI generates initial **"Guiding Principles"** (Themes, Tone, Pacing) using OpenRouter (`x-ai/grok-4.1-fast:free`).
    - AI generates `Cover Image` reflecting the genre and universe.
    - **AI Tool Specifications**:
      - **Provider**: OpenRouter
      - **Model**: `x-ai/grok-4.1-fast:free` (for initial implementation)
      - **`initializeCampaign` Tool**:
        - _Input_: `{ universeData, characterData, genres[] }`
        - _Output Schema_: `CampaignState` (matching the JSONB structure below).
        - _Usage_: Used via `generateObject` to create the starting state (Fronts, Graph, Vectors).

  - **Zod Schemas & AI Generation (`src/lib/db/schemas/campaign.ts`)**:
    - **Schema Strategy**: Define Zod schemas that serve TWO purposes:
      1. **Validation**: Validate data before inserting into Postgres JSONB columns.
      2. **Generation**: Passed to AI SDK `generateObject` to structure the LLM output.
    - **Required Schemas**:
      - `campaignStateSchema`: Full validation for the JSONB column, including nested schemas for `activeFronts`, `narrativeVectors`, `knowledgeGraph`, and `questThreads`.
      - `createCampaignSchema`: Validates inputs like `genres`, `universeId`, `characterId`.
  - **Social Features**:
    - **Public Listing**: Allow others to view campaign summaries/logs (if public).
    - **Likes/Ratings**: Community feedback on interesting campaign setups/stories.
  - **Advanced State Model ("The Narrative Graph")**:
    - **Active Fronts** (PbtA Style): A list of threats/plots that advance if the player ignores them.
      - _Structure_: `{ name: "Cult Ritual", steps: 5, current: 2, description: "The sky is turning purple." }`
    - **Knowledge Graph**:
      - A graph structure of `Nodes` (NPCs, Locations, Items) and `Edges` (Relationships).
      - _Example Edge_: `(King Alaric) --[FEARS]--> (The Dragon)`
      - Allows GMA to query: "Who does X hate?" or "What items are in location Y?"
    - **Narrative Vectors**:
      - Float values tracking abstract game feel.
      - `Hope`: 0.0 (Despair) to 1.0 (Heroic).
      - `Chaos`: 0.0 (Order) to 1.0 (Anarchy).
    - **Quest Threads**:
      - Open-ended objectives tracked as lists, not booleans.
  - **Game Loop Integration**:
    - The GMA reads this Graph every turn to decide _what happens next_.
    - The GMA uses tools to _modify_ this Graph (e.g., `add_graph_edge`, `advance_front`).

- **Data Requirements**:

  - **Drizzle Schema Definition** (`src/lib/db/schema.ts`):

    ```typescript
    export const campaigns = pgTable("campaigns", {
      id: uuid("id").defaultRandom().primaryKey(),
      userId: uuid("user_id")
        .references(() => userProfiles.id)
        .notNull(),
      universeId: uuid("universe_id")
        .references(() => universes.id)
        .notNull(),
      characterId: uuid("character_id")
        .references(() => characters.id)
        .notNull(),
      name: varchar("name", { length: 200 }).notNull(),
      description: text("description"),
      coverImage: text("cover_image"),
      genres: jsonb("genres").$type<string[]>().notNull(), // e.g. ["fantasy", "horror"]

      isPublic: boolean("is_public").default(false).notNull(),
      likesCount: integer("likes_count").default(0).notNull(),

      // The "Blackbox" State
      campaignState: jsonb("campaign_state")
        .$type<{
          activeFronts: Array<{
            name: string;
            description: string;
            doomClock: number;
            maxDoom: number;
          }>;
          narrativeVectors: { hope: number; chaos: number };
          questThreads: Array<{
            title: string;
            status: string;
            clues: string[];
          }>;
          knowledgeGraph: {
            nodes: Array<{
              id: string;
              type: string;
              label: string;
              data: any;
            }>;
            edges: Array<{
              source: string;
              target: string;
              relation: string;
              weight: number;
            }>;
          };
        }>()
        .notNull(),

      status: varchar("status", { length: 20 }).default("active"),
      createdAt: timestamp("created_at").defaultNow().notNull(),
      updatedAt: timestamp("updated_at").defaultNow().notNull(),
    });
    ```

- **User Flow**:

  1. **Select Character**: User picks their avatar. (Universe is implicit from Character, or selected first if new).
  2. **Select Universe**: (If not tied to character yet) Choose Private or Community Universe.
  3. **Set Tone (Genres)**: User picks "Sci-Fi" + "Slice of Life".
  4. **Initialize**: System generates the initial `campaignState` and `coverImage`.
  5. **Configure Visibility**: Toggle Public/Private.
  6. **Play**: The campaign begins.

- **Acceptance Criteria**:

  - Campaign supports multiple genres and community universes.
  - Database stores `isPublic`, `coverImage`, and `likesCount`.
  - GMA can read/write to the Knowledge Graph (verified via Tool use in next phase).
  - "Fronts" exist and can be advanced by the AI.

- **Edge Cases**:

  - **Public Campaign Data Privacy**: Ensure hidden GM notes or "fog of war" details aren't accidentally exposed if we add a "Spectator Mode" later (out of scope now, but worth noting).
  - **Graph Explosion**: If the Knowledge Graph gets too big (>10MB), we may need to prune old nodes or summarize.
  - **Contradictory Genres**: "Slice of Life" + "Horror". AI should interpret this as "Normal life interrupted by terror" or "Psychological horror".

- **Dependencies**:
  - Character Creation.
  - Game Master Agent (to consume the state).
