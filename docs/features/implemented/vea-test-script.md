# Feature Requirement Document - VEA Test Script

## 1. Context & Goal

**Current Situation**:

The Visual Engine Agent (VEA) is responsible for generating scene images based on narrative context. It uses AI to:
- Determine when scenes should be generated
- Select appropriate scene types (portrait, wide-shot, detail-shot)
- Generate detailed image prompts with Moebius-inspired style
- Create and store scene images

**Problem**:

There is currently no way to manually test the VEA logic with different narrative scenarios to validate:
- Scene type detection accuracy
- Prompt generation quality
- Style consistency
- Tool execution flow

**Goal**:

Create a manual test script that allows developers to test the VEA with pseudo-random scenes covering all scene types and various narrative contexts. This enables:
- Validation of scene type detection logic
- Review of generated prompts for style and quality
- Testing of edge cases and different narrative scenarios
- Performance benchmarking
- Regression testing when VEA logic changes

**User Stories**:

- As a developer, I want to run a test script that generates multiple scene scenarios to validate VEA behavior, so I can ensure scene type detection and prompt generation work correctly.
- As a developer, I want to see detailed output of tool calls and decisions, so I can debug issues with scene generation.
- As a developer, I want to test different narrative scenarios without needing a full game session, so I can quickly validate changes to VEA logic.

## 2. Current Implementation

### 2.1 Visual Engine Agent (`src/agents/visual-engine.ts`)

- Background agent using AI SDK v6 `ToolLoopAgent`
- Uses OpenRouter `base` model for decision-making
- Limited to 4 tool cycles (`stopWhen: stepCountIs(4)`)
- Workflow: `shouldGenerateScene` → `determineSceneType` → `generateImagePrompt` → `generateSceneImage`
- System prompt includes scene composition guidelines and Moebius-inspired style requirements

### 2.2 Tools (`src/lib/ai/tools.ts`)

- `shouldGenerateSceneTool`: Analyzes narrative to determine if generation is warranted
- `determineSceneTypeTool`: Determines scene type (portrait, wide-shot, detail-shot)
- `generateImagePromptTool`: Creates detailed prompts with scene-type-specific composition
- `generateSceneImageTool`: Generates and stores images via Replicate API

### 2.3 Execution Pattern (`src/app/api/chat/route.ts`)

- VEA is triggered after assistant messages from GMA
- Executed using `agent.generate()` (non-streaming, background processing)
- Results include `steps` array with tool calls and results

## 3. Requirements

### 3.1 Functional Requirements

#### 3.1.1 Test Script Location

- **File**: `scripts/test-vea.ts`
- **Execution**: `pnpm test:vea`
- **Pattern**: Follows same structure as `scripts/test-r2-upload.ts`

#### 3.1.2 Environment Setup

- Load `.env.local` using dotenv
- Validate required environment variables:
  - `OPENROUTER_API_KEY` (required for AI model access)
  - `REPLICATE_API_TOKEN` (optional, only needed if actually generating images)
- Initialize AI providers using existing `getOpenRouterClient()` and `getTextModel()`

#### 3.1.3 Mock Data Generation

- Create mock data structures matching VEA requirements:
  - **Campaign**: Name, genres, description
  - **Character**: Name, appearance, profession, stats
  - **Universe**: Name, description, ontology
  - **CampaignState**: Active fronts, narrative vectors, knowledge graph, current context
  - **RunId**: Generate unique ID for each test run
- Use realistic but varied test data to cover different scenarios

#### 3.1.4 Pseudo-Random Scene Generation

- Define arrays of scene templates for each scene type:
  - **Portrait Scenarios** (5-7 examples):
    - Dialogue scenes with emotional reactions
    - Character moments and expressions
    - Emotional beats and character development
  - **Wide Shot Scenarios** (5-7 examples):
    - Exploration and travel scenes
    - Location changes and environmental storytelling
    - Establishing shots with vast landscapes
  - **Detail Shot Scenarios** (5-7 examples):
    - Object interactions and examinations
    - Item-focused close-up moments
    - Action-focused detail shots
- Use seeded random number generation for reproducibility
- Generate 8-12 unique test scenarios covering all scene types
- Ensure variety in narrative contexts (combat, exploration, dialogue, discovery, etc.)

#### 3.1.5 VEA Execution

- For each test scenario:
  - Create mock `UIMessage[]` with narrative text matching the scenario
  - Initialize VEA using `createVisualEngineAgent()` with mock data
  - Execute agent using `agent.generate()` with test messages
  - Capture and log:
    - Tool execution sequence
    - Tool call parameters
    - Tool results (scene type decisions, prompts, reasoning)
    - Execution time
    - Any errors or warnings

#### 3.1.6 Output & Validation

- Display structured test results:
  - Test scenario number and description
  - Expected scene type (based on scenario template)
  - Actual scene type detected by VEA
  - Generated prompt preview (first 200 characters)
  - Tool execution flow with timestamps
  - Reasoning provided by tools
  - Execution time per test
- Summary statistics:
  - Total tests executed
  - Scene type distribution (portrait/wide-shot/detail-shot counts)
  - Average execution time
  - Success/failure counts
  - Style keyword presence in prompts (Moebius-inspired, etc.)

#### 3.1.7 Dry Run Mode

- Optional flag to skip actual image generation
- Test prompt generation without calling Replicate API
- Useful for faster iteration and cost savings during development

### 3.2 Technical Implementation

#### 3.2.1 Files to Create

- `scripts/test-vea.ts`: Main test script
- `docs/features/implemented/vea-test-script.md`: This feature document

#### 3.2.2 Files to Modify

- `package.json`: Add `"test:vea": "tsx scripts/test-vea.ts"` to scripts section

#### 3.2.3 Dependencies

- Uses existing VEA from `src/agents/visual-engine.ts`
- Uses existing tools from `src/lib/ai/tools.ts`
- Uses existing AI provider setup from `src/lib/ai/provider.ts`
- Uses existing types from `src/types/ui-message.ts`
- Uses existing schema types from `src/lib/db/schema.ts` and `src/lib/db/schemas/campaign.ts`

#### 3.2.4 Test Scenarios Examples

**Portrait Scenarios**:
- "The character's face contorts with rage as they confront the betrayer, eyes burning with fury."
- "A moment of quiet reflection, the character's eyes showing deep sorrow as they remember lost companions."
- "Dialogue exchange with an NPC, emotions clearly visible on the character's expressive face."

**Wide Shot Scenarios**:
- "The character approaches the ancient citadel, its towers piercing the clouds, a small figure against the massive structure."
- "A vast desert landscape stretches before the character, who appears as a tiny figure in the distance, the environment dominating the scene."
- "The character travels through a dense forest, towering trees and undergrowth surrounding them, the environment filling the frame."

**Detail Shot Scenarios**:
- "The character's hands carefully examine an ancient artifact, turning it over to reveal intricate runes carved into its surface."
- "Close-up of a glowing rune being activated, the character's hands visible as they trace the magical symbols."
- "The character picks up a mysterious key, studying its intricate design and unusual shape."

## 4. Implementation Details

### 4.1 Script Structure

```typescript
// 1. Environment setup (load .env.local, validate vars)
// 2. Mock data generation (Campaign, Character, Universe, CampaignState)
// 3. Scene scenario definitions (arrays of narrative templates)
// 4. Test execution loop:
//    - For each scenario:
//      - Create mock UIMessage[] with narrative
//      - Initialize VEA
//      - Execute agent.generate()
//      - Capture and log results
// 5. Output results and summary statistics
```

### 4.2 Key Functions

- `generateMockData()`: Creates mock Campaign, Character, Universe, CampaignState
- `generateTestScenarios()`: Returns array of test scenarios with expected scene types
- `createMockMessages(narrative: string)`: Creates UIMessage[] with narrative text
- `executeVEA(scenario)`: Executes VEA for a scenario and returns results
- `formatResults(results)`: Formats and displays test results
- `generateSummary(stats)`: Displays summary statistics

### 4.3 Error Handling

- Gracefully handle API errors (OpenRouter, Replicate)
- Continue testing remaining scenarios if one fails
- Log errors with context (scenario number, error message)
- Provide troubleshooting tips for common issues

## 5. Testing Strategy

1. **Manual Execution**: Run `pnpm test:vea` to execute all test scenarios
2. **Visual Review**: Review generated prompts for:
   - Style consistency (Moebius-inspired keywords)
   - Scene type appropriateness
   - Composition guidance accuracy
3. **Iterative Testing**: Run multiple times to validate consistency
4. **Regression Testing**: Run after VEA logic changes to ensure no regressions

## 6. Success Criteria

- Script executes without errors
- All three scene types are tested (portrait, wide-shot, detail-shot)
- Generated prompts include appropriate style keywords
- Scene type detection matches narrative context
- Tool execution flow follows expected sequence
- Output is clear and reviewable
- Summary statistics provide useful insights

## 7. Future Enhancements

- Add option to actually generate images (not just prompts)
- Add comparison mode to test before/after prompt changes
- Add performance benchmarking with timing metrics
- Export results to JSON for automated analysis
- Add visual diff mode to compare prompt variations
- Add interactive mode to test custom scenarios
- Add CI/CD integration for automated regression testing

## 8. Dependencies

- No database dependencies (uses mock data)
- Requires OpenRouter API key for AI model access
- Optional Replicate API token if generating actual images
- Uses existing project dependencies (ai SDK, TypeScript, dotenv, tsx)

## 9. Notes

- This is a development/testing tool, not part of the production application
- Designed for manual execution by developers
- Can be extended for automated testing in CI/CD pipelines
- Follows existing project patterns and conventions
