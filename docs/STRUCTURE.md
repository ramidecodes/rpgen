# Project Structure

This document provides an overview of the project's directory structure and guidelines for where code should be placed. This serves as a reference for coding agents to understand the project organization.

## Directory Tree

```
.
├── docs/                    # Project documentation
│   ├── features/            # Feature documentation
│   │   └── implemented/     # Completed feature docs
│   ├── ARCHITECTURE.md
│   └── STRUCTURE.md
├── drizzle/                # Database migrations
│   ├── meta/               # Migration metadata
│   └── *.sql               # Migration files
├── public/                  # Static assets (favicons, manifests)
├── src/
│   ├── agents/             # AI agent implementations
│   ├── app/                 # Next.js App Router
│   │   ├── actions/        # Server actions (*.ts)
│   │   ├── */              # Route directories
│   │   │   └── page.tsx    # Route pages
│   │   ├── layout.tsx      # Root layout
│   │   ├── page.tsx        # Home page
│   │   └── globals.css     # Global styles
│   ├── components/         # React components
│   │   ├── campaign/       # Campaign components
│   │   ├── character/      # Character components
│   │   ├── hero/           # Hero section components
│   │   ├── layout/         # Layout components
│   │   └── ui/             # Reusable UI components
│   ├── hooks/              # Custom React hooks
│   ├── lib/                # Core library code
│   │   ├── ai/             # AI generation utilities
│   │   ├── auth/           # Authentication (Clerk)
│   │   ├── db/             # Database layer
│   │   │   ├── queries/    # Database queries
│   │   │   ├── schemas/    # Drizzle schemas
│   │   │   └── utils/      # DB utilities
│   │   ├── game/           # Game logic
│   │   ├── storage/        # Storage integration (R2)
│   │   └── utils.ts        # General utilities
│   ├── types/              # TypeScript type definitions
│   ├── utils/              # Additional utilities
│   └── proxy.ts            # Proxy configuration
├── *.config.*              # Configuration files
├── package.json
└── tsconfig.json
```

## Directory Guidelines

### `/src/app`

**Purpose**: Next.js App Router pages and routes.

- **`actions/`**: Server actions for data mutations. Each domain (campaign, character, run, universe, user-profile, scenes) has its own action file.
- **Route directories**: Each route directory (`campaigns/`, `characters/`, `runs/`, `universes/`, `profile/`, `sign-in/`, `sign-up/`, `about/`) contains:
  - `page.tsx` - The route page component
  - `[id]/` - Dynamic route segments
  - `create/` - Creation pages
- **`api/`**: API routes for chat, webhooks, and other endpoints:
  - `chat/route.ts` - Main chat API endpoint for game interactions
  - `webhooks/replicate/route.ts` - Webhook endpoint for Replicate image generation completion events
- **Root files**: `layout.tsx` (root layout), `page.tsx` (home page), `globals.css` (global styles)

**Guidelines**:

- Use Server Components by default (no `"use client"` directive)
- Only add `"use client"` when using hooks, browser APIs, or event handlers
- Place server actions in `actions/` directory, organized by domain

**Message Loading for Runs**:

- Messages are loaded from the database in server components (e.g., `runs/[id]/play/page.tsx`)
- Messages are stored in JSONB format with support for both `content` and `parts` fields
- Messages are converted from database format to `UIMessage[]` format (AI SDK v6 UI message type)
- `UIMessage` differs from `CoreMessage`: `UIMessage` is for UI display, `CoreMessage` is for model input
- Messages are passed as `initialMessages` to client components, which pass them to `useChat` hook
- The `useChat` hook from `@ai-sdk/react` initializes with these messages for display

### `/src/components`

**Purpose**: React components organized by feature domain.

- **`campaign/`**: Campaign-related form and display components
- **`character/`**: Character creation and management components
- **`game/`**: Game play components (chat interface, scene visualizer, skill checks, etc.)
- **`hero/`**: Hero section and visual effects (animations, backgrounds)
- **`layout/`**: Layout components (header, footer, theme provider)
- **`ui/`**: Reusable UI primitives (buttons, cards, inputs, etc.)

**Guidelines**:

- Organize components by feature domain
- Place reusable UI primitives in `ui/`
- Use named exports for components
- Follow the coding standards for component structure

### `/src/lib`

**Purpose**: Core library code and business logic.

- **`ai/`**: AI generation utilities for campaigns, characters, images, scenes, and universes
  - `scene-generator.ts` - Scene prompt generation and validation
  - `image-generator.ts` - Replicate image generation with proper response handling
- **`auth/`**: Authentication configuration and utilities (Clerk integration)
- **`db/`**: Database layer
  - **`queries/`**: Database query functions (read operations)
  - **`schemas/`**: Drizzle ORM schema definitions
  - **`utils/`**: Database utility functions
- **`game/`**: Game logic and mechanics
- **`storage/`**: Storage integration (R2) for file uploads
- **`utils.ts`**: General utility functions (e.g., `cn()` for className merging)

**Guidelines**:

- Keep business logic separate from UI components
- Database queries go in `queries/`, mutations go in `app/actions/`
- Schema definitions should be in `schemas/` and imported in `schema.ts`

### `/src/agents`

**Purpose**: AI agent implementations for game master and other agents.

**Guidelines**:

- Place agent implementations here
- Each agent should be in its own file or directory
- **Game Master Agent** (`game-master.ts`): Uses AI SDK v6 `ToolLoopAgent` (models from `src/lib/ai/provider.ts`) with HITL-only skill checks; handles interactive narration only (NO state mutations - read-only access to campaign state and quests)
- **Campaign Manager Agent** (`campaign-manager.ts`): Background agent for state reconciliation without user-facing narration; sole writer to campaign state (quests, fronts, narrative vectors, relationships)
- **Visual Engine Agent** (`visual-engine.ts`): Background agent for automatic scene image generation; monitors narrative changes and triggers scene generation when needed

**Agent Design Principles**:
- Background agents (CMA/VEA) are side-effecting and must be bounded/idempotent
- Use `stopWhen: stepCountIs(N)` to prevent infinite loops
- Background agents run fire-and-forget (non-blocking) to avoid affecting chat latency
- See [docs/AGENTIC-ARCHITECTURE.md](docs/AGENTIC-ARCHITECTURE.md) for detailed agent patterns and best practices

### `/src/hooks`

**Purpose**: Custom React hooks for shared logic.

**Guidelines**:

- Create reusable hooks here
- Follow React hooks naming convention (`use*`)

**Game Chat Hook** (`use-game-chat.ts`):

- Wraps `useChat` from `@ai-sdk/react` for game-specific chat functionality
- Accepts `initialMessages` as `UIMessage[]` (not `CoreMessage[]`)
- Handles skill check tool calls and HITL (Human-In-The-Loop) interactions
- Manages game state updates through the game store

### `/src/types`

**Purpose**: TypeScript type definitions shared across the application.

**Guidelines**:

- Place shared types here
- Use `type` over `interface` unless declaration merging is needed
- Never use `any` - use proper types or `unknown`

### `/src/utils`

**Purpose**: Additional utility functions beyond `lib/utils.ts`.

**Guidelines**:

- Place domain-specific utilities here
- General utilities should go in `lib/utils.ts`

### `/drizzle`

**Purpose**: Database migration files and metadata.

**Guidelines**:

- Migration files are auto-generated by Drizzle
- Do not manually edit migration files
- Migration metadata is stored in `meta/`

### `/public`

**Purpose**: Static assets served by Next.js.

**Guidelines**:

- Place static assets here (images, icons, manifests)
- Files are served from the root URL path

### `/docs`

**Purpose**: Project documentation.

**Guidelines**:

- Feature documentation goes in `features/`
- Completed features documented in `features/implemented/`
- Architecture decisions in `ARCHITECTURE.md`

## File Naming Conventions

- **Components**: `kebab-case.tsx` (e.g., `user-profile.tsx`)
- **Pages**: `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`
- **Server Actions**: `kebab-case.ts` (e.g., `campaign-queries.ts`)
- **Utilities**: `kebab-case.ts` (e.g., `user-profile.ts`)
- **Types**: `kebab-case.ts` (e.g., `user-profile.ts`)

## Import Paths

- Use `@/` alias for all internal imports (configured in `tsconfig.json`)
- Example: `import { Button } from "@/components/ui/button"`
- Example: `import { getUser } from "@/lib/db/queries/user-profile"`

## Excluded from Structure

The following are excluded as they are build artifacts, dependencies, or cache:

- `node_modules/` - Dependencies
- `.next/` - Next.js build output
- `.git/` - Git repository
- `.pnpm-store/` - pnpm cache
- Build artifacts (`dist/`, `build/`, `coverage/`)
- Lock files and build info

---

_Last updated: Generated via `tree` command_
