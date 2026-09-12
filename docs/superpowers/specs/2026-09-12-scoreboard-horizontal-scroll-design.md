# Horizontal scoreboard

Approved with `yesi` on September 12, 2026.

## Layout and content

The first viewport is a horizontal, nonwrapping strip of matchups, 100vh tall.
Each matchup fills that height and keeps its teams adjacent in two columns,
including narrow screens and embedded panels. Team names remain on one line;
cards grow horizontally when needed. Overflow belongs to the strip, not the page.
Actual score, projected final score, and win probability align across the teams.
Show the actual score gap once per matchup, or a bye/missing-data status as needed.
Remove repeated favorite labels, branding, fetch counts, and explanatory captions.
Preserve missing values as dashes rather than zeroes.

League name, season/week, mode, refresh, update time, and scrolling pause control
sit below the 100vh strip. Keep actionable loading, failure, and stale-data states.
Guillotine uses the same horizontal presentation for its individual teams and
retains elimination risk, incomplete-data warnings, and Thunderdome filtering.
No scoring, projection, ranking, extension, or parent-message logic changes.

## Scrolling

Adapt Multisport420's Autoscroller behavior to the horizontal axis: begin at
zero, pause 2.5 seconds, move to the end, pause 2.5 seconds, jump immediately to
zero, and repeat. Match its speed of 10% of the scrollable distance per second.
Only move when content overflows. Recompute the distance after resizing and
restart at the beginning for a new snapshot or display mode.
Pause during hover, keyboard focus, or manual interaction; allow manual scrolling
and an explicit pause/resume control. Respect reduced-motion preferences.
Clean up animation and event handlers on unmount, including React StrictMode.

## Verification

Use fake timers and simulated scroll dimensions to verify edge holds, forward
motion, immediate reset, no-overflow behavior, pause/resume, manual interaction,
resizing, reduced motion, and cleanup. Update UI tests to verify refreshes through
the transport and visible scores instead of the removed fetch counter. Check
desktop and narrow-screen geometry in a browser, run the scoreboard tests and
production build, and commit/push task-owned changes on main.

Self-review: all user constraints covered; loop direction and timing are explicit;
no data-model changes or extra roster features are required.
