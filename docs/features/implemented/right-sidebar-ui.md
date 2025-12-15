# Feature Requirement Document - Right Sidebar UI Refresh

- **Feature Name**: Right Sidebar UI Refresh (Scene Full-Bleed, Compact Tiles)

- **Goal**: Improve the runs play sidebar so the scene image occupies the full top segment without card chrome, and the remaining info tiles are condensed into single-row, non-scrolling summaries.

- **User Story**: As a player viewing a run, I want the scene artwork to dominate the sidebar and the key run details to fit in one view without scrolling, so I can stay immersed while keeping campaign context at a glance.

- **Functional Requirements**:

  1. Scene visualizer renders full-bleed (no card border) in the sidebar, scaling to available height without introducing its own scroll area.
  2. Scene loading/error/pending states remain visible and legible without card borders.
  3. Sidebar info sections (character, campaign stats, quests, relationships) appear as compact single-row tiles with reduced padding.
  4. Sidebar column avoids vertical scrolling in typical desktop viewport (chat can scroll independently).
  5. Existing dialogs (character, campaign, quests, relationships) remain accessible via tile click targets.

- **User Flow**:

  1. Player opens a run play page.
  2. Sidebar shows the current scene image full-bleed in the top segment.
  3. Below, compact tiles display character identity, campaign stats, quests count, and relationships count in one row each.
  4. Player clicks any tile to open its detail dialog without layout shift.

- **Acceptance Criteria**:

  - Scene image spans the sidebar width with no visible card border and scales to the allocated height.
  - Loading, pending, and error states display without card chrome but remain readable.
  - All four info tiles render on screen without sidebar scroll at standard desktop height (≥900px).
  - Each tile presents its data in a single line with minimal padding.
  - Tile clicks still open their respective dialogs.

- **Edge Cases**:

  - No scene or missing image URL: show unobtrusive placeholder without card border.
  - Long character names or titles: truncate gracefully while keeping tile height constant.
  - Extreme hope/chaos values: percentages stay within one line.
  - Large quest/relationship counts: numbers stay readable without wrapping.

- **Non-Functional Requirements**:

  - Preserve accessibility: maintain alt text and focusable dialog triggers.
  - Follow project styling conventions (Tailwind order, double quotes, semicolons in TS/JS).
  - Avoid performance regressions (no extra network calls for the sidebar).

