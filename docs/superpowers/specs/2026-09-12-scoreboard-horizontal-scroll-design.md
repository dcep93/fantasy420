# Horizontal scoreboard

Approved with `yesi` on September 12, 2026.

## Layout and content

The first viewport is a horizontal, nonwrapping strip of matchups, 100vh tall.
Each matchup fills that height and keeps its teams adjacent in two columns,
including narrow screens and embedded panels. Team names remain on one line;
cards grow horizontally when needed. A 50px gutter separates uniformly colored matchups, with subtle rounded corners and no outer border. Overflow belongs to the strip, not the page.
Actual score, projected final score, and win probability align across the teams.
After inspecting the user's 1176×110 Multisport frame, the user's September 12
correction supersedes the original score-gap heading: remove it entirely and
use the old NFLStream notation `actual (projected)`. Each team has three compact
lines: name, score/projection, and probability (or Bye). Sizes depend on viewport
height and card widths follow content, without fixed 720px/230px minimums.
Remove repeated favorite labels, branding, fetch counts, and explanatory captions.
Preserve missing values as dashes rather than zeroes.

League name, season/week, mode, refresh, update time, and scrolling pause control
sit below the 100vh strip. Keep actionable loading, failure, and stale-data states.
Guillotine uses the same horizontal presentation for its individual teams and
retains elimination risk, incomplete-data warnings, and Thunderdome filtering.
Elimination teams sort by highest risk first, including the filtered Thunderdome.
Head-to-head matchups sort by probability closest to 50% first, with unavailable
probabilities last.
No scoring, projection, extension, or parent-message logic changes.

## Scrolling

Adapt Multisport420's Autoscroller behavior to the horizontal axis: begin at
zero, pause 5 seconds, move to the end, pause 2.5 seconds, jump immediately to
zero, and repeat with the same 5-second starting hold. Keep the speed of 10% of the scrollable distance per second.
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
no data-model changes or extra roster features are required. Short-panel checks
must include 110px and 80px heights, not only the original 360px panel test.
