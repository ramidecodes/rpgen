# RPGen

A web-app game that allows the player to start a new text-based RPG campaign. Inspired by old-school text adventures, TTRPGs (D&D), and point-and-click classics.

The core differentiator is the **Living World Engine**. A Game Master Agent (GMA) manages a sophisticated **Narrative Graph**—tracking relationships, plot fronts, and world states—to create a universe that reacts dynamically to every player decision. No two campaigns are alike, and the story never hits a generic "Game Over."

## Setup

### Prerequisites

- Node.js 18+
- pnpm 8+

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd generative-deep-neural-dungeon
   ```
2. Install dependencies:
   ```bash
   pnpm install
   ```
3. Set up environment:
   ```bash
   cp .env.local.example .env.local
   # Add DATABASE_URL and AI Provider Keys (OpenRouter/OpenAI)
   ```
4. Database:
   ```bash
   pnpm db:generate
   pnpm db:migrate
   ```
5. Run:
   ```bash
   pnpm dev
   ```

## Project Structure

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for detailed architecture.

## Features

Feature requirements are located in `docs/features/` (new FRED: `docs/features/chat-agent-v6-refactor.md` for the AI SDK v6 chat refactor).

### 1. Universe Generation (Ontology)

Instead of simple genres, players define the **Ontology** of their world:

- **Timeframe**: Ancient, Medieval, Cyberpunk, Far Future.
- **Magic & Physics**: Hard Science vs. Dream Logic.
- **Metaphysics**: Do gods exist? Is the universe indifferent?
  The system generates a deep history, factions, and locations based on these axioms.

### 2. Character Creation

Characters are created **within** a specific Universe.

- Professions and Origins are context-aware (e.g., "Starship Pilot" only appears in Sci-Fi worlds).
- Classic D&D stats (Strength, Int, etc.) are rolled 1-20.
- Backstories are AI-assisted to weave the character into the world's history.

### 3. Campaign & Living World State

Campaigns are the "Play Session" of a Character in a Universe.

- **Multi-Genre**: Combine "Sci-Fi" + "Horror" for an "Alien" style game.
- **Narrative Graph State**:
  - **Knowledge Graph**: Tracks NPCs, Relationships (`HATES`, `LOVES`), and secrets.
  - **Active Fronts**: Plot threats that advance if ignored (e.g., "The Void expands").
  - **Narrative Vectors**: Tracks abstract values like Hope vs. Despair, Order vs. Chaos.

### 4. Game Loop

- **Narrative**: AI streams descriptive text.
- **Action**: Player types flexible actions.
- **Visuals**: (Planned) Generative images for scenes.
- **Agentic Chat (AI SDK v6)**: The Game Master uses AI SDK v6 `ToolLoopAgent` (models from `src/lib/ai/provider.ts`) with HITL-only skill checks and world-state tools; an optional background state agent can reconcile campaign data without user-facing text.

## License

MIT
