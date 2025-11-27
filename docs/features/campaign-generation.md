# Feature Requirement Document - Campaign Generation

- **Feature Name**: Campaign Generation

- **Goal**: Enable players to create new campaigns with main conflicts, factions, allies, enemies, ultimate boss, random events, and ending conditions. Campaigns link characters and universes together to create playable adventures.

- **User Story**: As a player, I want to create a campaign that combines my character and a universe, so that I can start playing an adventure with a main conflict, factions, and story elements that will unfold based on my actions.

- **Functional Requirements**: 
  - Campaign creation flow using shadcn/ui components:
    - `Select` component for character selection (or link to create new)
    - `Select` component for universe selection (or link to create new)
    - Generate campaign elements based on selected universe
  - Create Zod schemas in `src/lib/db/schemas/campaign.ts`:
    - `allySchema`: name, background, motivations (all strings)
    - `enemySchema`: name, agenda, motivations (all strings)
    - `bossSchema`: name, description, challengeLevel (all strings)
    - `eventSchema`: name, description, triggerConditions (all strings)
    - `conditionSchema`: description, type (enum: 'victory', 'defeat', 'alternative')
    - `campaignStateSchema`: narrative state, progress, faction relationships (JSONB structure)
    - `createCampaignSchema`: characterId, universeId, name, all campaign elements
    - `updateCampaignSchema`: state updates, status changes
  - Define Drizzle schema in `src/lib/db/schema.ts`:
    - `campaigns` table with JSONB columns for complex nested data
    - Foreign keys to characters, universes, user_profiles
    - Use Drizzle's `jsonb()` type with TypeScript types
  - Campaign elements to generate/store:
    - Main conflict (text, validated via Zod)
    - Factions involved (array of strings, references from universe)
    - Main allies (array validated via Zod array of allySchema)
    - Main enemies (array validated via Zod array of enemySchema)
    - Ultimate boss (object validated via bossSchema)
    - Random events (array validated via Zod array of eventSchema)
    - Ending conditions (array validated via Zod array of conditionSchema)
  - Campaign state management:
    - Track current story segment/narrative state (JSONB, validated via campaignStateSchema)
    - Track player progress/decisions (in state JSONB)
    - Track faction relationships and changes (in state JSONB)
    - Track completed events and encounters (in state JSONB)
  - Create server actions in `src/app/actions/campaigns.ts`:
    - `createCampaignAction` - Server action with Zod validation
    - `getUserCampaignsAction` - Fetch user's campaigns
    - `getCampaignAction` - Fetch campaign by ID with full details
    - `updateCampaignStateAction` - Update campaign state (Zod validated)
    - `deleteCampaignAction` - Delete campaign with confirmation
  - Campaign persistence in database using Drizzle ORM
  - Campaign selection/loading interface using shadcn/ui components
  - Display campaign details and current state (shadcn/ui `Card` components)
  - Resume existing campaign functionality
  - Campaign list showing all user's campaigns (shadcn/ui components)
  - Campaign deletion (with confirmation using shadcn/ui `AlertDialog`)

- **Data Requirements**: 
  - **New Table**: `campaigns`
    - `id`: UUID (primary key)
    - `user_id`: UUID (foreign key to user_profiles.id)
    - `character_id`: UUID (foreign key to characters.id)
    - `universe_id`: UUID (foreign key to universes.id)
    - `name`: VARCHAR(200) (not null, user-provided or auto-generated)
    - `main_conflict`: TEXT (not null)
    - `factions_involved`: JSONB (array of faction references/names)
    - `main_allies`: JSONB (array of ally objects)
    - `main_enemies`: JSONB (array of enemy objects)
    - `ultimate_boss`: JSONB (boss object)
    - `random_events`: JSONB (array of event objects)
    - `ending_conditions`: JSONB (array of condition objects)
    - `current_state`: JSONB (current narrative state, progress tracking)
    - `status`: VARCHAR(20) (enum: active, completed, abandoned, default: active)
    - `created_at`: TIMESTAMP (default: now())
    - `updated_at`: TIMESTAMP (default: now())
  - **Ally Object Structure (stored in JSONB):
    - `name`: string
    - `background`: string
    - `motivations`: string
  - **Enemy Object Structure** (stored in JSONB):
    - `name`: string
    - `agenda`: string
    - `motivations`: string
  - **Boss Object Structure** (stored in JSONB):
    - `name`: string
    - `description`: string
    - `challenge_level`: string
  - **Event Object Structure** (stored in JSONB):
    - `name`: string
    - `description`: string
    - `trigger_conditions`: string
  - **Condition Object Structure** (stored in JSONB):
    - `description`: string
    - `type`: string (e.g., "victory", "defeat", "alternative")
  - **Indexes**: 
    - Index on `user_id` for user's campaigns
    - Index on `character_id` for character's campaigns
    - Index on `universe_id` for universe's campaigns
    - Index on `status` for filtering active campaigns
  - **Relationships**: 
    - Many-to-one with user_profiles
    - Many-to-one with characters
    - Many-to-one with universes
    - Future: One-to-many with event_logs (campaign history)

- **User Flow**: 
  1. User navigates to campaign creation page
  2. User selects an existing character (or creates new one)
  3. User selects an existing universe (or creates new one)
  4. System generates campaign elements based on selected universe:
     - Main conflict derived from universe factions/history
     - Factions involved from universe factions
     - Main allies generated based on character and universe
     - Main enemies generated based on conflict and factions
     - Ultimate boss generated based on main conflict
     - Random events generated based on universe genre
     - Ending conditions generated based on conflict and factions
  5. User reviews generated campaign
  6. User can optionally customize campaign name
  7. User saves campaign
  8. Campaign is stored in database
  9. User is redirected to campaign play page
  10. User can resume campaign later from campaign list

- **Acceptance Criteria**: 
  - Campaign creation requires both character and universe selection
  - All campaign elements are generated and stored correctly
  - Campaign elements are coherent with selected universe and genre
  - Campaign is persisted to database with correct relationships
  - Campaign list displays all user's campaigns
  - Campaign can be resumed from saved state
  - Campaign status can be tracked (active, completed, abandoned)
  - Campaign can be deleted with confirmation
  - Campaign name can be customized
  - Campaign elements reference universe factions correctly
  - Generated allies/enemies/boss are unique and appropriate

- **Edge Cases**: 
  - User tries to create campaign without character - should require character selection
  - User tries to create campaign without universe - should require universe selection
  - Campaign generation fails - should show error and allow retry
  - User deletes character/universe used in campaign - should handle gracefully (cascade or prevent)
  - Campaign state becomes corrupted - should have recovery mechanism
  - User creates multiple campaigns with same character/universe - should allow
  - Network error during campaign creation - should handle gracefully

- **Non-Functional Requirements**: 
  - **Performance**: Campaign generation should complete in < 15 seconds
  - **Quality**: Generated campaign elements should be coherent and engaging
  - **Data Integrity**: Campaign relationships must be maintained (character, universe)
  - **Scalability**: Campaign state should be efficiently stored and retrieved

- **Dependencies**: 
  - Base Next.js Implementation (base-implementation.md)
  - Database Setup with User Profile (database-setup-user-profile.md)
  - Character Creation (character-creation.md)
  - World Universe Generation (world-universe-generation.md)
  - Note: Campaign generation may use AI (Game Master Agent) but can start with template-based generation

