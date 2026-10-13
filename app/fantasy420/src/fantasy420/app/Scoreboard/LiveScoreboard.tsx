import { useEffect, useRef, useState } from "react";
import { currentYear } from "../Wrapped";
import { headToHead, Snapshot, Team } from "./data";
import { fetchLiveScoreboard } from "./live";
import "./LiveScoreboard.css";

const points = (value: number | null) => value === null ? "—" : value.toFixed(2);
const odds = (value: number | null) => value === null ? "Unavailable" : `${(value * 100).toFixed(1)}%`;
const kickoffTime = (value: number) => new Date(value).toLocaleString("en-US", {
  weekday: "short", hour: "numeric", minute: "2-digit", timeZone: "America/New_York",
});
const injuryLabel = (value?: string) => !value || ["ACTIVE", "NORMAL", "HEALTHY"].includes(value) ? ""
  : ({ QUESTIONABLE: "Q", DOUBTFUL: "D", OUT: "OUT", INJURY_RESERVE: "IR", SUSPENSION: "SUSP" }[value] ?? value.replaceAll("_", " "));

function Lineup({ team }: { team: Team }) {
  const lineup = team.projectedLineup;
  if (!lineup || lineup.warning) return <p className="live-scoreboard-warning">Optimization unavailable: {lineup?.warning ?? "Missing roster data."} Win probability is withheld.</p>;
  return <>
    <div className="live-scoreboard-table" tabIndex={0} role="region" aria-label={`${team.name} lineup details`}><table>
      <thead><tr><th>Slot</th><th>Player</th><th>Opp</th><th>Status / time (ET)</th><th>Earned</th><th>Projection</th></tr></thead>
      <tbody>{lineup.players.map(player => <tr key={player.id}>
        <td>{player.slot}</td><td>{player.name}
          {injuryLabel(player.injuryStatus) && <span className="live-scoreboard-injury"> {injuryLabel(player.injuryStatus)}</span>}
          <small className="live-scoreboard-player-meta">{player.game?.team}{player.locked && " · Locked"}</small>
        </td>
        <td className="live-scoreboard-opponent">{player.game?.opponent ?? "—"}</td>
        <td className="live-scoreboard-game">
          {player.game?.status === "Scheduled" ? player.game.kickoff === null ? "Time TBD" :
            <time dateTime={new Date(player.game.kickoff).toISOString()}>{kickoffTime(player.game.kickoff)}</time>
            : player.game?.status ?? "Unknown"}
          {player.game?.status === "Started" && player.game.kickoff !== null && <small className="live-scoreboard-player-meta">{kickoffTime(player.game.kickoff)}</small>}
        </td>
        <td>{points(player.actual)}</td><td>{points(player.projection)}
          {player.projectionMissing ? <small className="live-scoreboard-projection-note">Missing forecast → 0</small> :
            player.projection === 0 && <small className="live-scoreboard-projection-note">ESPN zero</small>}
        </td>
      </tr>)}</tbody>
    </table></div>
    {lineup.emptySlots.length > 0 && <p>{lineup.emptySlots.length} starting slots could not be filled from the eligible roster.</p>}
  </>;
}

export default function LiveScoreboard({ load = fetchLiveScoreboard }: { load?: typeof fetchLiveScoreboard } = {}) {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const refreshRef = useRef<() => void>(() => {});
  useEffect(() => {
    let alive = true, inFlight = false;
    const refresh = async () => {
      if (inFlight) return;
      inFlight = true; setLoading(true); setError(null);
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        const next = await Promise.race([load(Number(currentYear)), new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new Error("Live refresh timed out. Try again.")), 25_000);
        })]);
        if (alive) setSnapshot(next);
      } catch (err) {
        if (alive) setError(err instanceof Error ? err.message : "Install or reload the Fantasy420 Chrome extension and sign in to ESPN to load live matchups.");
      } finally {
        clearTimeout(timer); inFlight = false;
        if (alive) setLoading(false);
      }
    };
    refreshRef.current = refresh;
    void refresh();
    const whenVisible = () => { if (document.visibilityState === "visible") void refresh(); };
    const interval = setInterval(whenVisible, 60_000);
    document.addEventListener("visibilitychange", whenVisible);
    return () => { alive = false; clearInterval(interval); document.removeEventListener("visibilitychange", whenVisible); };
  }, [load]);
  return <section className="live-scoreboard" aria-label="Current week scoreboard">
    <div className="live-scoreboard-header">
      <div><h2>{snapshot ? `Week ${snapshot.week}` : "Current week"} · Live scoreboard</h2>
        <p>Closest to 50% first. Every team’s eligible lineup is maximized by projection; locked starters stay in place. Equal totals keep existing starters.</p></div>
      <button onClick={() => refreshRef.current()} disabled={loading}>{loading ? "Refreshing…" : "Refresh"}</button>
    </div>
    <p className="live-scoreboard-meta">Estimated fantasy win probabilities use the same model as SpiciestMatchups and Multisport. Refreshes every minute while visible.</p>
    {error && <p role="alert" className="live-scoreboard-warning">{error} {snapshot && "Showing the previous update; results may be stale."}</p>}
    {snapshot && <>
      <p className="live-scoreboard-meta">{snapshot.leagueName} · Updated {new Date(snapshot.fetchedAt).toLocaleString()}</p>
      {headToHead(snapshot).map(({ teams, probability, key }, rank) => <article className="live-scoreboard-matchup" key={key}>
        <div className="live-scoreboard-rank">#{rank + 1} · Week {snapshot.week}</div>
        <div className="live-scoreboard-teams">{teams.map((team, index) => <div className="live-scoreboard-team" key={team.id}>
          <h3>{team.name}</h3>
          <div className="live-scoreboard-odds">{odds(probability === null ? null : index === 0 ? probability : 1 - probability)} <small>to win</small></div>
          <div className="live-scoreboard-points"><span><b>{points(team.score)}</b> earned</span><span><b>{points(team.projected)}</b> optimized finish</span></div>
        </div>)}</div>
        <details>
          <summary>Optimized lineups · both teams</summary>
          <div className="live-scoreboard-teams">{teams.map(team => <div className="live-scoreboard-team" key={team.id}>
            <h4>{team.name}{team.projectedLineup && !team.projectedLineup.warning && ` · ${team.projectedLineup.players.length} starters`}</h4>
            <Lineup team={team} />
          </div>)}</div>
          <small>Times are Eastern. “Started” means kickoff has passed; no live game clock is provided. Player projections are pregame; absent weekly forecasts count as 0. Team projected finishes include live results.</small>
        </details>
        {probability !== null && <div className="live-scoreboard-bar" aria-hidden="true"><span style={{ width: `${probability * 100}%` }} /></div>}
      </article>)}
    </>}
    {!snapshot && !error && <p role="status">Loading this week’s NFL schedule, matchups and projections…</p>}
  </section>;
}
