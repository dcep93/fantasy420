# Scoreboard player context

Add opponent and status/kickoff columns to expanded optimized lineups. Show NFL team and injury status with the player, distinguish home (`vs`) and away (`@`), and format kickoff in explicitly labeled Eastern time. Use the already-fetched ESPN NFL schedule: future kickoff is Scheduled, past kickoff is Started, and statsOfficial is Final. Do not imply a live game clock that this feed does not supply. Explicit byeWeek is Bye; unavailable schedule data remains Unknown, not an inferred bye.

Carry proTeamId and injuryStatus through lineup optimization, then enrich selected players from the schedule. Tag absent forecasts defaulted to zero separately from explicit ESPN zero projections. Preserve optimization and probability arithmetic. Use a horizontally scrollable table and numeric alignment to keep the added columns readable on narrow screens.

Verify home/away, bye, unknown, kickoff TBD, started/final, injury metadata, and missing-versus-explicit forecasts. Run the Scoreboard suite and production build, inspect live Week 6 rows in Chrome, capture a screenshot, commit and push.
