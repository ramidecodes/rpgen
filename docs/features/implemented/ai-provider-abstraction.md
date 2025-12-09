# Feature Requirement Document - AI Provider Abstraction Module

- **Feature Name**: AI Provider Abstraction Module

- **Goal**: Create a centralized AI provider module in `src/lib/ai` that abstracts away model name declarations, providing a clean, type-safe interface for accessing AI models. Models are organized by output capabilities (text, image) with sub-categorization for text models (free, base, reasoning). This improves developer experience by making it easier to change models for different tasks and centralizes model configuration.

- **User Story**: As a developer, I want to access AI models through a centralized, categorized provider module, so that I can easily switch between models for different tasks without hardcoding model names throughout the codebase, and so that model changes are managed in one place.

- **Functional Requirements**:

  - Create AI provider module structure in `src/lib/ai/provider/`:
    - `index.ts` - Main export file providing public API
    - `types.ts` - TypeScript type definitions for model categories and capabilities
    - `text-models.ts` - Text model definitions organized by category (free, base, reasoning)
    - `image-models.ts` - Image model definitions
    - `providers.ts` - Provider client initialization (OpenRouter, Replicate, etc.)
    - `model-registry.ts` - Central registry mapping categories to model identifiers
  - Model categorization system:
    - **Text Models** - Grouped by capability tier:
      - `free` - Cost-effective models for simple tasks (e.g., `qwen/qwen3-vl-8b-instruct`)
      - `base` - Standard models for general-purpose tasks
      - `reasoning` - Advanced models for complex reasoning tasks
    - **Image Models** - Grouped by output capability:
      - Standard image generation models (e.g., `black-forest-labs/flux-schnell`)
  - Provider abstraction:
    - Abstract OpenRouter client creation into `providers.ts`
    - Abstract Replicate client creation into `providers.ts`
    - Provide typed accessors for each provider type
    - Support environment variable configuration for API keys
  - Model registry implementation:
    - Define model identifiers as constants with descriptive names
    - Map categories to specific model identifiers
    - Provide type-safe getter functions for accessing models by category
    - Support fallback models when a category model is unavailable
  - Public API design:
    - Export `getTextModel(category: 'free' | 'base' | 'reasoning')` function
    - Export `getImageModel()` function
    - Export `getOpenRouterClient()` function
    - Export `getReplicateClient()` function
    - Export type definitions for model categories
    - All exports should be type-safe and provide IntelliSense support
  - Refactor existing code to use new provider module:
    - Update `src/lib/ai/campaign-generator.ts` to use provider module
    - Update `src/lib/ai/character-generator.ts` to use provider module
    - Update `src/lib/ai/universe-generator.ts` to use provider module
    - Update `src/lib/ai/image-generator.ts` to use provider module
    - Update `src/app/api/chat/route.ts` to use provider module
    - Update `src/app/actions/game.ts` to use provider module
    - Remove hardcoded `MODEL_NAME` constants from all files
    - Remove duplicate OpenRouter client initialization code
  - Type safety:
    - Use TypeScript enums or union types for model categories
    - Provide autocomplete support for model categories
    - Ensure compile-time type checking for model access
    - Export types for use in other modules

- **Data Requirements**:

  - No database schema changes required
  - No new environment variables required (uses existing `OPENROUTER_API_KEY` and `REPLICATE_API_TOKEN`)

- **User Flow** (Developer Perspective):

  1. Developer needs to use a text model for a simple task
  2. Developer imports `getTextModel` from `@/lib/ai/provider`
  3. Developer calls `getTextModel('free')` to get a cost-effective model
  4. Developer uses the returned model with AI SDK functions
  5. Developer needs to switch to a reasoning model for complex task
  6. Developer changes category parameter to `'reasoning'` in the same function call
  7. System returns appropriate reasoning model
  8. Developer needs to generate an image
  9. Developer imports `getImageModel` from `@/lib/ai/provider`
  10. Developer calls `getImageModel()` to get the configured image model
  11. Developer uses the model with Replicate API
  12. Developer needs to change model for a specific category
  13. Developer updates model identifier in `model-registry.ts`
  14. All code using that category automatically uses the new model

- **Acceptance Criteria**:

  - Provider module is created in `src/lib/ai/provider/` with all required files
  - Model registry correctly maps categories to model identifiers
  - `getTextModel()` function accepts category parameter and returns correct model identifier
  - `getImageModel()` function returns configured image model identifier
  - Provider clients (OpenRouter, Replicate) are initialized once and exported
  - All existing AI generator files use the new provider module
  - All hardcoded `MODEL_NAME` constants are removed from codebase
  - All duplicate provider client initialization code is removed
  - TypeScript types provide full IntelliSense support for model categories
  - Code compiles without TypeScript errors
  - All existing functionality continues to work after refactoring
  - Model changes can be made in a single location (`model-registry.ts`)
  - Provider module exports are properly typed and documented
  - No runtime errors when accessing models through provider module

- **Edge Cases**:

  - Invalid model category provided - should throw TypeScript compile error (type safety)
  - Model identifier is undefined or null - should throw runtime error with clear message
  - API key environment variable is missing - should throw error at provider initialization
  - Provider client fails to initialize - should throw descriptive error
  - Model registry has duplicate entries - should be caught by TypeScript or linting
  - Category exists but no model is configured - should throw runtime error or use fallback
  - Developer tries to use deprecated model - should provide migration path or warning
  - Multiple files import provider module - should use singleton pattern for clients

- **Non-Functional Requirements**:

  - **Type Safety**: All model access should be type-checked at compile time
  - **Developer Experience**: IntelliSense should provide autocomplete for all categories
  - **Maintainability**: Model changes should require updates in only one file
  - **Performance**: Provider clients should be initialized once and reused (singleton pattern)
  - **Documentation**: All exported functions should have JSDoc comments
  - **Code Quality**: Follow project coding standards (semicolons, double quotes, etc.)
  - **Backward Compatibility**: Refactoring should not break existing functionality
  - **Extensibility**: System should be easy to extend with new categories or models

- **Implementation Notes**:

  - Use the Repository/Factory pattern for model abstraction
  - Consider using a const assertion for model registry to ensure type safety
  - Provider clients should be lazily initialized or use module-level singletons
  - Model identifiers should be string literals for type inference
  - Consider creating a `ModelCategory` type union for better type safety
  - Export both the model identifier strings and the provider client instances
  - Consider adding JSDoc examples for common usage patterns

- **Dependencies**:

  - Existing AI SDK integration (`ai` package)
  - Existing OpenRouter provider (`@openrouter/ai-sdk-provider`)
  - Existing Replicate client (`replicate` package)
  - TypeScript for type safety
