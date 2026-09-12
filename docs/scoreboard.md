# Fantasy420 scoreboard

Open https://fantasy420.web.app/scoreboard in Chrome with Fantasy420 extension
0.0.3 or later installed. Reload an existing unpacked extension at
`chrome://extensions`, then reload your ESPN league tab and the scoreboard.
Keep a signed-in ESPN Fantasy football league open in another tab.

The extension picks an active/recent ESPN league tab. Pin a specific league and
season with `/scoreboard?leagueId=123&year=2026`. Override the mode with
`&mode=head-to-head` or `&mode=guillotine`; league 367176096 and native ESPN
Knockout leagues default to Guillotine.
The mode selector recalculates the current snapshot without fetching.

Matchups fill a 100vh horizontal strip, with opponents side by side and no team
or matchup wrapping. Each team shows its name, actual score with projected final
in parentheses, and win chance. This follows the recovered NFLStream scoreboard's
compact score notation. Font sizes and spacing scale with the frame height, so
all three lines fit in Multisport's 110px strip. Matchups size to their contents;
there is no fixed minimum card width or redundant score-gap heading. An 8px gutter
separates uniformly colored matchups, with subtle rounded corners and no outer border. Guillotine shows
individual teams with their elimination risk in the same horizontal strip.
League/week, mode, refresh, updated time, and scrolling controls sit below the
strip, accessible by scrolling the page down.

Overflow automatically scrolls from beginning to end at 10% of the scrollable
distance per second. It pauses for 5 seconds at the beginning and 2.5 seconds
at the end, jumps immediately back to the beginning, then repeats. Hovering, keyboard focus, and manual input
pause motion; a Pause/Resume scrolling button provides persistent control.
Reduced-motion preferences disable automatic motion. A new snapshot or mode
restarts the strip at the beginning. No overflow means no automatic movement.

One initial fetch occurs per mount, including React StrictMode. Refresh requests
are coalesced while one is running. There is no automatic polling. The API's
`fetchCount` counts ESPN requests acknowledged as started by the extension during this page
load, including network/HTTP failures. Missing extension/tab failures count zero.
The count is not shown in the scoreboard toolbar. It updates when a request completes; a lost extension connection cannot
report whether an in-flight request started. Normal fetch failures retain the
last snapshot with a visible warning; a missing extension clears it.

## Iframe refresh API

```html
<iframe id="fantasy-scoreboard"
  src="https://fantasy420.web.app/scoreboard?leagueId=123&mode=head-to-head"
  title="Fantasy football scoreboard"></iframe>
<script>
  const frame = document.getElementById("fantasy-scoreboard");
  const scoreboardOrigin = "https://fantasy420.web.app";
  window.addEventListener("message", (event) => {
    if (event.origin !== scoreboardOrigin || event.source !== frame.contentWindow) return;
    if (event.data?.type === "fantasy420:scoreboard:ready") {
      // The page starts its initial fetch automatically. The refresh listener is ready.
    }
    if (event.data?.type === "fantasy420:scoreboard:refreshed") {
      console.log(event.data.requestId, event.data.ok, event.data.fetchCount);
    }
  });
  function refreshScoreboard() {
    frame.contentWindow.postMessage({
      type: "fantasy420:scoreboard:refresh",
      requestId: crypto.randomUUID(),
    }, scoreboardOrigin);
  }
</script>
```

The scoreboard accepts messages only from its immediate parent. It responds to
the requesting origin with `{type, requestId, ok, fetchCount}` after the fetch
and state update. Responses contain no league data. `requestId` is optional and
may be a string or number. The ready notification uses the referrer origin when
available, otherwise `*`. Opaque parent origins also require `*` for the reply.
Avoid an opaque-origin sandbox on the scoreboard iframe: the extension needs
to recognize the Fantasy420 origin. Multisport integration is a separate step.

## Data and formulas

The website makes no ESPN or proxy requests. It asks the extension to locate an
ESPN tab; the content script fetches the original `lm-api-reads.fantasy.espn.com`
league endpoint with ESPN credentials, no cache, and views `mMatchup`,
`mMatchupScore`, `mRoster`, `mScoreboard`, `mSettings`, `mStatus`, `mTeam`,
`modular`, and `mNav`. The endpoint is constructed inside the extension rather
than accepted from the webpage. Requests time out and surface an actionable error.

Use `totalPointsLive` for actual scores and `totalProjectedPointsLive` for
projected final scores. Select `status.currentMatchupPeriod`, falling back to
`scoringPeriodId`. Preserve zero scores and byes. Missing values display as
unavailable, never infinity or an invented projection.

### Optimized projected lineups

For league **203836968 / team 6** and league **367176096 / team 1**, Fantasy420
rebuilds the unlocked starting lineup on each successful fetch. It uses only
players on that team's current roster, ESPN's weekly league-scored projections,
the league's configured starting slots, and each player's eligible slots. All
other teams continue to use ESPN's projected total directly.

Locked starters stay in their exact slot type, including FLEX and OP/Superflex.
Locked bench players stay benched, and IR players are excluded. Unlocked
starter/bench selections do not influence the result. The optimizer fills as
many starting positions as possible, then maximizes their total projection
across all legal assignments, including overlapping FLEX and OP eligibility.
Valid zero and negative projections are retained; a questionable designation
alone does not exclude a projected player. Equivalent assignments put higher
projections in the earlier dedicated slots, then use stable player-ID/slot
ordering; the existing scoreboard feed does not supply kickoff
times for a later-kickoff FLEX tie-break.

The corrected total is ESPN's live projection plus the selected unlocked
starters' projections minus the original unlocked starters' projections. This
preserves locked players' live/final contributions and any other baseline score
adjustments. Actual team points remain ESPN's live score. No lineup is submitted
to ESPN. Win and elimination probabilities use the corrected projection.

After publishing each refreshed snapshot, the browser console logs
`[Fantasy420] Projected roster` with the league, team, week, corrected total,
and every selected starter's name, slot, weekly projection, actual points, and
lock status. A locked player's logged weekly projection is its pregame estimate;
its live contribution remains in ESPN's baseline. Empty slots are listed when
the roster cannot fill every position. Coalesced refreshes log once per team.

If the roster, locks, eligibility, projections, or slot settings are incomplete
or invalid, Fantasy420 retains ESPN's total and logs
`[Fantasy420] Projected roster unchanged` with the reason instead of claiming
an optimized lineup. Refresh again after the source data is available.

Both the original home/away schedule and ESPN's native 2026 Knockout `teams`
array are supported. Native Knockout teams eliminated in earlier matchup
periods are excluded. These leagues have no head-to-head pairings, so that mode
explains how to switch to Guillotine instead of inventing matchups.

For each team, let `r = max(0, projected - actual)` and `u = r + min(r, 5)`.
Head-to-head win probability for A is
`Φ((projectedA - projectedB) / (8 * sqrt((uA + uB) / 12)))`.
Zero uncertainty yields 100%, 0%, or 50% for a tie. Teams sort by projected final
score; matchups sort by probability closest to 50% first, with unavailable
probabilities last. The clamp prevents invalid square
roots when a live projection falls below the actual score.

Guillotine uses independent normal final scores with means equal to projected
final scores and `sigma = max(0.01, 8 * sqrt(u / 12))`. The probability of team i
finishing last is the integral of its density times every other team's survival
probability. The new deterministic quadrature implementation handles narrow
0.01-sigma distributions and normalizes numerical integration error. It is not
the recovered original `guillotine.ts`, which remains unavailable.

Guillotine excludes nonpositive projections, sorts by decreasing last-place
risk, and enters THUNDERDOME when at most three teams exceed 1% risk,
showing only those teams. Team IDs are deduplicated. If a competitor's score or
projection is missing, all Guillotine probabilities are withheld.

Formula provenance: the complete December 27, 2025 `Scoreboard.tsx` recovered
from [the NFLStream web Codex task](https://chatgpt.com/codex/cloud/tasks/task_e_695054588e8c833197647e5b3e4ce2f8).
The standard-normal approximation and constants match that source. These are
the old custom model's estimates, not ESPN's own win probabilities.

## Validation

From `app/fantasy420`: `npm test` and `npm run build`.
From the repository root: `node --test extension/*.test.cjs`.
Tests cover probability reference values and numerical invariants, ESPN mapping,
both display modes, extension gating, fetch accounting, coalescing, StrictMode,
parent-message origin/source checks, and the real extension bridge scripts.
