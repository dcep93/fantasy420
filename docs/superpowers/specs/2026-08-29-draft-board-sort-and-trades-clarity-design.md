# Draft Board Sort and Trades Clarity Design

## Goal

Make the historical DraftBoard useful as both a chronological draft recap and a manager-by-manager roster view, while making the Trades tab read as a set of exchanges instead of a disconnected list of player movements.

## Draft Board Interaction

The board starts in round order. Clicking anywhere inside the board switches every manager column to position order; clicking again switches back to round order. The board will also toggle with Enter or Space when focused so the full-area interaction remains keyboard accessible. A compact status cue above the columns names the active order and explains that clicking the board switches it.

Each column always belongs to exactly one manager. Columns remain ordered by the manager's first draft pick, which represents draft-slot order, and toggling never redistributes picks between columns or reorders the managers. Round order sorts each manager's picks by overall pick index. Position order uses the explicit sequence QB, RB, WR, TE, K, DST, with unknown positions after the known sequence; players at the same position retain their original overall-pick order.

The manager name moves from every pick card to a sticky column header so column ownership stays explicit while scrolling and after the cards are reordered. Individual cards retain the player name, pick/composite/positional-rank summary, and position color.

Sorting will be implemented as exported pure helpers so it can be tested independently from interaction state. The existing season-specific composite lookup and empty state remain unchanged.

## Trades Organization

Build an ownership timeline from weekly team rosters, then derive each direct player move from the previous week's owner to the current week's owner. Ignore weeks zero and one, missing players, and entries without a known prior owner, matching the current tab's scope.

Group moves first by week and then by an unordered manager pair. One grouped deal therefore collects every player moving in either direction between the same two managers during that week, including uneven exchanges such as two-for-one trades. Within a deal, render two parallel manager panels. Each panel is labeled with the manager who received the players and lists the players received by that manager. This makes exchange direction explicit without repeated from/to labels on every row.

Each week section shows the week number plus compact deal and moved-player counts. Each deal shows its total player count. Player cards display name and position, with position color where available. Existing score history remains available through the player's title tooltip, including a clear marker at the transaction week. Weeks and deals are deterministically sorted, and player order follows stable player-name ordering for predictable output.

If no ownership moves exist, render a concise season-level empty state. A one-way manager-pair group is rendered as a compact `From → To` direct ownership move instead of showing an empty receiving panel or inventing a reciprocal player. Week summaries distinguish reciprocal exchanges from direct moves.

## Components and Data Flow

- `DraftBoardForSeason` owns only the active sort mode and delegates column ordering to pure helpers.
- Draft-board column construction continues to resolve team, player, performance, and composite data once per render.
- Trades exports pure move derivation and grouping helpers that accept a `WrappedType`; the React component only renders their result.
- Small local components render week sections, deal panels, and player rows, keeping transformation logic separate from presentation.

No data-fetching, Wrapped navigation, selected-year behavior, or league data format changes are included.

## Verification

- Extend DraftBoard tests for the initial round order, full-board click and keyboard toggles, manager-column stability, known/unknown position ordering, and same-position pick order.
- Add Trades tests for week derivation, two-way and uneven manager-pair grouping, deterministic order, missing-data handling, empty state, and clear rendered exchange direction.
- Run the affected Vitest suites, the complete Vitest suite, and the TypeScript/Vite production build.
- Review the final diff to ensure the unrelated extension work and other existing files remain untouched.
