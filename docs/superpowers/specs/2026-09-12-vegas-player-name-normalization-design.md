# Vegas player name matching

ESPN and DraftKings can label the same player with different suffixes. The
extension currently drops valid odds when DraftKings omits ESPN's suffix.

Add `normalizePlayerName` to the extension's already-loaded `shared.js` and use
it on both sides of the Vegas lookup. Normalize case, accents, punctuation,
whitespace, trailing parenthetical qualifiers, and standalone trailing Jr.,
Sr., II, III, IV, and V suffixes. Retain the Gabe/Gabriel Davis alias.
Compare nonempty normalized names with exact equality so partial names do not
match unrelated players. Keep displayed ESPN names, scoring, Under exclusion,
and defense exclusion unchanged.

A player-specific alias would only repair one case; fuzzy matching could select
the wrong player. Shared deterministic normalization is the chosen approach.
The web app and Reddit text scraper remain separate consumers with different
loading and text-search requirements; migrating them is outside this repair.

Verify normalization pairs, nonmatches, missing names, and the actual Vegas
injection path using a mocked browser and odds feed. Reload the installed
extension and ESPN tab, then confirm Cook's green projection appears.
