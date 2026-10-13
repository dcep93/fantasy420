import { useEffect, useState } from "react";
import { selectedWrapped, selectedYear } from "..";
import allWrapped from "../allWrapped";
import { ALL_YEARS, scopeLabel } from "../scope";
import type { WrappedType } from "../../FetchWrapped";
import { NIGHT_COLORS } from "../../theme";
import MatchupLeadChart, { formatMatchupTime } from "./MatchupLeadChart";
import { analyzeSpiciestMatchups, compareMatchupSpiciness, MatchupSpiciness, SeasonData } from "./spiciestMatchupsData";
import { COMPETITIVE_MARGIN, MAX_REVERSAL_BONUS, MAX_SUSPENSE_BONUS, MIN_SPICE_SCORE, MIN_SWING_POINTS, REVERSAL_POINTS, TOP_SWING_COUNT } from "./matchupSpiciness";

const DATA_CACHE = "data_v6";

export default function SpiciestMatchups() {
  const [result, setResult] = useState<{
    source: ReturnType<typeof selectedWrapped> | null;
    scope: string;
    excluded: string[];
    projectionOmissions: Record<string, number>;
    matchups: MatchupSpiciness[];
    eligibleCount: number;
    qualifyingCount: number;
    error?: string;
  } | null>(null);
  const year = selectedYear;
  const wrapped = year === ALL_YEARS ? null : selectedWrapped();
  useEffect(() => {
    let cancelled = false;
    setResult(null);
    const seasons = year === ALL_YEARS ? allWrapped : wrapped ? { [year]: wrapped } : {};
    loadMatchupSeasons(seasons)
      .then(loaded => {
        if (!cancelled) setResult({ source: wrapped, scope: year, ...loaded });
      })
      .catch(error => {
        if (!cancelled) setResult({ source: wrapped, scope: year, matchups: [], eligibleCount: 0, qualifyingCount: 0, excluded: [], projectionOmissions: {}, error: error.message || String(error) });
      });
    return () => { cancelled = true; };
  }, [year, wrapped]);

  const loading = !result || result.source !== wrapped || result.scope !== year;
  const omittedCount = Object.values(result?.projectionOmissions ?? {}).reduce((sum, count) => sum + count, 0);
  return (
    <div style={{ padding: "0.5rem 1rem 1.5rem", maxWidth: 1200, boxSizing: "border-box" }}>
      <h2>Spiciest matchups · {scopeLabel(year, Object.keys(allWrapped))}</h2>
      <p style={{ maxWidth: "78ch", lineHeight: 1.6 }}>
        Which fantasy matchups had the biggest changes in their chances to win? Showing up to 10 completed matchups with at least {MIN_SPICE_SCORE} spice.
        Spice adds the {TOP_SWING_COUNT} strongest competitive probability swings, decisive favorite reversals,
        and suspense during the final 25% of projected scoring remaining.
        Decisive reversals require the favorite to change from one team with at least a 60% chance to the other with at least 60%.
        Each earns {REVERSAL_POINTS} spice, doubled late and capped at {MAX_REVERSAL_BONUS}; late suspense adds up to {MAX_SUSPENSE_BONUS}.
      </p>
      <div style={{ background: NIGHT_COLORS.surfaceAlt, borderLeft: `3px solid ${NIGHT_COLORS.link}`,
        borderRadius: 6, padding: "0.8rem 1rem", marginBottom: 20, lineHeight: 1.5 }}>
        <b>How to read the chart</b>
        <div>The line shows the first team’s estimated chance to win, from 0% to 100%. Above 50% favors the first team; below 50% favors the second.</div>
        <div style={{ color: NIGHT_COLORS.mutedText, marginTop: 6 }}>
          Projected finish = estimated points earned + weekly projection × fraction of the player’s game remaining.
          Win probability uses the same model as Multisport: projected final-score difference with uncertainty based on both teams’ projected points remaining. These are reconstructed estimates, not recorded live odds.
          The graph is split into pre Sunday, Sunday pre final slot, Sunday final slot, and post Sunday.
          Slots use Eastern kickoff times; hover or tap for both teams’ probabilities, estimated points earned, projected finishes, and local times.
        </div>
        <details style={{ marginTop: 8 }}>
          <summary style={{ cursor: "pointer" }}>How the estimate works</summary>
          <p style={{ maxWidth: "78ch", marginBottom: 0 }}>
            Each player’s final points are spread evenly over plays mentioning their name, or all plays when there are no matches.
            Game clocks are mapped onto approximate three-hour windows; missing play data spreads points evenly across the game.
            Missing kickoff data uses the week’s first kickoff. This can change when leads appear to switch, so use spice as a rough comparison.
            Each starter begins with their saved projection for that week and ends at their recorded final score.
            Projections decrease with estimated game time remaining, including overtime, independently of points earned.
            The probability model treats the projected final-score difference as a normal distribution whose uncertainty shrinks with projected points remaining.
            When no projected points remain, it resolves to 100% or 0% (a final tie is displayed at 50%).
            Spice uses the actual probabilities shown in the chart, before its square-root display scaling.
            Swings run between probability peaks and troughs; reversals under {MIN_SWING_POINTS} percentage points don’t split a swing.
            A comeback stopping within {COMPETITIVE_MARGIN} percentage points of 50% earns its size × (1 − distance from 50% / {COMPETITIVE_MARGIN}).
            Crossing 50% earns the recovered probability deficit plus up to {COMPETITIVE_MARGIN} percentage points of the new lead.
            Extending a lead earns no swing credit. Ties and probabilities between 40% and 60% preserve the established favorite;
            acquiring the first favorite earns no reversal bonus.
            Late means at most 25% of the initial projected scoring remains for these two lineups, regardless of NFL kickoff slot.
            Late suspense averages closeness to 50% over that remaining scoring: 50% earns full credit, falling to zero at 25% or 75%.
            Idle time earns nothing. With no initial projected scoring remaining, there is no late multiplier or suspense credit.
            Final scores below are recorded starter totals. Matchups with missing or unverified starter projections are excluded.
            Unverified zeros are excluded, including ESPN records with empty projected scoring contributions.
            New fetches check the scoring inputs before accepting a zero total. Projections aren’t timestamped throughout the week.
          </p>
        </details>
      </div>
      {!loading && result.excluded.length > 0 && <p role="alert">Unavailable years: {result.excluded.join(", ")}. Rankings use only successfully loaded seasons.</p>}
      {!loading && omittedCount > 0 && <p role="note">
        {omittedCount} {omittedCount === 1 ? "matchup omitted" : "matchups omitted"} because starter projections are missing or unverified
        {" "}({Object.entries(result.projectionOmissions).map(([year, count]) => `${year}: ${count}`).join("; ")}).
        {" "}These matchups have no probability graph or spice ranking.
      </p>}
      {!loading && !result.error && result.matchups.length > 0 && <p role="status">
        Showing {result.matchups.length} of {result.qualifyingCount} qualifying {result.qualifyingCount === 1 ? "matchup" : "matchups"}
        {" "}with at least {MIN_SPICE_SCORE} spice (maximum 10 shown).
      </p>}
      {loading ? <p role="status">Loading matchup timelines…</p> : result.error ?
        <p role="alert">Couldn’t load matchup timelines: {result.error}</p> : !result.matchups.length ?
        <p>{result.eligibleCount > 0 ? `No completed matchups reached the ${MIN_SPICE_SCORE}-spice minimum for this selection.` :
          "No completed matchups with timeline data and verified weekly projections are available for this selection."}</p> :
        result.matchups.map((matchup, index) => (
          <article key={matchup.id} style={{ background: NIGHT_COLORS.surface,
            border: `1px solid ${NIGHT_COLORS.border}`, borderRadius: 14,
            padding: "clamp(12px, 3vw, 24px)", marginBottom: 20 }}>
            <header style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 12 }}>
              <div>
                <div style={{ color: NIGHT_COLORS.mutedText, fontSize: 14 }}>#{index + 1} · {matchup.year} · Week {matchup.week}</div>
                <h3 style={{ margin: "6px 0 10px" }}>{matchup.homeName} vs {matchup.awayName}</h3>
              </div>
              <div style={{ fontWeight: 700, color: NIGHT_COLORS.loss }}>{matchup.score.toFixed(1)} spice</div>
            </header>
            <p style={{ margin: "0 0 14px", lineHeight: 1.5 }}>
              <b>Final:</b> {matchup.homeName} {matchup.finalScores[0].toFixed(2)} · {matchup.awayName} {matchup.finalScores[1].toFixed(2)}
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "12px 32px", marginBottom: 20,
              padding: "12px 0", borderTop: `1px solid ${NIGHT_COLORS.border}` }}>
              <div>
                <div style={{ color: NIGHT_COLORS.mutedText, fontSize: 13 }}>Why it ranks here</div>
                <b>{matchup.swingScore.toFixed(2)} probability swing percentage points + {matchup.reversalBonus.toFixed(2)} reversal bonus + {matchup.suspenseBonus.toFixed(2)} late suspense = {matchup.score.toFixed(2)} spice</b>
                <div style={{ color: NIGHT_COLORS.mutedText, fontSize: 13, marginTop: 6 }}>
                  Competitive swing credits: {matchup.biggestSwings.length ? matchup.biggestSwings.map(value => value.toFixed(2)).join(" + ") : "none"}.
                  { " "}{matchup.meaningfulLeadChanges} decisive favorite {matchup.meaningfulLeadChanges === 1 ? "reversal" : "reversals"}, including {matchup.lateLeadChanges} late; reversal bonus capped at {MAX_REVERSAL_BONUS}.
                </div>
              </div>
              <div>
                <div style={{ color: NIGHT_COLORS.mutedText, fontSize: 13 }}>Last decisive favorite reversal</div>
                <b>{matchup.lastReversalTimestamp === null ? "None" : formatMatchupTime(matchup.lastReversalTimestamp)}</b>
              </div>
            </div>
            <MatchupLeadChart points={matchup.points} chunks={matchup.chunks} homeName={matchup.homeName} awayName={matchup.awayName} />
          </article>
        ))}
    </div>
  );
}

export async function loadMatchupSeasons(
  seasons: Record<string, WrappedType>,
  fetchSeason: (year: number) => Promise<SeasonData> = fetchSeasonData
): Promise<{ matchups: MatchupSpiciness[]; excluded: string[]; projectionOmissions: Record<string, number>; eligibleCount: number; qualifyingCount: number }> {
  const entries = Object.entries(seasons);
  const results = await Promise.allSettled(entries.map(async ([year, wrapped]) =>
    analyzeSpiciestMatchups(wrapped, await fetchSeason(Number(year)))));
  const excluded = entries.filter((_, index) => results[index].status === "rejected").map(([year]) => year);
  if (!entries.length || excluded.length === entries.length) {
    const reasons = results.flatMap(result => result.status === "rejected" ? [String(result.reason?.message ?? result.reason)] : []);
    throw new Error(`No timeline data could be loaded for ${excluded.join(", ") || "this selection"}. ${reasons.join("; ")}`);
  }
  const projectionOmissions = Object.fromEntries(results.flatMap((result, index) =>
    result.status === "fulfilled" && result.value.omittedForProjections > 0 ?
      [[entries[index][0], result.value.omittedForProjections]] : []));
  const eligible = results.flatMap(result => result.status === "fulfilled" ? result.value.matchups : []);
  const qualifying = eligible.filter(matchup => matchup.score >= MIN_SPICE_SCORE).sort(compareMatchupSpiciness);
  return { matchups: qualifying.slice(0, 10), excluded, projectionOmissions,
    eligibleCount: eligible.length, qualifyingCount: qualifying.length };
}

export async function fetchSeasonData(year: number): Promise<SeasonData> {
  const url = `https://dcep93.github.io/nflquery/data_v6/${year}.json`;
  // Current-season data grows weekly; only reuse complete historical seasons.
  const cache = typeof caches !== "undefined" ? await caches.open(DATA_CACHE).catch(() => null) : null;
  if (year < new Date().getFullYear()) {
    const cached = await cache?.match(url).catch(() => undefined);
    if (cached) return cached.json();
  }
  const response = await fetch(url, { cache: "no-cache" });
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${year}`);
  await cache?.put(url, response.clone()).catch(() => undefined);
  return response.json();
}

export { buildWeekSchedule, computeSpiciestMatchups, lookupTeamAbbreviation } from "./spiciestMatchupsData";
