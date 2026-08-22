# Mock Draft Simulator Design

## Goal

Add a persistent, interactive snake-draft simulator to the top of the existing 2026 draft page. The simulator should use the page's currently selected ranking source, let the user make their own picks through the existing player table, simulate every opponent, support deterministic historical edits, and render a compact draft board using the brown, pink, Comic Sans visual language established by `multisport420`.

The work also completes the prerequisite player-image change: wrapped player records may optionally contain an ESPN headshot URL, and the refreshed 2026 snapshot will contain those URLs for individual players. Older season snapshots remain valid without the field.

## Existing behavior to preserve

- The existing draft page, source selector, filters, values, and intentionally rough styling stay unchanged outside the new setup controls and mock-draft panel.
- Normal mode continues polling the Chrome extension for live drafted-player state.
- Existing local row toggling continues in normal mode.
- Ranking source selection remains the authority for the displayed list and mock-draft decisions.
- Existing rookie detection remains the single source of truth for asterisks.

## Setup and activation

Place a compact mock-draft setup area at the top of the draft page. It contains:

- draft position, default `8`;
- number of teams, default `10`;
- position riskiness, default `1`;
- bye riskiness, default `1`;
- craziness, default `1`;
- optional seed, blank by default;
- editable roster counts for QB, RB, WR, TE, FLEX, SUPERFLEX, DST, K, and BENCH;
- a `mock draft` button.

The default roster counts are `1, 2, 2, 1, 2, 1, 1, 1, 5`. Their sum determines the number of draft rounds. Inputs are validated before activation: team and slot counts must be nonnegative integers where applicable, team count must be at least two, draft position must be within the team count, and risk factors must be finite positive numbers.

If the seed input is blank, activation creates a readable random seed and records it in state. Once activated, the page exposes no stop, close, or reset control. Reloading or navigating to a URL without draft state is outside the in-panel interaction contract.

## State model and URL hash

The canonical state is a versioned object containing:

- all setup settings, including the resolved seed and roster counts;
- the ordered list of drafted ESPN player IDs.

Encode that object as base64url JSON in `#draft=<payload>`. Update the hash with `history.replaceState` after activation and after every pick or historical edit. On initial page load and hash navigation, decode and validate the payload. A valid payload activates the simulator and reconstructs the board; an invalid payload leaves normal mode active and presents a compact validation error rather than partially loading corrupt state.

The selected ranking source is deliberately not stored in draft state. This preserves the requested behavior in which history can be replayed against whichever source is currently active. User-owned picks are derived from snake position rather than stored as separate metadata.

## Draft engine

Implement the simulator as pure TypeScript functions independent of React. Inputs are settings, the active ordered ranking, player metadata, and the ordered pick history. Outputs include the normalized pick records, current turn, available players, replay status, and the pick-time rank of each selection.

### Snake order

For an `N`-team league, odd rounds run positions `1..N` and even rounds run `N..1`. A pick record stores the overall index, round, draft position, ESPN ID, active-list rank at that historical moment, and whether it belongs to the user.

The displayed pick label is `round.round_index`, with the second component zero-padded. `round_index` is the player's ordinal selection within that round, so a ten-team first round displays `1.01` through `1.10`; the second row remains spatially aligned to team columns and therefore displays `2.10` through `2.01` from left to right.

### Opponent selection

Begin with the active ranking of all available players. Each candidate receives:

1. its current ordinal rank among available players;
2. a position-saturation penalty;
3. a same-position, same-bye penalty;
4. seeded random deviation controlled by craziness.

Position capacity is based on configured eligible starting slots. QB can use QB or SUPERFLEX; RB, WR, and TE can use their dedicated slots, FLEX, or SUPERFLEX; DST and K use only their dedicated slots. BENCH determines draft length but does not add position-specific capacity. Saturation grows as a team's drafted count at a position consumes that position's eligible capacity. The position-risk factor scales this penalty: values near zero make it negligible, `1` applies the normal penalty, and very large values dominate rank.

Bye risk compares a candidate with already drafted teammates at the same position. Each matching bye adds a penalty scaled by the bye-risk factor, with the same near-zero, normal-at-one, and dominant-at-large behavior.

Craziness controls seeded rank deviation. Values near zero are nearly deterministic to the adjusted ranking, `1` allows modest reaches, and large values permit increasingly remote choices. Random values are derived from the seed plus the complete preceding pick sequence so the same seed and state replay identically, while changing an earlier pick changes later random choices.

When a ranking omits a known player, that player sorts after ranked players. Opponents select only players present in the active table's ranked candidate pool so every simulated pick can be represented consistently.

### User turns

Opponent turns simulate immediately until the next user turn. At a user turn the engine pauses. Clicking an available `<tr>` in the existing table drafts that player, updates the hash, simulates opponents, and pauses again at the user's next turn.

Clicks during opponent processing are ignored. Drafted rows remain visibly unavailable. The mock history, rather than extension storage or local toggles, becomes the source of drafted-player state while active.

## Historical editing and replay

Every filled board bubble shows the selection's pick-time rank and adjacent `better` and `worse` controls. These controls replace the historical selection with the next better- or worse-ranked player that was available immediately before that pick, ignoring roster and bye preferences.

After replacement, rebuild the draft from that point through the prior end of history:

- re-simulate opponent picks using the current ranking source, settings, seed, and revised preceding state;
- preserve later user picks when their saved ESPN IDs remain available;
- if a preserved user player was taken earlier, stop at that user turn and wait for a new table-row selection;
- truncate any picks that can no longer be replayed;
- update pick-time ranks and URL state.

This makes an early edit capable of changing any subsequent opponent pick while retaining valid deliberate user choices.

## Panel behavior and presentation

The active panel appears above all existing draft-page content. Use the approved compact direction:

- dark brown background and panels;
- thin warm-brown borders;
- pink Comic Sans title and accents;
- amber rank pills;
- dense player bubbles with minimal surrounding copy;
- no ornamental dashboard metrics, oversized hero text, explanatory legend, or unrelated restyling.

Each bubble shows headshot or fallback, player name, rookie asterisk, position, pick label, bye week, pick-time rank, and better/worse controls. The user's picks receive a restrained pink border.

Clicking a non-interactive part of the panel toggles between:

- snake-board order; and
- position order: QB, RB, WR, TE, DST, K, with picks inside each position ordered by overall pick.

Buttons stop click propagation so historical edits do not also toggle the layout.

## Extension isolation

Change live-draft polling to accept an enabled flag. Normal mode keeps existing polling behavior. Mock mode does not call extension discovery, extension storage, or extension messaging at all. Entering mock mode cancels any pending polling timer. This prevents mock and live state from racing or contaminating each other.

## Headshot schema and 2026 refresh

Add `headshot?: string` to `NFLPlayerType` and the corresponding wrapped-snapshot helper type. During the existing `FetchWrapped` player transformation, attach

`https://a.espncdn.com/i/headshots/nfl/players/full/{id}.png`

for positive ESPN player IDs. Do not attach a headshot to negative defense IDs. The UI supplies a styled fallback when the field is absent or the image fails to load.

Run the existing fresh-data operation for 2026 after the schema change, using the Chrome extension/browser route only if the direct request path cannot obtain the league data. Commit the resulting 2026 wrapped snapshot with headshots. Do not rewrite older snapshots.

## Component boundaries

- `mockDraft.ts`: settings, seed generation, snake math, scoring, opponent selection, replay, and historical nudging.
- `mockDraftHash.ts`: versioned serialization, validation, parsing, and hash synchronization.
- `MockDraftSetup.tsx`: compact controlled setup form and activation.
- `MockDraftPanel.tsx` plus a focused stylesheet: board rendering, display-order toggle, image fallback, and history controls.
- `Draft/index.tsx`: orchestration with the existing source, table, rookie set, and normal/live draft modes.
- `FetchWrapped/helper.ts` and shared player types: optional headshot generation.

The exact filenames may be combined where doing so improves local cohesion, but the pure engine, URL codec, and React presentation must remain independently testable.

## Error handling

- Reject invalid setup and hash values without activating partial state.
- Ignore history IDs absent from the 2026 player map and report a concise load error.
- Prevent duplicate player IDs in history.
- Stop replay cleanly at an unavailable preserved user pick.
- Render a fallback tile for absent or failed headshots.
- If opponent selection has no candidates, stop rather than inventing an ID.

## Testing and verification

Add focused tests for:

- snake order and displayed pick labels across even and odd rounds;
- default and customized roster-derived draft lengths;
- deterministic seed behavior and state-dependent replay;
- monotonic position-risk, bye-risk, and craziness behavior;
- opponent auto-picks and user-turn pauses;
- better/worse replacement using pick-time availability;
- preservation and invalidation of later user picks;
- hash round-trip, malformed payload rejection, and restoration;
- extension polling disabled throughout mock mode;
- rookie asterisks, headshot/fallback rendering, sort toggling, and row-click drafting;
- optional headshot schema compatibility and populated positive-ID headshots in 2026.

Run the focused Vitest files, the existing draft/extension tests, and a production build. Finally, inspect the rendered panel in the local app at desktop and narrow widths without changing the styling of the existing page beneath it.
