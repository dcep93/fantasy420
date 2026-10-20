# FantasyCalc manager score chart

Approved with `yesi` on 2026-10-19.

Append a horizontal stacked bar chart below the existing FantasyCalc roster
cards. Use the selected season's current roster (`rosters["0"]`) and latest
FantasyCalc values, with the existing name-to-player-ID normalization. Compute
the sorted roster and total once and share them between the cards and chart.

Managers appear in descending total order. Each bar uses the same zero-based
scale, with each positive-valued player's segment proportional to their value.
Use the existing night chart palette, thin internal separators, manager names,
and numeric totals. Player names, values, and draft picks have no visible
labels until interaction. Draft picks are one-based; missing picks read
“Undrafted.” Existing roster cards remain as they are.

Use full-width rows with wrapping manager names and bars at least 44px high.
Hover and keyboard focus reveal details; tapping pins details until another
selection, an outside tap, close, or Escape. Details fit within the viewport.
Previous/next player buttons in the details allow touch and keyboard users to
inspect tiny or zero-value contributions without distorting bar proportions.
Zero-total rosters offer an inspect action; empty rosters have an empty state.
No FantasyCalc values produces a clear unavailable message.

Implement a small typed React component with scoped CSS and no new dependencies.
Verify hidden initial details, proportional totals, hover/focus/tap dismissal,
undrafted players, zero values, and narrow viewport layout. Run focused tests
and the production build, preserving the unrelated existing dist directory by
building to a temporary output directory. Commit task-owned changes on main
and push according to workspace defaults.

Self-review: requirements are covered; “score” means the existing FantasyCalc
market value, not weekly fantasy points. The chart is additive at page bottom.

## Follow-up: labels and placement

The user requested the chart at the top of FantasyCalc, directly below the page
heading. Each player segment now shows the first name on line one and the
remaining name (including compound surnames and suffixes) on line two. Each
line truncates with an ellipsis to fit. Absolute positioning keeps labels from
changing segment widths or heights. Score and draft pick remain in the
hover/focus/tap details. This supersedes the original bottom placement and
hidden-name requirements.
