# FantasyPros Live Draft Sync Design

## Goal

Keep the Fantasy420 `/draft` board synchronized with completed picks from every team in the FantasyPros Draft Wizard live mock-draft simulator. Updates should appear within roughly one second and should remain correct after picks are edited, undone, or restarted.

## Architecture

The existing extension storage contract remains unchanged: draft-source adapters publish an ordered array of player names to `chrome.storage.local` under the `draft` key, and Fantasy420 reads that key. A new FantasyPros adapter will join the existing ESPN and Sleeper adapters.

The extension content-script router will recognize the FantasyPros live simulator URL and inject the shared extension bridge followed by the new adapter. The manifest will allow the FantasyPros origin to send messages to the extension because injected page-context scripts use external messaging.

## FantasyPros Adapter

Once per second, the adapter will read completed cells from the rendered FantasyPros draft board. Each pick supplies:

- the full player name from the player-name button's `title` attribute;
- the displayed round-and-slot pick number;
- the league size from the number of draft-board team headings.

FantasyPros displays each pick as `round.pickWithinRound`. The pick-within-round value is already chronological even though the board reverses the visual cell order in even-numbered rounds. The adapter will convert each value to an overall pick index with `(round - 1) * teamCount + pickWithinRound`, sort the completed picks by that index, and publish every team's ordered player names. It will write only when the serialized draft differs from the previously published value. Empty drafts are valid after a restart, but the adapter will not clear storage merely because it initialized before the FantasyPros board rendered.

## Fantasy420 Consumer Resilience

The polling loop will schedule its next read regardless of whether the current extension request succeeds. It will compare the serialized draft contents instead of only the array length so same-length edits are reflected.

Player-name normalization will continue to map source names onto the 2026 wrapped player pool. Picks that cannot be matched will be omitted from the rendered drafted-player map and logged as warnings. This prevents a defense or source-specific spelling from crashing the entire draft page while preserving all recognized picks.

## Error Handling

- A temporarily unavailable extension will not terminate polling.
- A board that has not rendered yet will not overwrite an existing draft with an accidental empty value.
- An intentional restart that renders an empty board after at least one observed board state will publish an empty draft.
- Malformed or incomplete cells will be ignored.
- Unmatched player names will be reported without breaking rendering.

## Verification

Automated checks will cover chronological ordering across the first-to-second-round boundary, including `1.10`, `2.01`, and `2.02` in a 10-team league, plus consumer handling where practical within the current test setup. The existing frontend test suite and production build must pass. Live browser verification will confirm that the adapter can extract every team's current FantasyPros picks and that Fantasy420 reflects them after the updated unpacked extension is active.
