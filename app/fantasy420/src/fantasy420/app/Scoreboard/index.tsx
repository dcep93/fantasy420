import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { createScoreboardController } from "./controller";
import { guillotine, headToHead, Mode, Team } from "./data";
import "./scoreboard.css";

const prefix = "fantasy420:scoreboard:";
const points = (value: number | null) => value === null ? "—" : value.toFixed(2);
const percent = (value: number) => `${(value * 100).toFixed(2)}%`;

function TeamScore({ team, probability }: { team: Team; probability?: number | null }) {
  return <div className="scoreboard-team">
    <div className="scoreboard-team-name">{team.name}</div>
    <div className="scoreboard-numbers"><strong>{points(team.score)}</strong>
      <span>{points(team.projected)} projected</span>
      {probability !== undefined && probability !== null && <span className="scoreboard-win">{percent(probability)} win</span>}
    </div>
  </div>;
}

export default function Scoreboard() {
  const [query] = useState(() => new URLSearchParams(window.location.search));
  const [controller] = useState(() => createScoreboardController({
    ...(query.has("leagueId") ? { leagueId: query.get("leagueId")! } : {}),
    ...(query.has("year") ? { year: Number(query.get("year")) } : {}),
  }));
  const state = useSyncExternalStore(controller.subscribe, controller.getSnapshot);
  const [selectedMode, setSelectedMode] = useState<Mode | null>(() => {
    const mode = query.get("mode");
    return mode === "head-to-head" || mode === "guillotine" ? mode : null;
  });
  const mode = selectedMode ?? (state.snapshot?.knockout || state.snapshot?.leagueId === "367176096" ? "guillotine" : "head-to-head");
  const matchups = useMemo(() => state.snapshot ? headToHead(state.snapshot) : [], [state.snapshot]);
  const elimination = useMemo(() => state.snapshot && mode === "guillotine" ? guillotine(state.snapshot) : null, [state.snapshot, mode]);

  useEffect(() => {
    const embedded = window.parent !== window;
    const receive = (event: MessageEvent) => {
      if (!embedded || event.source !== window.parent || event.data?.type !== `${prefix}refresh`) return;
      const requestId = typeof event.data.requestId === "string" || typeof event.data.requestId === "number" ? event.data.requestId : undefined;
      void controller.refresh().then(result => window.parent.postMessage({
        type: `${prefix}refreshed`, ...(requestId !== undefined ? { requestId } : {}), ...result,
      }, event.origin === "null" ? "*" : event.origin));
    };
    window.addEventListener("message", receive);
    if (embedded) {
      let origin = "*";
      try { origin = new URL(document.referrer).origin; } catch { /* No referrer; ready has no league data. */ }
      window.parent.postMessage({ type: `${prefix}ready` }, origin);
    }
    controller.start();
    return () => window.removeEventListener("message", receive);
  }, [controller]);

  return <main className="scoreboard-page">
    <header className="scoreboard-toolbar">
      <div><h1>Fantasy420 <span>Scoreboard</span></h1>
        <p>{state.snapshot ? `${state.snapshot.leagueName} · ${state.snapshot.year} · Week ${state.snapshot.week}` : "Live ESPN Fantasy football"}</p>
      </div>
      <div className="scoreboard-controls">
        <label>Mode <select value={mode} onChange={event => setSelectedMode(event.target.value as Mode)}>
          <option value="head-to-head">Head to head</option><option value="guillotine">Guillotine</option>
        </select></label>
        <button type="button" disabled={state.loading} onClick={() => void controller.refresh()}>{state.loading ? "Fetching…" : "Refresh"}</button>
      </div>
    </header>
    <div className="scoreboard-status" aria-live="polite">
      <span>Fetches: {state.fetchCount}</span>
      {state.snapshot && <span>Updated {new Date(state.snapshot.fetchedAt).toLocaleTimeString()}</span>}
      {state.error && state.snapshot && <strong>Showing previous data</strong>}
    </div>
    {state.error && <div className="scoreboard-error" role="alert">{state.error}</div>}
    {!state.snapshot && <section className="scoreboard-empty">
      <h2>{state.loading ? "Connecting to your league…" : "Your league, live"}</h2>
      <p>Use Chrome with the Fantasy420 extension installed and keep your ESPN Fantasy football league open in another tab.</p>
      <p>This scoreboard fetches through the extension. Refresh here or from the parent panel to update it.</p>
    </section>}
    {state.snapshot && state.extensionAvailable && <>
      {mode === "head-to-head" ? <>
        <p className="scoreboard-caption">Win probabilities use projected final scores and points remaining.</p>
        <div className="scoreboard-grid">{matchups.map(({ teams, probability, key }) => <article className="scoreboard-card" key={key}>
          <div className="scoreboard-card-label">{teams.length === 1 ? "Bye" : probability === null ? "Probability unavailable" : `${percent(probability)} · ${teams[0].name}`}</div>
          {teams.map((team, i) => <TeamScore key={team.id} team={team} probability={probability === null ? null : i === 0 ? probability : 1 - probability} />)}
        </article>)}</div>
        {!matchups.length && <p>{state.snapshot.knockout ? "This ESPN Knockout league has no head-to-head pairings. Select Guillotine to see elimination probabilities." : "No matchups are available for this scoring period."}</p>}
      </> : elimination && <>
        <p className="scoreboard-caption">Probability of finishing last · Teams with a zero projection are excluded, as in NFLStream.</p>
        {elimination.incomplete && <p role="status">ESPN is missing scores or projections. Elimination probabilities will appear when every competing team has data.</p>}
        {elimination.thunderdome && <div className="scoreboard-thunderdome"><strong>THUNDERDOME</strong><span>{elimination.teams.length} {elimination.teams.length === 1 ? "team" : "teams"} above 1% risk{elimination.hidden ? ` · ${elimination.hidden} below the display threshold` : ""}</span></div>}
        <div className="scoreboard-grid">{elimination.teams.map(({ team, probability }) => <article className="scoreboard-card" key={team.id}>
          <div className="scoreboard-card-label scoreboard-risk">{probability === null ? "Probability unavailable" : `${percent(probability)} elimination risk`}</div>
          <TeamScore team={team} />
        </article>)}</div>
        {!elimination.teams.length && <p>No teams with a positive projection are available for this scoring period.</p>}
      </>}
    </>}
  </main>;
}
