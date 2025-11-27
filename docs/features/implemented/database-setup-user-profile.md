# Feature Requirement Document - Database Setup with User Profile

- **Feature Name**: Database Setup with User Profile

- **Goal**: Set up Neon Postgres database connection and create the initial user profile table to persist user data beyond what Clerk provides. This establishes the data persistence layer foundation for storing game-related user information.

- **User Story**: As a player, I want my profile information to be stored in the database, so that the application can associate my game data (characters, campaigns) with my account and persist it across sessions.

- **Functional Requirements**: 
  - Set up Neon Postgres database connection using **Drizzle ORM** with `postgres` driver
  - Create database client initialization module in `src/lib/db/index.ts`:
    - Export Drizzle instance with Neon Postgres connection
    - Configure connection pooling for serverless environment using `@neondatabase/serverless`
    - Handle connection string from environment variables
  - Create Drizzle schema definition in `src/lib/db/schema.ts`:
    - Define `userProfiles` table using Drizzle's `pgTable` function
    - Use `uuid`, `varchar`, `timestamp` column types from `drizzle-orm/pg-core`
    - Set up proper indexes using `index()` function
    - Define relationships using Drizzle relations API
  - Create Zod schema for user profile validation in `src/lib/db/schemas/user-profile.ts`:
    - `createUserProfileSchema` for creation (clerk_user_id required)
    - `updateUserProfileSchema` for updates (all fields optional)
    - Export inferred TypeScript types from Zod schemas
  - Create Drizzle schema types:
    - Export `UserProfile` type from Drizzle schema
    - Create `NewUserProfile` type for insertions
    - Create `UserProfileUpdate` type for updates
  - Implement basic CRUD operations using Drizzle query builder:
    - `createUserProfile()` - Insert new profile with Zod validation
    - `getUserProfileByClerkId()` - Select by clerk_user_id
    - `updateUserProfile()` - Update with Zod validation
    - `deleteUserProfile()` - Delete (or soft delete) profile
  - Create server actions in `src/app/actions/user-profile.ts`:
    - `createUserProfileAction` - Server action with Zod validation
    - `getUserProfileAction` - Server action to fetch profile
    - `updateUserProfileAction` - Server action with Zod validation
  - Set up Drizzle Kit for migrations:
    - Configure `drizzle.config.ts` with Neon connection
    - Create initial migration: `pnpm drizzle-kit generate`
    - Apply migration: `pnpm drizzle-kit migrate` or use Drizzle's programmatic migration API
  - Handle database connection errors gracefully with retry logic
  - Create initial migration file for user profile table

- **Data Requirements**: 
  - **Drizzle Schema Definition** (`src/lib/db/schema.ts`):
    ```typescript
    export const userProfiles = pgTable('user_profiles', {
      id: uuid('id').defaultRandom().primaryKey(),
      clerkUserId: varchar('clerk_user_id', { length: 255 }).notNull().unique(),
      username: varchar('username', { length: 100 }),
      createdAt: timestamp('created_at').defaultNow().notNull(),
      updatedAt: timestamp('updated_at').defaultNow().notNull(),
    });
    
    export const userProfilesIndex = index('user_profiles_clerk_user_id_idx')
      .on(userProfiles.clerkUserId);
    ```
  - **Zod Validation Schema** (`src/lib/db/schemas/user-profile.ts`):
    - `createUserProfileSchema`: clerkUserId (required), username (optional)
    - `updateUserProfileSchema`: clerkUserId (optional), username (optional)
    - Types inferred: `CreateUserProfile`, `UpdateUserProfile`
  - **Database Table**: `user_profiles`
    - `id`: UUID (primary key, auto-generated via Drizzle)
    - `clerk_user_id`: VARCHAR(255) (unique, indexed, not null)
    - `username`: VARCHAR(100) (nullable)
    - `created_at`: TIMESTAMP (default: now())
    - `updated_at`: TIMESTAMP (default: now(), updated via Drizzle)
  - **Indexes**: 
    - Primary key on `id` (automatic)
    - Unique index on `clerk_user_id` (via Drizzle index)
  - **Relationships**: 
    - Future: One-to-many with characters table (via Drizzle relations)
    - Future: One-to-many with campaigns table (via Drizzle relations)

- **User Flow**: 
  1. User signs up or signs in via Clerk
  2. Application checks if user profile exists in database
  3. If profile doesn't exist, create new profile linked to Clerk user ID
  4. If profile exists, load user profile data
  5. User can view and edit their profile information
  6. Profile updates are saved to database
  7. Profile data is available throughout the application via server actions

- **Acceptance Criteria**: 
  - Neon Postgres database connection is established successfully using Drizzle ORM
  - Drizzle client can connect and execute queries
  - User profile table schema is defined in `src/lib/db/schema.ts`
  - Zod schemas validate all user profile operations
  - User profile table is created via Drizzle migration
  - User profile is automatically created when user first authenticates (via server action)
  - User profile can be retrieved by Clerk user ID using Drizzle queries
  - User profile can be updated with Zod validation
  - Database connection pooling works correctly with Neon serverless driver
  - Connection errors are handled gracefully with appropriate error messages
  - TypeScript types from Drizzle schema match database structure
  - Drizzle migrations can be generated and applied successfully
  - Database queries perform efficiently (< 100ms for simple queries)
  - Server actions use Zod for input validation before database operations

- **Edge Cases**: 
  - Database connection failure - should retry with exponential backoff
  - Duplicate Clerk user ID - should prevent creation and handle gracefully
  - Profile creation fails after Clerk sign-up - should have retry mechanism
  - Database timeout - should show user-friendly error
  - Missing Clerk user ID - should validate before database operations
  - Concurrent profile creation - should handle race conditions
  - Database migration failures - should rollback safely

- **Non-Functional Requirements**: 
  - **Performance**: Database queries should complete in < 100ms for simple operations
  - **Reliability**: Connection pooling should handle serverless cold starts
  - **Security**: Database credentials must be stored in environment variables
  - **Scalability**: Database connection should support concurrent requests
  - **Maintainability**: Database schema should be version-controlled via migrations

- **Dependencies**: 
  - Base Next.js Implementation (base-implementation.md)
  - Authentication with Clerk (authentication-clerk.md)

