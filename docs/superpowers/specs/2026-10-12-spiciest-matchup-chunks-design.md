# Spiciest matchup timeline chunks

Approved with `yesi` on 2026-10-12.

Replace the continuous calendar-time axis with one graph containing four equal
width, labeled sections: Pre Sunday, Sunday pre final slot, Sunday final slot,
and Post Sunday. This supersedes the linear calendar-time axis in the earlier
Wrapped chart clarity design. Separate charts would repeat axes and make the
running lead harder to follow; simple shading would leave long idle gaps.

Use the complete week's NFL schedule, with kickoff weekdays in America/New_York,
to find Sunday's final scheduled kickoff. Games starting at that kickoff belong
to the final slot, even if their estimated ending is after midnight. Earlier
Sunday games belong to the preceding section. Thursday through Saturday games
are pre Sunday; Monday through Wednesday games are post Sunday. A week without
Sunday games has two empty Sunday sections.

Merge overlapping estimated game windows within each section and compress idle
gaps. Keep elapsed time proportional inside active windows. Clip a section's
windows at the next populated section's kickoff if estimated windows overlap.
Keep all four section labels visible, including sections with no games or no
scoring. Carry cumulative scores through section boundaries and empty sections;
never reset the lead. Use one symmetric lead scale and the existing step line,
team colors, score tooltip, local timestamp formatting, and keyboard interaction.
Use multiline labels on narrow screens and explain that slots use Eastern time
while tooltips retain local time. Ranking, reconstruction, and finals do not change.

Keep pure schedule grouping and display-coordinate logic in a small helper.
Pass the week's chunks from matchup computation into the chart. Test Eastern
weekday boundaries, standard/daylight time, irregular final slots, empty slots,
compressed gaps, cumulative scores, and preservation of original timeline points.
Run affected tests and a production build, then inspect desktop/mobile charts and
tooltips in the browser. Preserve the existing untracked dist directory by
building to a separate temporary output. Commit task-owned files and push main.

Self-review: boundaries come from the full schedule rather than fantasy starters;
cross-midnight games stay in their kickoff slot; empty sections and missing Sunday
games have explicit behavior. Scope excludes scoring or ranking changes.

## Verification completed

All 17 focused SpiciestMatchups tests pass, including six new chunking regressions.
TypeScript checking and the production build pass. Browser inspection with the
2025 season confirms the four sections, cumulative line, and score/time tooltip.
Narrow-layout inspection confirms the labels fit without horizontal overflow.
The existing untracked dist directory was preserved.
