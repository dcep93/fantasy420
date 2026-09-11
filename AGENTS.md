# League data refreshes

Routine league-data refreshes must be extremely fast. The user's target is
approximately 12 seconds total: fetch 5 seconds, validate/save 5 seconds,
commit 1 second, push 1 second. These are performance targets, not reasons to
claim success before an operation finishes. Minimize tool calls and agent
overhead; only actual network/tool latency or an observed error should extend
the workflow. Do not insert sleeps or spend time rediscovering this process.

## Procedure

1. Check `git status --short --branch` once to identify unrelated changes.
   Use the existing checkout and branch. No routine `git fetch` is needed.
2. In the connected Chrome browser with the Fantasy420 extension, open
   `https://fantasy420.web.app/FetchWrapped` (or reload an existing refresh tab).
   This runs the app's existing ESPN league `203836968` and FantasyCalc fetch.
   Read the **last `pre` element's text** once it contains JSON, not
   `fetching...`. The first `pre` contains helper source, not league data.
   Read via the browser's DOM API; do not dump the entire response into chat.
3. Parse the JSON and do only a quick sanity check: the requested year,
   10 fantasy teams, nonempty players and current rosters, and a newer
   FantasyCalc timestamp with the existing history retained. Read the old
   snapshot once for this comparison. Do not audit every player, draft pick,
   score, schedule, or roster change. Do not require exactly 16 roster entries
   per team; IR slots can increase the count. `latestScoringPeriod` can still
   be 0 during a partially completed Week 1.
4. Save the generated JSON to
   `app/fantasy420/src/fantasy420/app/Wrapped/dataJson/<year>.json`
   (currently `2026.json`), with two-space indentation and a trailing newline.
   Preserve existing object-key order recursively where possible to avoid
   formatting churn. The hosted fetch already carries forward FantasyCalc
   history; do not replace it with only the latest entry.
5. Stage only that snapshot. Run `git diff --cached --check` and confirm the
   staged file list, then commit and push immediately when requested:
   `git commit -m "Refresh 2026 league data"` and `git push origin HEAD`.
   Substitute the requested year in the commit message. Preserve unrelated
   changes and do not include them in the commit. Stop on command failure.
6. Report the commit and successful push concisely. Do not wait for, poll, or
   inspect deployment; the push triggers the existing deployment workflow.

## Zero testing for data-only refreshes

- Run **zero tests**: no Vitest, unit, integration, browser, or regression tests.
- Do not run TypeScript checking, production builds, linters, or UI checks.
- Do not install, repair, or update dependencies, lockfiles, or tooling.
- Do not start a dev server, refactor the fetcher, or add tests or reports.
- Do not broaden validation after the quick sanity check passes.
- These instructions supersede older refresh design documents that prescribe
  full tests, builds, exhaustive validation, or deployment confirmation.
- If fetching fails or the minimal check fails, investigate that specific
  failure without committing an incomplete snapshot. Keep any investigation
  narrowly scoped; do not automatically start a test suite or build.
