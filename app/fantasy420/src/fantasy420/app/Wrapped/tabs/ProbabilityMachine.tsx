import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { bubbleStyle, currentYear, selectedWrapped } from "..";
import type { WrappedType } from "../../FetchWrapped";
import { NIGHT_CHART_COLORS } from "../../theme";
import { prepareProbabilitySeason, probabilityModel, type ProbabilityResult, type ProbabilitySeason } from "./probabilityEngine";
import "./PlayoffMachine.css";
import "./ProbabilityMachine.css";

const percent = (value: number) => `${(value * 100).toFixed(1)}%`;

function ProbabilityInput({ name, value, onChange }: { name: string; value: number; onChange: (p: number) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  return <label className="probability-input">
    <input type="number" min="0" max="100" step="0.1" inputMode="decimal"
      aria-label={`${name} win probability (%)`}
      value={editing ? draft : Number((value * 100).toFixed(1))}
      onFocus={() => { setEditing(true); setDraft(String(Number((value * 100).toFixed(1)))); }}
      onBlur={() => setEditing(false)}
      onChange={event => {
        const text = event.target.value;
        setDraft(text);
        const number = Number(text);
        if (text.trim() && Number.isFinite(number) && number >= 0 && number <= 100) onChange(number / 100);
      }} />
    <span aria-hidden="true">%</span>
  </label>;
}

export default function ProbabilityMachine() {
  const wrapped = selectedWrapped();
  return <Machine key={wrapped.year} wrapped={wrapped} />;
}

function Machine({ wrapped }: { wrapped: WrappedType }) {
  const base = useMemo(() => prepareProbabilitySeason(wrapped, currentYear), [wrapped]);
  const [overrides, setOverrides] = useState<Record<string, number>>({});
  const [manualPoints, setManualPoints] = useState<Record<string, number>>({});
  const [retry, setRetry] = useState(0);
  const scenario = useMemo(() => ({ ...base,
    points: base.points.map((pf, i) => pf + (manualPoints[base.teams[i].id] ?? 0)),
    games: base.games.map(game => ({ ...game, probability: overrides[game.key] ?? game.probability })),
  }), [base, overrides, manualPoints]);
  const [calculation, setCalculation] = useState<{
    scenario: ProbabilitySeason; result?: ProbabilityResult; error?: string;
  }>();
  const active = calculation?.scenario === scenario ? calculation : undefined;
  const result = active?.result;
  const pending = !active;

  useEffect(() => {
    let worker: Worker | undefined;
    let cancelled = false;
    // Coalesce quick edits, and terminate obsolete work rather than queueing it.
    const timer = window.setTimeout(() => {
      try {
        worker = new Worker(new URL("./probabilityMachine.worker.ts", import.meta.url), { type: "module" });
        worker.onmessage = event => {
          if (!cancelled) setCalculation({ scenario, ...event.data });
          worker?.terminate();
        };
        worker.onerror = () => {
          if (!cancelled) setCalculation({ scenario, error: "The calculation could not finish. Please try again." });
          worker?.terminate();
        };
        worker.postMessage(scenario);
      } catch {
        if (!cancelled) setCalculation({ scenario, error: "The calculation could not start. Please try again." });
      }
    }, 100);
    return () => { cancelled = true; window.clearTimeout(timer); worker?.terminate(); };
  }, [scenario, retry]);

  const styles = base.teams.map((_, i) => ({ "--playoff-team-color": NIGHT_CHART_COLORS[i] }) as CSSProperties);
  const card = { ...bubbleStyle, margin: 0 };
  const weeks = Array.from(new Set(base.games.map(game => game.week)));
  const override = (key: string, p: number) => setOverrides(previous => ({ ...previous, [key]: p }));
  const reset = (key: string) => setOverrides(previous => {
    const next = { ...previous }; delete next[key]; return next;
  });

  return <div className="playoff-machine probability-machine">
    <div className="probability-heading">
      <h2>Remaining matchups</h2>
      <button onClick={() => { setOverrides({}); setManualPoints({}); }}>Reset all</button>
    </div>
    <p className="playoff-strength-guide" id="probability-strength-guide">
      <strong>Weekly strength</strong> · 100 = league average. The same FantasyCalc roster scores as
      PlayoffMachine, including bench players and excluding byes. Edit either win probability;
      its opponent updates automatically. Use 100% to lock a winner.
    </p>
    <div className="playoff-weeks-grid" role="region" aria-label="Remaining weekly matchups"
      aria-describedby="probability-strength-guide" tabIndex={0}>
      {!weeks.length && <div style={card}>All weeks have finalized scoring.</div>}
      {weeks.map(week => <section className="playoff-week" style={card} key={week}>
        <h3>Week {week}</h3>
        {base.games.filter(game => game.week === week).sort((a, b) => {
          const gap = (g: typeof a) => g.strengthA === null || g.strengthB === null ? Infinity : Math.abs(g.strengthA - g.strengthB);
          return gap(a) - gap(b) || a.matchupIndex - b.matchupIndex;
        }).map(game => {
          const p = overrides[game.key] ?? game.probability;
          const overridden = overrides[game.key] !== undefined;
          const sides = [{ index: game.a, strength: game.strengthA, p },
            { index: game.b, strength: game.strengthB, p: 1 - p }]
            .sort((a, b) => (b.strength ?? -1) - (a.strength ?? -1));
          return <div className="playoff-matchup" key={game.key} role="group"
            aria-label={`Week ${week}: ${base.teams[game.a].name} versus ${base.teams[game.b].name}`}>
            <div className="probability-column-labels"><span>Manager</span><span>Strength</span><span>Win chance</span></div>
            {sides.map(side => <div className="probability-manager" key={side.index} style={styles[side.index]}>
              <strong className="playoff-team-name">{base.teams[side.index].name}</strong>
              <span className="playoff-strength" title="Weekly strength: 100 is league average; excludes byes">{side.strength ?? "—"}</span>
              <ProbabilityInput name={base.teams[side.index].name} value={side.p}
                onChange={value => override(game.key, side.index === game.a ? value : 1 - value)} />
              <button className="probability-lock" aria-label={`Set ${base.teams[side.index].name} to 100%`}
                onClick={() => override(game.key, side.index === game.a ? 1 : 0)}>100%</button>
            </div>)}
            <div className="probability-matchup-footer">
              <span>{overridden ? "Custom" : "Model"} · {base.teams[game.a].name} model {percent(game.probability)}</span>
              <button disabled={!overridden} onClick={() => reset(game.key)}>Reset</button>
            </div>
            {(game.strengthA === null || game.strengthB === null) &&
              <small>Strength unavailable; defaulting to 50% each.</small>}
          </div>;
        })}
      </section>)}
    </div>

    <section className="probability-results" aria-busy={pending} aria-label="Season finish probabilities">
      <h2>Where everyone finishes</h2>
      <p className="playoff-strength-guide">Completed points for plus your adjustments, with PlayoffMachine’s
        head-to-head tiebreakers. Remaining games add wins, without projecting more points for.</p>
      <div className="probability-status" role="status">
        {pending && "Calculating probabilities…"}
        {active?.error && <>{active.error} <button onClick={() => { setCalculation(undefined); setRetry(value => value + 1); }}>Retry</button></>}
        {result && (result.method === "exact"
          ? `Exact · ${result.scenarios.toLocaleString()} possible outcomes · ${(result.elapsedMs / 1000).toFixed(2)}s`
          : `${result.scenarios.toLocaleString()} simulated seasons · ${(result.elapsedMs / 1000).toFixed(2)}s · up to ±${(result.maxError95 * 100).toFixed(2)} percentage points of sampling error (95%, per estimate)`)}
      </div>
      <div className="playoff-standings-grid">
        {base.teams.map((team, i) => {
          const ranks = result?.ranks[i];
          const categories = ranks ? [ranks.slice(0, 4), ranks.slice(4, 6), ranks.slice(6)]
            .map(values => values.reduce((sum, p) => sum + p, 0)) : undefined;
          return <article className="playoff-team" style={{ ...card, ...styles[i] }} key={team.id} aria-label={team.name}>
            <div className="playoff-team-heading"><strong className="playoff-team-name">{team.name}</strong></div>
            <div className="playoff-stats"><span>Points For: <strong>{scenario.points[i].toFixed(2)}</strong></span>
              <span>Adjustment: {(manualPoints[team.id] ?? 0) >= 0 ? "+" : ""}{manualPoints[team.id] ?? 0}</span></div>
            <div className="playoff-points-controls">
              {[1000, -1000].map(delta => <button key={delta} onClick={() => setManualPoints(previous => ({
                ...previous, [team.id]: (previous[team.id] ?? 0) + delta,
              }))}>{delta > 0 ? "+1000 PF" : "-1000 PF"}</button>)}
            </div>
            <dl className="probability-bands">
              {["Top 4", "Middle 2", "Bottom 4"].map((label, band) => <div key={label}>
                <dt>{label}</dt><dd>{categories ? percent(categories[band]) : "—"}</dd>
              </div>)}
            </dl>
          </article>;
        })}
      </div>
    </section>
    <details className="probability-method" style={card}>
      <summary>How the probabilities work</summary>
      <p>Fitted once to {probabilityModel.games} completed league matchups from {probabilityModel.years.join(", ")},
        using the FantasyCalc values and rosters committed before each week. A logistic curve turns the strength
        difference into a win probability. Equal scores mean 50/50. The fitted constants stay fixed as league data refreshes.</p>
      <p>Remaining results are treated as independent wins or losses. Completed ties retain PlayoffMachine’s rules.
        Small sets of uncertain games are calculated exactly; larger sets use a fixed random seed and roughly
        one second of background calculation. Sampling error measures simulation precision, not the model’s predictive accuracy.</p>
      <p>The three percentages total 100% before rounding. Head-to-head comes before points for only when all
        managers tied on wins have played one another an equal, positive number of times.</p>
    </details>
  </div>;
}
