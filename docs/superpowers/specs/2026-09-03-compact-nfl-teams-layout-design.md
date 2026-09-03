# Compact NFLTeams Layout Design

## Goal

Make the `NFLTeams` module denser and easier to scan. Preserve its static data,
slash-prefixed team headings, composite ADP, and position ranks while replacing
the tall one-player-per-row presentation and loose schedule flow.

## Layout

- Keep the responsive outer team-card grid, but cap each card's useful width so
  cards do not stretch merely to consume the viewport.
- Render each position group as a compact section with a small position label and
  a responsive grid of player tiles. Multiple players can share a row.
- Each player tile shows the same single-line content: name, composite ADP, and
  position rank. Long names may wrap inside their own tile without widening the
  card.
- Render the schedule as a fixed six-column grid with three rows for weeks 1–18.
  Every cell shows a week label above its opponent.
- Give the bye-week cell a distinct visual treatment so it can be found quickly.

## Data and Behavior

This is presentation-only. Continue deriving team cards from the selected
season's checked-in Wrapped JSON and composite rankings. Add no fetching,
storage, schema, ordering, or navigation behavior.

## Responsive Behavior

On narrow screens, reduce the schedule to three columns and allow the player
tile grid to collapse to fewer columns. The individual team card remains fully
contained without horizontal scrolling.

## Verification

- Extend the NFLTeams component test to verify player-grid items, all requested
  schedule cells, and the bye-cell marker.
- Run the NFLTeams test, the complete app test suite, and the production build.
