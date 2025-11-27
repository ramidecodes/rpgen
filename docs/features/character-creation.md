# Feature Requirement Document - Character Creation

- **Feature Name**: Character Creation

- **Goal**: Allow players to create new characters with stat rolling (DnD-style), character properties, and persistence. Players can create multiple characters and select which character to use for campaigns.

- **User Story**: As a player, I want to create a character by rolling stats and providing character details, so that I can have a unique character with specific abilities and backstory to use in my campaigns.

- **Functional Requirements**: 
  - Implement dice rolling system in `src/lib/game/dice.ts`:
    - `rollStat()` function that generates random values 1-20
    - Use cryptographically secure random number generation
    - Strength, Agility, Intelligence, Scholarship, Intuition (all 1-20 range)
  - Create Zod schemas in `src/lib/db/schemas/character.ts`:
    - `createCharacterSchema`: name (required), stats (1-20 each), properties (optional)
    - `updateCharacterSchema`: name (optional), stats locked, properties (optional)
    - Export inferred types: `CreateCharacter`, `UpdateCharacter`
  - Define Drizzle schema in `src/lib/db/schema.ts`:
    - `characters` table with all required fields
    - Foreign key relationship to `user_profiles`
    - Proper indexes for user_id queries
  - Allow players to manually adjust rolled stats (optional re-roll or manual assignment)
  - Character properties input using shadcn/ui components:
    - `Input` component for name
    - `Textarea` component for backstory and physicality
    - `Select` component for profession (if predefined options)
    - Form validation using React Hook Form with Zod resolver
  - Create character creation UI form (`src/app/characters/new/page.tsx`):
    - Stat rolling interface with visual dice rolls (shadcn/ui `Button` components)
    - Input fields for character properties (shadcn/ui form components)
    - Save/Cancel actions (shadcn/ui `Button` components)
    - Form validation with real-time feedback
  - Create server actions in `src/app/actions/characters.ts`:
    - `createCharacterAction` - Server action with Zod validation
    - `getUserCharactersAction` - Fetch user's characters
    - `updateCharacterAction` - Update character (properties only)
    - `deleteCharacterAction` - Delete character with confirmation
  - Persist character to database using Drizzle ORM with Zod validation
  - Create character selection interface using shadcn/ui components
  - Display list of user's created characters (shadcn/ui `Card` components)
  - Allow character editing (update properties, but stats locked after creation)
  - Allow character deletion (with confirmation using shadcn/ui `AlertDialog`)

- **Data Requirements**: 
  - **Drizzle Schema Definition** (`src/lib/db/schema.ts`):
    ```typescript
    export const characters = pgTable('characters', {
      id: uuid('id').defaultRandom().primaryKey(),
      userId: uuid('user_id').references(() => userProfiles.id).notNull(),
      name: varchar('name', { length: 100 }).notNull(),
      origin: text('origin'),
      backstory: text('backstory'),
      profession: varchar('profession', { length: 100 }),
      physicality: text('physicality'),
      strength: integer('strength').notNull(),
      agility: integer('agility').notNull(),
      intelligence: integer('intelligence').notNull(),
      scholarship: integer('scholarship').notNull(),
      intuition: integer('intuition').notNull(),
      createdAt: timestamp('created_at').defaultNow().notNull(),
      updatedAt: timestamp('updated_at').defaultNow().notNull(),
    });
    ```
  - **Zod Validation Schema** (`src/lib/db/schemas/character.ts`):
    - `createCharacterSchema`: name (required), all stats (1-20), properties (optional)
    - `updateCharacterSchema`: name (optional), stats (locked/not allowed), properties (optional)
    - Types inferred: `CreateCharacter`, `UpdateCharacter`
  - **Database Table**: `characters`
    - `id`: UUID (primary key, auto-generated)
    - `user_id`: UUID (foreign key to user_profiles.id)
    - `name`: VARCHAR(100) (not null)
    - `origin`: TEXT (nullable)
    - `backstory`: TEXT (nullable)
    - `profession`: VARCHAR(100) (nullable)
    - `physicality`: TEXT (nullable)
    - `strength`: INTEGER (1-20, not null)
    - `agility`: INTEGER (1-20, not null)
    - `intelligence`: INTEGER (1-20, not null)
    - `scholarship`: INTEGER (1-20, not null)
    - `intuition`: INTEGER (1-20, not null)
    - `created_at`: TIMESTAMP (default: now())
    - `updated_at`: TIMESTAMP (default: now())
  - **Indexes**: 
    - Index on `user_id` for efficient user character queries (via Drizzle)
  - **Relationships**: 
    - Many-to-one with user_profiles (via Drizzle relations)
    - Future: One-to-many with campaigns (via Drizzle relations)

- **User Flow**: 
  1. User navigates to character creation page
  2. User clicks "Create New Character"
  3. System displays stat rolling interface
  4. User rolls dice for each stat (or manually assigns values)
  5. User fills in character properties (name required, others optional)
  6. User reviews character summary
  7. User clicks "Save Character"
  8. Character is saved to database and associated with user
  9. User is redirected to character list or character detail page
  10. User can select this character for use in campaigns
  11. User can edit character properties later (but not stats)

- **Acceptance Criteria**: 
  - Dice rolling system generates random values between 1-20 for each stat
  - All five stats can be rolled independently
  - Zod schemas validate all character data (client and server-side)
  - Character name is required and validated via Zod
  - Character properties can be saved (all optional except name)
  - Character is persisted to database using Drizzle ORM with correct user association
  - Character list displays all user's characters using shadcn/ui components
  - Character can be selected as active character
  - Character can be edited (properties only, stats locked via Zod schema)
  - Character can be deleted with confirmation (shadcn/ui AlertDialog)
  - Stat values are validated to be within 1-20 range via Zod
  - Character creation form shows validation errors clearly (React Hook Form + Zod)
  - Character data persists across sessions
  - Server actions use Zod for validation before database operations

- **Edge Cases**: 
  - User tries to create character without name - should show validation error
  - Stat roll generates invalid value - should re-roll or clamp to valid range
  - User tries to edit stats after creation - should prevent or show warning
  - User deletes character that's in active campaign - should warn or prevent
  - Database save fails - should show error and allow retry
  - User creates character with duplicate name - should allow or warn
  - Network error during save - should handle gracefully

- **Non-Functional Requirements**: 
  - **Performance**: Stat rolling should be instant, character save < 500ms
  - **UX**: Dice rolling should have visual feedback (animation, sound optional)
  - **Accessibility**: Form should be keyboard navigable and screen-reader friendly
  - **Validation**: Client-side and server-side validation for data integrity

- **Dependencies**: 
  - Base Next.js Implementation (base-implementation.md)
  - Authentication with Clerk (authentication-clerk.md)
  - Database Setup with User Profile (database-setup-user-profile.md)

