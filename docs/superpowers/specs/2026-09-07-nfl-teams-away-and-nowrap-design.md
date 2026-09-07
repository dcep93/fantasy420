# NFL Teams Away Labels and Non-Wrapping Names Design

## Goal

Make the `NFLTeams` schedule distinguish away games with an `@` prefix and keep every player or NFL team name on one line.

## Data and Rendering

- Extend each normalized NFL game with an optional `isAway` boolean derived from ESPN's `awayProTeamId` while wrapped data is built.
- Populate the checked-in season snapshots with the same flag so every selectable year works without a network request.
- Carry `isAway` into each schedule entry and render away opponents as `@ Team`; home opponents remain `Team`, bye weeks remain `BYE`, and unavailable games remain `—`.
- Wrap only semantic names in dedicated spans and apply `white-space: nowrap` to those spans. Player ADP and position metadata may still wrap independently, avoiding unnecessary card overflow.
- Apply the non-wrapping rule to the slash-prefixed team card heading, player names, and schedule opponent labels.

## Compatibility

`isAway` remains optional on the shared game type so older or partial fixtures continue to compile. Missing venue data is treated as a home/unmarked game rather than guessed from the symmetric opponent map.

## Verification

- Extend the focused `NFLTeams` fixture with one away team and one home team.
- Assert that only the away schedule entry receives the `@` prefix and that bye behavior remains unchanged.
- Assert that the rendered team, player, and opponent name elements use their non-wrapping classes.
- Run the focused test, full Vitest suite, and production build before committing and pushing `main`.
