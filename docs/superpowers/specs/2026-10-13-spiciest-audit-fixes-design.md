# Spiciest Matchups audit fixes

User request: fix the three confirmed audit findings.

Resolve historical player games from that week's box-score full identities before considering the saved NFL team. Normalize punctuation, accents and suffixes. Use full names for game assignment; initials alone must not choose a game. Ambiguous full identities must not choose a game. Preserve saved-team fallback when participation evidence is unavailable, including inactive players and D/ST.

Match plays with a full identity or an unambiguous first-initial-plus-surname within the resolved game. Never use a surname alone. When individual player plays cannot be identified, interpolate the recorded total through the game instead of attributing unrelated plays. Keep D/ST's documented game-wide approximation. Recorded final totals and weekly projections remain unchanged.

Use two endpoint timestamps in zoomed charts below 500px container width; retain three on wider charts. Keep vertical fitting, reset and full-week labels.

Validation: targeted identity and reconstruction regressions, existing chart/ranking suites, TypeScript/build, real historical data comparisons and 320px browser verification. No scoring formula changes or data refresh. Commit and push task-owned files.

Self-review: scope, fallback behavior, ambiguity policy and success criteria are explicit; no unresolved design choices.
