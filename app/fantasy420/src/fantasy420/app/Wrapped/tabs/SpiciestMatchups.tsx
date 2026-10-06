import { useEffect, useState } from "react";
import { selectedWrapped, selectedYear } from "..";
import { NIGHT_COLORS } from "../../theme";
import MatchupLeadChart, { formatMatchupTime } from "./MatchupLeadChart";
import { computeSpiciestMatchups, MatchupSpiciness, SeasonData } from "./spiciestMatchupsData";

const DATA_CACHE = "data_v6";

export default function SpiciestMatchups() {
  const [result, setResult] = useState<{
    source: ReturnType<typeof selectedWrapped>;
    matchups: MatchupSpiciness[];
    error?: string;
  } | null>(null);
  const year = Number(selectedYear);
  const wrapped = selectedWrapped();
  useEffect(() => {
    let cancelled = false;
    setResult(null);
    if (!Number.isFinite(year)) {
      setResult({ source: wrapped, matchups: [], error: "Select a numeric year to view matchups." });
      return;
    }
    fetchSeasonData(year)
      .then(data => {
        if (!cancelled) setResult({ source: wrapped, matchups: computeSpiciestMatchups(wrapped, data).slice(0, 10) });
      })
      .catch(error => {
        if (!cancelled) setResult({ source: wrapped, matchups: [], error: error.message || String(error) });
      });
    return () => { cancelled = true; };
  }, [year, wrapped]);

  const loading = !result || result.source !== wrapped;
  return (
    <div style={{ padding: "0.5rem 1rem 1.5rem", maxWidth: 1200, boxSizing: "border-box" }}>
      <h2>Spiciest matchups · {selectedYear}</h2>
      <p style={{ maxWidth: "78ch", lineHeight: 1.6 }}>
        Which fantasy matchups traded the lead the most? These are the top 10 from completed weeks.
        Each lead change earns 1 spice point, plus 0.5 if it happens in the matchup’s final 45 estimated minutes.
        Taking the first lead doesn’t count; switching to the other team does, even after a tie.
      </p>
      <div style={{ background: NIGHT_COLORS.surfaceAlt, borderLeft: `3px solid ${NIGHT_COLORS.link}`,
        borderRadius: 6, padding: "0.8rem 1rem", marginBottom: 20, lineHeight: 1.5 }}>
        <b>How to read the chart</b>
        <div>The line shows estimated points ahead or behind. Above zero favors the first team; below zero favors the second.</div>
        <div style={{ color: NIGHT_COLORS.mutedText, marginTop: 6 }}>
          This is a reconstruction from final player totals and NFL play/game timing, not a record of live scores or win odds.
          Hover or tap the line for both teams’ estimated scores. Times use your local timezone.
        </div>
        <details style={{ marginTop: 8 }}>
          <summary style={{ cursor: "pointer" }}>How the estimate works</summary>
          <p style={{ maxWidth: "78ch", marginBottom: 0 }}>
            Each player’s final points are spread evenly over plays mentioning their name, or all plays when there are no matches.
            Game clocks are mapped onto approximate three-hour windows; missing play data places points at the estimated game end.
            Missing kickoff data uses the week’s first kickoff. This can change when leads appear to switch, so use spice as a rough comparison.
            Final scores below are the recorded starter totals. A late change is within 45 estimated minutes of the last starter’s game ending.
          </p>
        </details>
      </div>
      {loading ? <p role="status">Loading matchup timelines…</p> : result.error ?
        <p role="alert">Couldn’t load matchup timelines: {result.error}</p> : !result.matchups.length ?
        <p>No completed matchups with timeline data are available for this season.</p> :
        result.matchups.map((matchup, index) => (
          <article key={matchup.id} style={{ background: NIGHT_COLORS.surface,
            border: `1px solid ${NIGHT_COLORS.border}`, borderRadius: 14,
            padding: "clamp(12px, 3vw, 24px)", marginBottom: 20 }}>
            <header style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 12 }}>
              <div>
                <div style={{ color: NIGHT_COLORS.mutedText, fontSize: 14 }}>#{index + 1} · Week {matchup.week}</div>
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
                <b>{matchup.leadChanges} lead {matchup.leadChanges === 1 ? "change" : "changes"} + {matchup.lateLeadChanges} late × 0.5 = {matchup.score.toFixed(1)} spice</b>
              </div>
              <div>
                <div style={{ color: NIGHT_COLORS.mutedText, fontSize: 13 }}>Last estimated lead change</div>
                <b>{matchup.lastLeadChangeTimestamp === null ? "No lead changes" : formatMatchupTime(matchup.lastLeadChangeTimestamp)}</b>
              </div>
            </div>
            <MatchupLeadChart points={matchup.points} homeName={matchup.homeName} awayName={matchup.awayName} />
          </article>
        ))}
    </div>
  );
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
