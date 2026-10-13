import { useEffect, useState } from "react";
import { selectedWrapped, selectedYear } from "..";
import allWrapped from "../allWrapped";
import { ALL_YEARS, scopeLabel } from "../scope";
import type { WrappedType } from "../../FetchWrapped";
import { NIGHT_COLORS } from "../../theme";
import MatchupLeadChart, { formatMatchupTime } from "./MatchupLeadChart";
import { computeSpiciestMatchups, MatchupSpiciness, SeasonData } from "./spiciestMatchupsData";
import { COMPETITIVE_MARGIN, FINAL_SLOT_FLIP_POINTS, MAX_FINAL_SLOT_BONUS, MIN_SWING_POINTS, TOP_SWING_COUNT } from "./matchupSpiciness";

const DATA_CACHE = "data_v6";

export default function SpiciestMatchups() {
  const [result, setResult] = useState<{
    source: ReturnType<typeof selectedWrapped> | null;
    scope: string;
    excluded: string[];
    matchups: MatchupSpiciness[];
    error?: string;
  } | null>(null);
  const year = selectedYear;
  const wrapped = year === ALL_YEARS ? null : selectedWrapped();
  useEffect(() => {
    let cancelled = false;
    setResult(null);
    const seasons = year === ALL_YEARS ? allWrapped : wrapped ? { [year]: wrapped } : {};
    loadMatchupSeasons(seasons)
      .then(({ matchups, excluded }) => {
        if (!cancelled) setResult({ source: wrapped, scope: year, matchups, excluded });
      })
      .catch(error => {
        if (!cancelled) setResult({ source: wrapped, scope: year, matchups: [], excluded: [], error: error.message || String(error) });
      });
    return () => { cancelled = true; };
  }, [year, wrapped]);

  const loading = !result || result.source !== wrapped || result.scope !== year;
  return (
    <div style={{ padding: "0.5rem 1rem 1.5rem", maxWidth: 1200, boxSizing: "border-box" }}>
      <h2>Spiciest matchups · {scopeLabel(year, Object.keys(allWrapped))}</h2>
      <p style={{ maxWidth: "78ch", lineHeight: 1.6 }}>
        Which fantasy matchups had the biggest changes in their expected outcome? These are the top 10 from completed weeks.
        Spice adds the {TOP_SWING_COUNT} strongest competitive swings in projected final-score differential,
        plus {FINAL_SLOT_FLIP_POINTS} per projected lead change in the week’s final NFL game slot (up to {MAX_FINAL_SLOT_BONUS} bonus points).
        Comebacks must approach within {COMPETITIVE_MARGIN} points of a tie or reverse the lead. Pulling further ahead earns no swing credit; tiny early fluctuations don’t count.
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
            Spice is still based on competitive point-margin swings and final-slot favorite changes, not early probability wiggles.
            Swings run between peaks and troughs; reversals under {MIN_SWING_POINTS} points don’t split a swing.
            A comeback ending within {COMPETITIVE_MARGIN} points of a tie earns its size × (1 − remaining margin / {COMPETITIVE_MARGIN}).
            Crossing zero earns the recovered deficit plus up to {COMPETITIVE_MARGIN} points of the new lead.
            A swing extending an existing lead, or never bringing it within {COMPETITIVE_MARGIN}, earns zero.
            The final-slot bonus starts at the week’s last scheduled NFL kickoff, often Monday night, and ends at its estimated completion.
            Taking the first lead doesn’t count; switching to the other team does, even after a tie.
            Final scores below are recorded starter totals. Matchups missing weekly projections are excluded;
            older snapshots may encode unavailable projections as zero, and projections aren’t timestamped throughout the week.
          </p>
        </details>
      </div>
      {!loading && result.excluded.length > 0 && <p role="alert">Unavailable years: {result.excluded.join(", ")}. Rankings use only successfully loaded seasons.</p>}
      {loading ? <p role="status">Loading matchup timelines…</p> : result.error ?
        <p role="alert">Couldn’t load matchup timelines: {result.error}</p> : !result.matchups.length ?
        <p>No competitive completed matchups with timeline data and weekly projections are available for this selection.</p> :
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
                <b>{matchup.swingScore.toFixed(2)} competitive swing pts + {matchup.finalSlotBonus} final-slot bonus = {matchup.score.toFixed(2)} spice</b>
                <div style={{ color: NIGHT_COLORS.mutedText, fontSize: 13, marginTop: 6 }}>
                  Competitive swing credits: {matchup.biggestSwings.length ? matchup.biggestSwings.map(value => value.toFixed(2)).join(" + ") : "none"}.
                  {" "}{matchup.finalSlotLeadChanges} final-slot {matchup.finalSlotLeadChanges === 1 ? "flip" : "flips"} × {FINAL_SLOT_FLIP_POINTS}, bonus capped at {MAX_FINAL_SLOT_BONUS}.
                </div>
              </div>
              <div>
                <div style={{ color: NIGHT_COLORS.mutedText, fontSize: 13 }}>Last final-slot lead change</div>
                <b>{matchup.lastFinalSlotLeadChangeTimestamp === null ? "None in the final slot" : formatMatchupTime(matchup.lastFinalSlotLeadChangeTimestamp)}</b>
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
): Promise<{ matchups: MatchupSpiciness[]; excluded: string[] }> {
  const entries = Object.entries(seasons);
  const results = await Promise.allSettled(entries.map(async ([year, wrapped]) =>
    computeSpiciestMatchups(wrapped, await fetchSeason(Number(year)))));
  const excluded = entries.filter((_, index) => results[index].status === "rejected").map(([year]) => year);
  if (!entries.length || excluded.length === entries.length) {
    const reasons = results.flatMap(result => result.status === "rejected" ? [String(result.reason?.message ?? result.reason)] : []);
    throw new Error(`No timeline data could be loaded for ${excluded.join(", ") || "this selection"}. ${reasons.join("; ")}`);
  }
  const matchups = results.flatMap(result => result.status === "fulfilled" ? result.value : [])
    .filter(matchup => matchup.score > 0)
    .sort((a,b) => b.score-a.score || (b.lastFinalSlotLeadChangeTimestamp ?? -Infinity)-(a.lastFinalSlotLeadChangeTimestamp ?? -Infinity) || b.year.localeCompare(a.year) || b.week-a.week || a.id.localeCompare(b.id))
    .slice(0,10);
  return { matchups, excluded };
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
