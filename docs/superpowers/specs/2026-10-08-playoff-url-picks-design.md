# Playoff matchup URL synchronization

Approved with `yesi`; each saved value must be the winner's team ID.

Use the Wrapped tab's existing hash-query convention:
`#PlayoffMachine?picks={"2":{"0":"7"}}` (URL encoded). `picks` maps
week numbers to original schedule matchup indices to winner team IDs. The
original indices remain stable when matchup display order changes.

Save every remaining matchup that differs from its current chalk winner,
across all weeks. Chalk uses the existing weekly-strength selection and its
tie/missing-value fallback. Returning a matchup to chalk removes its entry;
returning all matchups to chalk removes the parameter. Preserve other URL
parameters, including the season in the page query.

Derive selections from chalk plus validated URL overrides so initial loading,
reloads, shared links, and back/forward navigation restore the scenario.
Ignore malformed JSON, invalid structure, completed or unknown games, and
winners outside their matchup. Keep points adjustments local. Preserve the
existing scroll anchor when changing winners; URL writes must not scroll.

Alternatives considered: serializing every pick creates unnecessarily long
links; a separate parameter per matchup is readable but fragments the saved
scenario. One sparse JSON parameter follows the approved design and makes
winner team IDs explicit.

Verify multiple weeks and matchups, return-to-chalk removal, reload and
navigation restoration, invalid links, stable schedule identity, URL
preservation, and existing scroll behavior. Run focused tests and TypeScript.

Self-review: scope and URL representation are explicit; no open decisions.
