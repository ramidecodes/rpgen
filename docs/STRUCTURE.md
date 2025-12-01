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

- **`actions/`**: Server actions for data mutations. Each domain (campaign, character, run, universe, user-profile) has its own action file.
- **Route directories**: Each route directory (`campaigns/`, `characters/`, `runs/`, `universes/`, `profile/`, `sign-in/`, `sign-up/`, `about/`) contains:
  - `page.tsx` - The route page component
  - `[id]/` - Dynamic route segments
  - `create/` - Creation pages
- **Root files**: `layout.tsx` (root layout), `page.tsx` (home page), `globals.css` (global styles)

**Guidelines**:

- Use Server Components by default (no `"use client"` directive)
- Only add `"use client"` when using hooks, browser APIs, or event handlers
- Place server actions in `actions/` directory, organized by domain

### `/src/components`

**Purpose**: React components organized by feature domain.

- **`campaign/`**: Campaign-related form and display components
- **`character/`**: Character creation and management components
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

- **`ai/`**: AI generation utilities for campaigns, characters, images, and universes
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

### `/src/hooks`

**Purpose**: Custom React hooks for shared logic.

**Guidelines**:

- Create reusable hooks here
- Follow React hooks naming convention (`use*`)

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
