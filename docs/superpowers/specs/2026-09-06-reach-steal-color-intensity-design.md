# Reach and Steal Color Intensity Design

## Goal

Make the ReachesAndSteals board communicate the size of each ADP difference through color intensity while keeping every card readable and ensuring that color is not the only way to understand the result.

## Color Scale

Use a season-independent continuous scale based on the absolute difference between overall pick number and composite ADP. Exact-ADP picks and picks without ADP retain the neutral gray `#aab4c0`. Nonzero reaches interpolate from that gray toward orange `#ff7b45`; nonzero steals interpolate toward green `#38c976`.

The interpolation starts at 25% of the verdict color so a one-pick difference is visibly a reach or steal, then increases linearly until a 30-pick difference reaches the full endpoint color. Larger gaps remain clamped at that endpoint. This makes equal gaps comparable between seasons and prevents one extreme outlier from flattening the rest of a board.

All generated backgrounds keep the existing dark card text `#111827`. The neutral and endpoint colors exceed the WCAG AA 4.5:1 contrast requirement against that text, and linear intermediate colors will be covered by automated contrast tests.

## Usability and Presentation

Add a short third line to each card that explicitly names its result and magnitude: `Reach 10`, `Steal 14`, `At ADP`, or `No ADP`. Decimal ADP differences use one decimal place only when needed. The accessible card label includes the same result, so the classification and magnitude never depend on color perception.

Add a compact legend above the board with low-to-high orange and green gradients, the neutral swatch, and a note that stronger color means a larger ADP gap. The legend does not change the permanent draft-round order or the shared fixed-row grid.

## Components and Data Flow

- A pure helper derives verdict, signed gap, magnitude label, interpolation amount, and background color from pick index and optional composite ADP.
- ReachesAndSteals supplies the derived background and custom card content to the shared DraftBoardGrid.
- DraftBoardGrid gains an optional card-render callback; DraftBoard continues using its current default content and behavior.
- The legend consumes the same color helper for its gradient endpoints so documentation and rendered colors cannot drift.

No draft data, ADP data, navigation, DraftBoard sorting, or row-alignment behavior changes.

## Verification and Delivery

- Unit-test reach, steal, exact-ADP, missing-ADP, decimal-gap, minimum-intensity, and 30-pick clamping behavior.
- Test that color strength increases monotonically and every generated representative color exceeds a 4.5:1 contrast ratio against card text.
- Test visible card labels and legend text while preserving existing board-order and position-inclusion coverage.
- Run the full Vitest suite and production build.
- Visually inspect the live board for legibility, aligned rows, distinct gradient strengths, and runtime errors.
- Commit the implementation and push `main` to its configured remote.
