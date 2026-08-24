# My Score First Draft Column

## Goal

Make `My score` the leftmost column in the Fantasy420 draft rankings table, before the slash-number metadata column.

## Design

Reorder the existing table markup without changing score behavior or styling. The `My score` header will become the first header cell. In every body row, the matching personal-score input cell will become the first cell, followed by slash-number metadata, player details, and source rankings.

The header and row cells will move together so the table remains semantically aligned for keyboard users, screen readers, and horizontal scrolling. CSS-only visual reordering will not be used because it could make the visual order disagree with DOM and accessibility order.

## Scope

This change affects only column placement. Score persistence, score-based sorting, row draft toggling, source rankings, and the contents of the slash-number cell remain unchanged.

## Testing

Add a focused UI assertion that `My score` is the first column header and that its input cell is the first cell in a draft row. Run the Draft integration test file and the production build.
