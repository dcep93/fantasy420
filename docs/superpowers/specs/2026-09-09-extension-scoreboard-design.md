# Extension-backed fantasy scoreboard

Approved in conversation: implement both head-to-head and Guillotine modes at `/scoreboard`, using the Fantasy420 Chrome extension as the only data bridge, plus iframe refresh and a per-load fetch counter. Multisport integration is a subsequent task.

## Data and extension

The extension locates an open ESPN Fantasy football league tab and asks a dedicated content script in its top frame to fetch ESPN's authenticated league API with `credentials: include` and `cache: no-store`. Preserve NFL Stream's views: mMatchup, mMatchupScore, mRoster, mScoreboard, mSettings, mStatus, mTeam, modular, mNav. Pick the most recently accessed matching league tab; optional `leagueId` and `year` URL parameters make selection deterministic. Derive the default season from the ESPN tab's `seasonId`, or the current NFL season (previous calendar year in January–February). No public proxy or page-side network fallback.

The extension returns data and the number of actual ESPN requests started, including HTTP/network failures. Missing extension or missing league tab causes no ESPN fetch and leaves the counter unchanged. Bound requests with timeouts and serialize/coalesce simultaneous refreshes to avoid duplicate fetches. Only Fantasy420/localhost callers may invoke the new scoreboard bridge. The page uses the installed extension's discovered ID; outdated/missing installations get actionable instructions.

## Model

Source: complete Scoreboard.tsx read in web Codex task `task_e_695054588e8c833197647e5b3e4ce2f8` dated December 27, 2025, recovered in `_codex_output/nflstream-recovered-2026-09-09/Scoreboard.2025-12-27.tsx`.

For head-to-head use ESPN `totalPointsLive` and `totalProjectedPointsLive`. Define remaining = projected - actual; upcoming for the matchup is the sum of remaining + min(remaining, 5) across both teams. Standard deviation is 8 * sqrt(upcoming / 12). The favorite's probability is the standard normal CDF of projected margin / standard deviation. Preserve 5, 8 and 12. Clamp negative remaining uncertainty to zero; when no uncertainty remains, return 1/0 for a lead or 0.5 for a tie. Handle missing projections as unavailable rather than inventing probabilities.

For Guillotine, deduplicate all participating teams, retain positive projected totals, use the same per-team uncertainty and minimum standard deviation 0.01. Compute each independent normal team's chance of finishing lowest with the integral of its density times every other team's survival probability. The original `probNormalMinAll` implementation was not recovered, so use deterministic numerical integration of this verified mathematical model, with normalization and analytic two-team handling. Preserve ascending elimination-risk ordering and the original THUNDERDOME behavior when at most three teams have risk above 1%. No fabricated projection model or imported standings-elasticity formula.

Use the current matchup period (`status.currentMatchupPeriod`, with scoringPeriodId fallback) and retain byes for Guillotine but not head-to-head pairs. The league's original Guillotine ID 367176096 selects that mode by default; explicit mode control allows both views for other leagues. Maintain zero scores, omit bench/IR from starter totals, and avoid displaying invalid numeric values.

## Page and embedding

Compact dark cards wrap to the iframe width. Head-to-head cards show favorite win probability, both team names, actual scores and projected finals; Guillotine cards show elimination probability, team, actual score and projection. Mode can be selected in a compact toolbar. Fetch once on mount, then on Refresh or parent `postMessage({type: "fantasy420:scoreboard:refresh", requestId?}, "https://fantasy420.web.app")`. Mode changes only rerender cached data. The small toolbar includes league/week, loading/error state and `Fetches: N`.

Accept refresh messages only from the immediate parent window; no arbitrary URLs, scripts or credentials are accepted. Reply to the exact parent origin with `fantasy420:scoreboard:refreshed`, requestId, ok and fetchCount, never league data. Announce `fantasy420:scoreboard:ready` when the listener is installed, so an embedder can coordinate startup. Document this interface and URL parameters in the repository.

Preserve the previous good snapshot on refresh failures and clearly identify stale data. Missing extension prevents rendering league data. Avoid StrictMode's development effect replay causing duplicate initial requests. The toolbar and cards must remain readable in narrow panels.

## Verification and delivery

Unit-test recovered numeric examples, ties/final games, missing data, two-team Gaussian probability and many-team symmetry/normalization. Verify ESPN mapping, multi-week periods, byes and duplicate teams. Test the real extension scripts with Chrome API mocks for sender checks, tab selection, authenticated uncached requests, counters and failures. Component-test extension gating, StrictMode, refresh coalescing and parent-only messaging. Run the existing suite and production build, then inspect the rendered page and live extension flow where available. Commit on main and push; verify the Firebase workflow and deployed route. A changed unpacked extension may need reloading and existing ESPN tabs need refreshing.

Self-review: scope, inputs, formulas, counter semantics, iframe contract, error behavior and deployment are specified; no outstanding design placeholders. Implementation is authorized by the user's explicit instruction to proceed with both modes.
