# NFL Teams and Live Draft Board Design

## Goals

Add an `NFLTeams` module to the main Fantasy420 page and render extension-synchronized picks on `/draft` with the existing mock-draft board presentation.

## NFLTeams

- Register `NFLTeams` immediately after `SpiciestMatchups`.
- Render every non-FA NFL team as a responsive bubble headed by a slash-prefixed team name such as `/Bills`, making browser text search unambiguous.
- Derive each team's fantasy depth chart from the selected year's existing players and composite ranking. Group players by position, order them by composite ADP, and label each as `Name — N ADP · POSN`.
- Read schedules only from `selectedWrapped().nflTeams[*].nflGamesByScoringPeriod`. The component makes no network request.
- Display each regular-season week as `W1 Opponent`, with the existing `byeWeek` value inserted as `Wn BYE`. Home/away is intentionally omitted because the existing wrapped schema stores opponent IDs but not venue direction.
- Populate the checked-in 2026 JSON schedule and preserve scheduled opponents in the existing wrapped-data refresh. Do not add or change fields in `WrappedType`.
- Schedule-only future entries use the current game object shape. Existing statistics modules will ignore weeks after `latestScoringPeriod`, preventing future placeholders from being analyzed as completed games.

## Live Draft Board

- The FantasyPros extension continues storing the chronological `draft` player-name array and additionally stores `draftTeamCount`, derived from the largest `round.slot` label on the rendered board.
- `/draft` polls both values while mock-draft mode is inactive, normalizes names to player IDs, and renders a live variant of the existing `MockDraftPanel` when at least one matched pick and a valid team count are present.
- Reuse `getPickOwner` and the existing team-column layout so odd rounds run left-to-right and even rounds run right-to-left.
- The live variant uses the same player bubbles, ADP, images, position colors, and round/position display toggle as a mock draft. It is read-only, has no user-team highlight, and shows all completed rounds without applying mock-roster length limits.
- Starting a mock draft hides and disables the live board; ending or reloading returns to extension-backed live state.
- Unmatched external player names remain excluded and logged rather than creating invalid board cards.

## Verification

- Test 2026 schedule completeness and opponent symmetry using the checked-in JSON.
- Test depth-chart ADP and position ranks, slash-prefixed team headings, bye insertion, and module order.
- Test FantasyPros team-count extraction and synchronized storage payloads.
- Test live board appearance, read-only behavior, and second-round snake ownership with a non-10-team fixture.
- Run the full app and extension suites plus the production build before committing and pushing.
