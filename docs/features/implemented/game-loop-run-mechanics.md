# Feature Requirement Document - Game Loop & Run Mechanics

- **Feature Name**: Game Loop & Run Mechanics

- **Goal**: Introduce the concept of a **Run** to separate static campaign templates from dynamic game instances. This allows campaigns to serve as reusable scenarios while Runs track the evolving narrative state, player decisions, and character progression.

- **User Story**: As a player, I want to create a campaign template that can be played multiple times with different characters, and each playthrough (Run) maintains its own unique narrative state, so that campaigns become reusable scenarios and each game session feels distinct.

- **Functional Requirements**:

  - **Campaign (Template)**:
    - Campaigns are static definitions that serve as scenario templates.
    - **Static Data**: `id`, `user_id`, `universe_id`, `name`, `description`, `cover_image`, `genres`, `is_public`, `likes_count`, `created_at`, `updated_at`.
    - **Removed Fields**: `character_id`, `campaign_state`, `status` (no longer tracks activity).
    - Campaigns do NOT generate initial state during creation (fast, minimal AI generation).

  - **Run (Instance)**:
    - Runs are active game instances that combine a Campaign template with a specific Character.
    - **Dynamic Data**:
      - `id` (UUID, PK)
      - `user_id` (FK -> User)
      - `campaign_id` (FK -> Campaign)
      - `character_id` (FK -> Character)
      - `state` (JSONB) - Stores the `CampaignState` (Narrative Graph, Active Fronts, Quest Threads, Knowledge Graph, Narrative Vectors).
      - `status` (Enum: `active`, `completed`, `abandoned`, `game_over`)
      - `created_at`, `updated_at`
    - Initial state generation happens when creating a Run, tailored to the Character's backstory and Campaign's premise.

  - **State Generation**:
    - When a Run is created, the system:
      1. Fetches the Campaign and Universe context.
      2. Fetches the Character details (backstory, stats, profession).
      3. Uses AI to generate the **Initial State** (Active Fronts, Starting Quests, Knowledge Graph) tailored to the Character.
    - The Game Master Agent reads and updates the Run's state during gameplay.

- **Data Requirements**:

  - **Schema Changes** (`src/lib/db/schema.ts`):
    - **`campaigns` Table**: Remove `character_id`, `campaign_state`, `status`.
    - **`runs` Table** (New):
      ```typescript
      export const runs = pgTable("runs", {
        id: uuid("id").defaultRandom().primaryKey(),
        userId: uuid("user_id").references(() => userProfiles.id).notNull(),
        campaignId: uuid("campaign_id").references(() => campaigns.id).notNull(),
        characterId: uuid("character_id").references(() => characters.id).notNull(),
        state: jsonb("state").$type<CampaignState>().notNull(),
        status: varchar("status", { length: 20 }).default("active").notNull(),
        createdAt: timestamp("created_at").defaultNow().notNull(),
        updatedAt: timestamp("updated_at").defaultNow().notNull(),
      });
      ```

  - **Zod Schemas** (`src/lib/db/schemas/run.ts`):
    - `createRunSchema`: Validates `campaignId`, `characterId`.
    - Reuse `campaignStateSchema` from `campaign.ts` for state validation.

- **User Flow**:

  1. **Campaign Creation**:
     - User selects a Universe.
     - User defines basic metadata (Name, Description, Genres).
     - System generates a cover image.
     - **Output**: A new `Campaign` record (fast, no state generation).

  2. **Run Initialization (Start Game)**:
     - User selects a Campaign.
     - User selects a Character (from the same Universe).
     - System fetches Campaign and Universe context.
     - System fetches Character details.
     - System uses AI to generate the Initial State tailored to the Character.
     - **Output**: A new `Run` record with `status: 'active'`.

  3. **Gameplay Loop**:
     - The Game Master Agent reads the `Run` state.
     - Player actions mutate the `Run` state.
     - The `Run` state persists between sessions.

- **API / Actions**:

  - **`createCampaign`** (`src/app/actions/campaign.ts`):
    - Simplified: No longer generates initial state.
    - Only creates Campaign record with metadata and cover image.

  - **`createRun`** (`src/app/actions/run.ts` - New):
    - Handles the heavy lifting of generating the initial Narrative Graph.
    - Takes `campaignId` and `characterId` as input.
    - Generates state using `generateCampaignState` (updated to include Character context).
    - Creates Run record with generated state.

  - **`startCampaign`** (Deprecated):
    - Replaced by `createRun`.
    - Old logic moved to `createRun`.

- **UI Changes**:

  - **Campaign Creation Form** (`src/components/campaign/campaign-creation-form.tsx`):
    - No changes needed (already doesn't require character).

  - **Campaign Detail Page** (`src/app/campaign/[id]/page.tsx`):
    - Change "Start Campaign" to "Start Run".
    - Use `createRun` instead of `startCampaign`.

  - **Campaign Start Form** (`src/components/campaign/campaign-start-form.tsx`):
    - Rename to `RunStartForm` or keep name but update action.
    - Call `createRun` instead of `startCampaign`.

  - **New: Run Detail Page** (`src/app/run/[id]/page.tsx`):
    - Display Run state, character, campaign info.
    - Entry point for gameplay.

- **Acceptance Criteria**:

  - Campaigns can be created without a character.
  - Multiple Runs can be created from the same Campaign with different Characters.
  - Each Run maintains its own independent state.
  - State generation happens during Run creation, not Campaign creation.
  - Game Master Agent reads from Run state, not Campaign state.

- **Edge Cases**:

  - **Character Universe Mismatch**: Character must belong to the same Universe as the Campaign. Validate before Run creation.
  - **Multiple Active Runs**: User can have multiple active Runs from the same Campaign. Each is independent.
  - **Campaign Deletion**: If a Campaign is deleted, what happens to active Runs? (Consider soft delete or prevent deletion if Runs exist).

- **Dependencies**:

  - Campaign Generation (for state generation logic).
  - Character Creation (Character must exist before Run creation).
  - Game Master Agent Integration (reads Run state).
