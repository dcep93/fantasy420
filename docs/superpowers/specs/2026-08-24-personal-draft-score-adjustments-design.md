# Personal Draft Score Adjustments

## Goal

Add a persistent personal-score column to the draft rankings table. A score is a signed integer offset applied only to the composite ranking: positive scores promote a player and negative scores demote one.

## Ranking Behavior

For every player in the composite, calculate an adjusted ranking key as:

`base composite rank - personal score`

An unscored player has an implicit score of zero. Sort players by the adjusted key in ascending order, using their base composite rank as the stable tie-breaker. The final composite values are contiguous one-based ranks derived from that order. Individual ranking sources remain unchanged.

This rank-key approach makes overlapping adjustments deterministic. It avoids sequential remove-and-reinsert behavior, where the same inputs could produce different results depending on processing order.

## Personal-Score Column

The rankings table gains a final column titled `My score`. Each row contains a signed integer input for that player. Clearing an input removes the score. Input interactions must not trigger the row's existing draft/undraft click action.

Double-clicking the column header activates a personal-score inspection order. Scored players appear first by descending absolute score, so `-10` appears before `5`. Equal magnitudes follow adjusted-composite order. Unscored players follow all scored players in adjusted-composite order.

Selecting any normal ranking source exits the inspection order and displays that source. Selecting `composite` displays the score-adjusted composite order.

## Persistence

Valid scores save immediately to browser `localStorage`. Storage is scoped by season and keyed by stable ESPN player ID so scores do not leak between years or depend on player-name spelling.

Blank values are omitted from storage. Loading treats a missing entry, malformed JSON, non-object payload, non-finite value, or non-integer value as absent instead of breaking the draft page. A storage read or write failure leaves the page usable.

## Components

- `personalScores.ts` owns score validation, season-scoped local-storage reads and writes, composite adjustment, and magnitude ordering.
- `Draft/index.tsx` owns the score state, renders the header and inputs, saves edits, selects the inspection order on header double-click, and feeds the adjusted composite to the existing source and mock-draft flows.
- `MockDraftView.css` provides compact column-header and input styling consistent with the night theme.

## Testing

Focused utility tests will cover positive and negative offsets, deterministic ties, contiguous output ranks, absolute-magnitude order, year scoping, clearing, and malformed stored data. Draft UI tests will cover rendering, editing and persistence, row-click isolation, double-click ordering, and leaving inspection order when a normal source is selected.

The focused Vitest tests, full test suite, and production build will run before completion.
