# Feature Requirement Document - Campaign Generation

- **Feature Name**: Campaign Generation & Living World State

- **Goal**: Create an open-ended, multi-genre campaign engine where the "State" is not just a log, but a sophisticated **Narrative Graph**. This allows the Game Master Agent (GMA) to track complex relationships, unfolding plots (Fronts), and world changes dynamically.

- **User Story**: As a player, I want to play a campaign that feels alive—where my actions have consequences, factions move on their own, and the tone can shift between genres (e.g., starting as Fantasy, turning into Horror)—without hitting a hard "Game Over" or "You Win" screen arbitrarily.

- **Functional Requirements**:

  - **Multi-Genre Selection**:
    - User selects up to **3 Genres** to define the _narrative lens_ (e.g., "Fantasy" + "Horror" = Dark Fantasy).
    - Genres: `Fantasy`, `Sci-Fi`, `Slice of Life`, `Horror`.
  - **Campaign Setup**:
    - Select `Universe` + `Character`.
    - Select `Genres`.
    - AI generates initial **"Guiding Principles"** (Themes, Tone, Pacing).
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
      genres: jsonb("genres").$type<string[]>().notNull(), // e.g. ["fantasy", "horror"]

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

  1. **Select Character**: User picks their avatar. (Universe is implicit from Character).
  2. **Set Tone (Genres)**: User picks "Sci-Fi" + "Slice of Life" (e.g., "Coffee shop on a space station").
  3. **Initialize**: System generates the initial `campaignState` (Creating the first Fronts and Graph Nodes).
  4. **Play**: The campaign begins.

- **Acceptance Criteria**:

  - Campaign supports multiple genres.
  - Database stores the complex `campaignState` JSONB correctly.
  - GMA can read/write to the Knowledge Graph (verified via Tool use in next phase).
  - "Fronts" exist and can be advanced by the AI.

- **Edge Cases**:

  - **Graph Explosion**: If the Knowledge Graph gets too big (>10MB), we may need to prune old nodes or summarize.
  - **Contradictory Genres**: "Slice of Life" + "Horror". AI should interpret this as "Normal life interrupted by terror" or "Psychological horror".

- **Dependencies**:
  - Character Creation.
  - Game Master Agent (to consume the state).
