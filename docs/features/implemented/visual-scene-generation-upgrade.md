# Feature Requirement Document - Visual Scene Generation Enhancement

## 1. Context & Goal

**Current Problems**:

1. The Visual Engine Agent (VEA) currently generates mostly character portraits with minimal environment, objects, or other characters. Scenes lack visual variety and don't accurately reflect the narrative action taking place.
2. VEA generates images too frequently, including during intermediate narrative states (e.g., when a skill check is requested but before the outcome is explained). This leads to redundant scene generation and unnecessary costs.

**Goals**:

1. Enhance the VEA to intelligently generate varied scene compositions based on narrative context:

- **Portrait shots**: Character-focused when appropriate (character moments, emotional beats, dialogue)
- **Wide shots**: Environment-focused when location/setting is important (exploration, travel, establishing scenes)
- **Detail shots**: Object/action-focused when specific elements are key (interactions, items, close-up moments)

**User Stories**:

- As a player, I want to see visually appropriate scene compositions that match the narrative action - sometimes a character portrait, sometimes a sweeping landscape, sometimes a focused detail - so that the visual storytelling enhances immersion.
- As a player, I want scene images to be generated only after complete narrative moments (e.g., after skill check outcomes are explained), not during intermediate states (e.g., when a skill check is first requested), so that images accurately represent the final narrative state and reduce unnecessary generation costs.

## 2. Current Implementation

### 2.1 Visual Engine Agent (`src/agents/visual-engine.ts`)

- Background agent using AI SDK v6 `ToolLoopAgent`
- Uses OpenRouter `base` model for decision-making
- Limited to 3 tool cycles (`stopWhen: stepCountIs(3)`)
- System prompt focuses on location/environment changes only
- No scene type selection logic

### 2.2 Image Prompt Generation (`src/lib/ai/tools.ts`)

- `generateImagePromptTool` creates prompts but always defaults to character-focused composition
- Prompt structure: Character appearance → Location → Narrative → Style
- No explicit shot type or composition instructions
- Always uses 16:9 aspect ratio for all scenes

### 2.3 Image Generation (`src/lib/ai/image-generator.ts`)

- `generateImageUrl()` uses fixed 16:9 aspect ratio
- No scene type-specific prompt enhancements
- Generic quality instructions applied to all prompts

### 2.4 Scene Generator (`src/lib/ai/scene-generator.ts`)

- `createScenePrompt()` adds generic quality keywords
- No composition or shot type guidance
- Character appearance always prioritized

### 2.5 Image Generation Frequency (`src/app/api/chat/route.ts`)

- VEA is triggered after every assistant message from GMA
- Only checks for narrative text presence (`hasNarrativeText()`)
- No detection of intermediate narrative states (e.g., skill check requests)
- Generates images even when narrative is incomplete (e.g., skill check requested but outcome pending)

## 3. Requirements

### 3.1 Functional Requirements

#### 3.1.1 Scene Type Detection

- VEA must analyze narrative context and character action to determine appropriate scene type:
  - **Portrait**: Character-focused moments (dialogue, emotional reactions, character development)
  - **Wide Shot**: Location/setting-focused (exploration, travel, environmental storytelling)
  - **Detail Shot**: Object/action-focused (interactions, items, specific elements)

#### 3.1.2 Enhanced System Prompt

- Update VEA system prompt in `buildSystemPrompt()` to include:
  - Scene composition guidelines
  - Shot type selection criteria
  - Visual storytelling principles
  - When to use each scene type

#### 3.1.3 Enhanced Image Prompt Tool

- Extend `generateImagePromptTool` to accept:
  - `sceneType`: Enum of "portrait" | "wide-shot" | "detail-shot"
  - `compositionGuidance`: Specific composition instructions based on scene type
  - `focusElement`: Primary visual focus (character, environment, object)
- Generate prompts with scene-type-specific instructions:
  - Portrait: Character-centered, expressive, close-up framing
  - Wide Shot: Environmental context, establishing view, landscape composition
  - Detail Shot: Focused framing, specific element prominence, tight composition

#### 3.1.4 Aspect Ratio Selection

- Keep current 16:9 ratio
- All images should be generated in this ratio

#### 3.1.5 Scene Type Tool

- Add new tool `determineSceneType` to VEA:
  - Analyzes narrative context and character action
  - Returns recommended scene type with reasoning
  - Considers: action type, location importance, character focus, object prominence

#### 3.1.6 Conservative Image Generation

- VEA must detect intermediate narrative states and defer generation:
  - **Skill Check Scenarios**: When a `requestSkillCheck` tool call is present in recent messages but the outcome/explanation is not yet provided, skip generation
  - **Incomplete Actions**: When narrative indicates an action is in progress but consequences are pending, defer generation
  - **Generation Timing**: Only generate after complete narrative moments (e.g., after skill check outcomes are fully explained with consequences)
- Update `shouldGenerateScene` tool to:
  - Analyze recent messages for pending skill checks or incomplete actions
  - Return `shouldGenerate: false` when narrative is in an intermediate state
  - Include reasoning about why generation is deferred (e.g., "Skill check outcome pending")
- Update VEA system prompt to emphasize:
  - Wait for complete narrative moments before generating
  - Avoid generating during intermediate states
  - Prioritize narrative completeness over frequency

### 3.2 Technical Implementation

#### 3.2.1 Files to Modify

- `src/agents/visual-engine.ts`:
  - Update `buildSystemPrompt()` with scene composition guidelines
  - Add scene type selection instructions to VEA system prompt
  - Add conservative generation guidelines emphasizing complete narrative moments
- `src/lib/ai/tools.ts`:
  - Add `determineSceneTypeTool` for scene type analysis
  - Enhance `generateImagePromptTool` with scene type parameter and composition guidance
  - Update `shouldGenerateSceneTool` to detect intermediate narrative states:
    - Check for pending skill checks (tool call present but outcome not yet explained)
    - Detect incomplete actions or pending consequences
    - Return conservative decisions when narrative is in transition
  - Update prompt generation logic to include scene-type-specific instructions
- `src/lib/ai/image-generator.ts`:
  - Update `generateImageUrl()` to accept aspect ratio based on scene type
  - Add scene-type-specific prompt enhancements
- `src/lib/ai/scene-generator.ts`:
  - Enhance `createScenePrompt()` to handle scene type-specific prompt formatting
  - Add composition keywords based on scene type
- `src/app/api/chat/route.ts`:
  - Consider adding additional checks in `triggerVisualEngineAgent()` to detect skill check scenarios
  - May need to analyze message history for pending tool calls vs. completed outcomes

#### 3.2.2 Tool Workflow Update

Current VEA workflow:

1. `shouldGenerateScene` → Decision
2. `generateImagePrompt` → Prompt creation
3. `generateSceneImage` → Image generation

Enhanced VEA workflow:

1. `shouldGenerateScene` → Decision (with conservative checks for intermediate states)
2. `determineSceneType` → Scene type selection (NEW)
3. `generateImagePrompt` → Prompt creation (with scene type)
4. `generateSceneImage` → Image generation (with aspect ratio)

**Conservative Generation Logic**:

- `shouldGenerateScene` must first check if narrative is in an intermediate state
- If skill check is pending (requested but outcome not explained), return `shouldGenerate: false`
- If action consequences are pending, defer generation
- Only proceed to scene type determination when narrative moment is complete

### 3.3 Non-Functional Requirements

- **Performance**: Scene type detection adds minimal overhead (< 50ms)
- **Backward Compatibility**: Existing scenes remain valid; new scenes use enhanced logic
- **Cost**:
  - Scene type tool adds one additional tool call per generation (acceptable for quality improvement)
  - Conservative generation reduces overall generation frequency by ~30-40% (estimated based on skill check scenarios)
- **User Experience**:
  - More visually appropriate scenes enhance immersion without user intervention
  - Fewer intermediate scene generations reduce visual noise and improve narrative coherence
- **Generation Frequency**: Target reduction of 30-40% in unnecessary generations (e.g., skill check request → outcome scenarios)

## 4. Edge Cases

- **Ambiguous Actions**: Default to wide shot when action type is unclear
- **Multiple Focus Elements**: Prioritize based on narrative importance (character > environment > object)
- **Rapid Scene Changes**: Scene type tool may recommend different types; use latest narrative context
- **Missing Character Action**: Fall back to narrative text analysis when character action is unavailable
- **Portrait in Wide Context**: Allow portrait even in location-heavy scenes if character moment is primary
- **Skill Check Detection**:
  - Detect `requestSkillCheck` tool calls in recent messages
  - Check if corresponding outcome/explanation exists in subsequent messages
  - If skill check is requested but outcome not yet explained, skip generation
  - If skill check outcome is explained with consequences, proceed with generation
- **Multiple Pending Actions**: When multiple intermediate states exist, defer until all are resolved
- **False Positives**: Avoid skipping generation when narrative is actually complete (e.g., skill check mentioned in past tense as completed)
- **Tool Call State Detection**: Distinguish between tool calls with `state: "input-available"` (pending) vs. `state: "output-available"` (complete)

## 5. Out of Scope

- Dynamic aspect ratio changes for existing scenes
- User-controlled scene type selection
- Multiple scene generation per narrative update
- Scene transition animations
- Custom composition templates
- User-configurable generation frequency settings
- Manual override for scene generation timing

## 6. Success Metrics

- **Visual Variety**: >60% of generated scenes are non-portrait (wide/detail shots)
- **Narrative Alignment**: Scene type matches narrative action in >80% of cases
- **User Feedback**: Positive feedback on scene variety and appropriateness
- **Generation Quality**: Maintained or improved image quality across all scene types
- **Generation Frequency Reduction**: 30-40% reduction in scene generations (especially in skill check scenarios)
- **Narrative Completeness**: >90% of generated scenes occur after complete narrative moments (not during intermediate states)

## 7. Implementation Details

### 7.1 Scene Type Detection Logic

```typescript
// Pseudo-logic for determineSceneType tool
- Analyze character action keywords:
  - Portrait triggers: "says", "thinks", "feels", "reacts", "expresses"
  - Wide shot triggers: "travels", "explores", "enters", "arrives", "views"
  - Detail shot triggers: "examines", "touches", "picks up", "reads", "uses"

- Analyze narrative context:
  - Location changes → Wide shot
  - Character moments → Portrait
  - Object interactions → Detail shot

- Default: Wide shot (safest for establishing context)
```

### 7.2 Conservative Generation Detection Logic

```typescript
// Pseudo-logic for shouldGenerateScene tool - conservative checks
function detectIntermediateState(messages: UIMessage[]): boolean {
  // Check for pending skill checks
  const recentToolCalls = extractToolCalls(messages, lastN: 10);

  // Find requestSkillCheck tool calls
  const skillCheckRequests = recentToolCalls.filter(
    tc => tc.toolName === "requestSkillCheck" &&
          tc.state === "input-available"
  );

  // Check if corresponding outcomes exist
  for (const request of skillCheckRequests) {
    const outcomeExists = messages.some(msg =>
      msg.parts.some(part =>
        isToolUIPart(part) &&
        part.toolCallId === request.toolCallId &&
        part.state === "output-available"
      )
    );

    // If skill check requested but outcome not found, narrative is incomplete
    if (!outcomeExists) {
      return true; // Intermediate state detected
    }
  }

  // Check for incomplete action patterns
  const narrativeText = extractNarrativeText(messages);
  const incompletePatterns = [
    /is about to/i,
    /begins to/i,
    /starts to/i,
    /attempts to/i,
    /tries to/i
  ];

  // If narrative suggests action in progress without resolution
  if (incompletePatterns.some(pattern => pattern.test(narrativeText))) {
    // Check if resolution exists in subsequent messages
    const hasResolution = checkForResolution(messages, narrativeText);
    if (!hasResolution) {
      return true; // Intermediate state detected
    }
  }

  return false; // Narrative appears complete
}

// In shouldGenerateScene tool:
if (detectIntermediateState(recentMessages)) {
  return {
    shouldGenerate: false,
    reasoning: "Narrative is in an intermediate state (e.g., skill check pending or action incomplete). Deferring generation until narrative moment is complete.",
    reasons: ["Intermediate narrative state detected"]
  };
}
```

### 7.3 Prompt Enhancement Examples

**Portrait Prompt Structure**:

```
[Character appearance], [emotion/expression], [pose], centered composition,
close-up framing, expressive lighting, character-focused,
[environment as background context only], [style keywords]
```

**Wide Shot Prompt Structure**:

```
[Location/environment description], [atmospheric details],
[character as part of scene, not focus], establishing shot,
wide-angle view, environmental storytelling, [style keywords]
```

**Detail Shot Prompt Structure**:

```
[Specific object/element], [interaction details], [close-up framing],
focused composition, [character hands/partial view if relevant],
detail-oriented, [style keywords]
```

## 8. Risks & Mitigations

- **Over-Engineering**: Risk of too many scene types. Mitigation: Start with 3 core types, expand if needed.
- **Incorrect Type Selection**: Risk of mismatched scene types. Mitigation: Clear guidelines in system prompt, fallback to wide shot.
- **Prompt Quality Degradation**: Risk of worse prompts with new structure. Mitigation: Preserve existing quality keywords, enhance rather than replace.
- **Tool Call Overhead**: Risk of slower generation. Mitigation: Scene type tool is lightweight, acceptable trade-off for quality.
- **Over-Conservative Generation**: Risk of missing valid generation opportunities. Mitigation:
  - Use clear heuristics for intermediate state detection
  - Log deferred generations for analysis
  - Allow generation when narrative is clearly complete even if patterns match
- **False Positive Detection**: Risk of incorrectly detecting intermediate states. Mitigation:
  - Check for tool call state (`input-available` vs `output-available`)
  - Verify outcome existence in message history
  - Use narrative context, not just tool call presence
- **Skill Check Edge Cases**: Risk of missing skill check scenarios. Mitigation:
  - Analyze tool call states explicitly
  - Check message sequence for request → outcome pattern
  - Consider time-based heuristics if needed (e.g., skill check requested in last 2 messages)

## 9. Dependencies

- No new external dependencies
- Uses existing AI SDK v6 tool system
- Uses existing Replicate API (supports all aspect ratios)
- No database schema changes required

## 10. Testing Strategy

- **Unit Tests**:
  - Scene type detection logic with various narrative inputs
  - Intermediate state detection with skill check scenarios
  - Conservative generation logic with pending vs. completed actions
- **Integration Tests**:
  - End-to-end scene generation with different scene types
  - Skill check flow: request → outcome → generation timing
  - Multiple intermediate states handling
- **Visual Review**: Manual review of generated scenes for composition appropriateness
- **A/B Testing**:
  - Compare old vs. new scene generation for quality metrics
  - Measure generation frequency reduction
  - Validate narrative completeness of generated scenes
- **Scenario Testing**:
  - Test skill check request → outcome → generation sequence
  - Test rapid consecutive actions to ensure appropriate deferral
  - Test edge cases where narrative appears incomplete but is actually complete
