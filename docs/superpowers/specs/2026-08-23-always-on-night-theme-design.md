# Always-On Night Theme

## Goal

Convert the main Wrapped page and the complete draft page to one always-on night theme while preserving the meaning and visibility of position colors, graph series, state colors, tooltips, and controls.

## Theme System

The application will define shared semantic night-theme tokens for the page background, raised surfaces, alternate surfaces, primary and muted text, borders, links, focus states, inputs, chart grids, and tooltips. The browser color scheme will be declared dark so native inputs and selects render consistently.

The base palette will use a near-black page, dark blue-gray surfaces, high-contrast off-white text, visible muted text, bright blue links, and pink focus accents. Shared bubble styles on the Wrapped and draft routes will reference these tokens rather than white backgrounds and black borders.

## Draft Page

The existing warm night treatment for the mock-draft setup and board will remain. The surrounding regular draft table, filters, source controls, inputs, and blank cells will adopt the shared night palette.

Position-colored table cells and cards will retain their current recognizable light fills. They will receive an explicit dark foreground so the new global light text cannot reduce readability. Drafted-row fading and the highlighted first cell will remain visibly distinct.

## Main Page

The tab strip, year control, headings, shared bubbles, tables, inputs, and ordinary text will use the shared dark surfaces and foregrounds. Inline dark-gray text and white-only panels will be replaced where they would become unreadable.

Meaningful data colors will be preserved or converted to night-safe equivalents in these contrast-sensitive tabs:

- Manager Plot;
- Manager Trend;
- Player Stats;
- Player Plot;
- Position Trends;
- Punts;
- Spiciest Matchups;
- Points Against;
- Strength of Season; and
- Draft Board.

Spiciest Matchups will receive dark cards, chart canvas, annotations, grids, and labels while retaining its red/pink probability identity. Win/loss and position colors will keep their semantic meaning.

## Chart Visibility

The ten-manager series palette will replace black, brown, and other low-contrast strokes with distinct bright colors. Recharts axes, grid lines, legends, cursors, default tooltips, and custom tooltips will use theme-aware colors. Line and marker colors will have at least 3:1 contrast against the graph background; normal text will target at least 4.5:1 contrast against its surface.

No chart dimensions, data, interactions, tab ordering, or page structure will change.

## Verification

Automated tests will check the theme tokens, position foreground pairing, and chart-series contrast. Existing test suites and the production build must pass. Visual verification will cover representative main tabs, chart-heavy tabs, the regular draft table, and mock draft at desktop and mobile widths.

