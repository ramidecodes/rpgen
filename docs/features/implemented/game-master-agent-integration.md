# Feature Requirement Document - Game Master Agent Integration

- **Feature Name**: Game Master Agent (GMA) Integration & Living World Logic

- **Goal**: Integrate the AI SDK to power a GMA that acts not just as a narrator, but as a **World Simulator**. The GMA must read the `Narrative Graph`, interpret player intent, and use **Tools** to update the campaign state (moving clocks, changing relationships) dynamically.

- **User Story**: As a player, I want the world to react to me intelligently—if I insult the King, the "Relationship Edge" should change to "Hostile," and the "Royal Guard Hunt" Front should advance—so that my choices feel impactful.

- **Functional Requirements**:

  - **AI Configuration**:
    - Use `streamText` from Vercel AI SDK.
    - **Provider**: OpenRouter.
    - **Model**: `qwen/qwen3-vl-8b-instruct` (for initial implementation, replacing specific models like Claude 3.5 Sonnet for now).
  - **Context Management**:
    - **Input**:
      - Player Action.
      - `Universe Ontology` (The Rules).
      - `Campaign Genres` (The Tone).
      - `Campaign State` (The Graph, Fronts, Vectors).
  - **Tool Calling (The "Hands" of the GMA)**:
    - The GMA **MUST** have tools to manipulate the state. It cannot just "speak".
    - **Tool Specifications (Zod Schemas)**:
      - **`updateNarrativeVector`**:
        - _Description_: Shift the abstract mood of the campaign.
        - _Schema_: `{ hopeDelta: number, chaosDelta: number }`
      - **`manageRelationship`**:
        - _Description_: Update or create an edge in the Knowledge Graph.
        - _Schema_: `{ sourceId: string, targetId: string, relationType: string, value: number }`
      - **`advanceFront`**:
        - _Description_: Move a plot threat forward (e.g., "The bomb timer ticks down").
        - _Schema_: `{ frontId: string, steps: number }`
      - **`createQuest`**:
        - _Description_: Open a new narrative thread or objective.
        - _Schema_: `{ title: string, description: string, type: string }`
      - **`logEvent`**:
        - _Description_: Record a significant event in history.
        - _Schema_: `{ description: string, type: string, importance: string }`
  - **Logic Flow (AI SDK `maxSteps` Loop)**:
    1. **Perceive & Reason (Step 1)**:
       - Model receives Player Input + Current Graph.
       - Model analyzes implications (e.g., "Does this trigger a Front?", "Does it change a Relationship?").
       - Model calls necessary Tools.
    2. **Act (Step 2 - Server Side)**:
       - Tools execute against the `campaignState` (modifying JSONB).
       - Tool results are returned to the Model.
    3. **Narrate (Step 3)**:
       - Model receives tool results (confirmation of state changes).
       - Model streams the descriptive text response to the player, incorporating the consequences of the state changes.

- **Data Requirements**:

  - **Tool Schemas (Zod)**:
    - Defined in `src/lib/ai/tools.ts`.
    - Must match the `campaignState` structure defined in Campaign Generation.
  - **Prompt Engineering**:
    - System Prompt must explicitly instruct the AI to **check Active Fronts** every turn.
    - "If the player ignores the [Zombie Horde] Front, advance it by 1 step."

- **User Flow**:

  - (Invisible to User):
    1. User types: "I punch the goblin."
    2. Server retrieves Campaign State.
    3. AI decides: "Roll Strength." -> Success.
    4. AI calls `manage_relationship("Goblin Tribe", "Player", "HOSTILE")`.
    5. AI calls `update_narrative_vector({ chaos: +0.1 })`.
    6. AI narrates: "You connect a solid blow..."

- **Acceptance Criteria**:

  - GMA uses Tools to modify the `campaignState` in the database.
  - Streaming responses work with Tool calls (Server-side execution).
  - The "Narrative Graph" updates persist between turns.

- **Edge Cases**:

  - **Hallucination**: GMA adds a node that doesn't make sense. (Mitigation: Strict Zod validation on tool inputs).
  - **Tool Loop**: GMA tries to call too many tools. (Limit: Max 5 tool calls per turn).

- **Dependencies**:
  - Campaign Generation (State Structure).
  - Vercel AI SDK.
