import { useMemo, useState } from "react";
import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { selectedWrapped } from "..";
import type { WrappedType } from "../../FetchWrapped";
import { buildWaiverImpact, sortWaiverManagers, type WaiverSort } from "./waiverImpactData";
import "./WaiverImpact.css";

const sortOptions: [WaiverSort, string][] = [
  ["pointsPerWeek", "Points / week"], ["totalPoints", "Total points"], ["share", "Share of lineup points"],
  ["bestWeek", "Best week"], ["pickups", "Pickups"], ["uniqueStarters", "Unique starters"],
  ["starts", "Waiver starts"], ["pointsPerStart", "Points / start"],
];
const metricLabels = { points: "Points", starts: "Waiver starts", pickups: "New pickups" };
type ChartMetric = keyof typeof metricLabels;
const number = (value: number | null) => value === null ? "—" : value.toFixed(2);

export function WaiverImpactForSeason({ wrapped }: { wrapped: WrappedType }) {
  const [excludeSpecialTeams, setExcludeSpecialTeams] = useState(false);
  const report = useMemo(() => buildWaiverImpact(wrapped, excludeSpecialTeams), [wrapped, excludeSpecialTeams]);
  const [sort, setSort] = useState<WaiverSort>("pointsPerWeek");
  const [managerId, setManagerId] = useState<string | null>(() => sortWaiverManagers(report.managers, "pointsPerWeek")[0]?.id ?? null);
  const [weekNumber, setWeekNumber] = useState<string | null>(null);
  const [metric, setMetric] = useState<ChartMetric>("points");
  const managers = sortWaiverManagers(report.managers, sort);
  // Default selection is independent of sorting; user selection survives every control change.
  const selected = managers.find(manager => manager.id === managerId) ?? sortWaiverManagers(report.managers, "pointsPerWeek")[0];
  const week = selected?.weeks.find(w => w.week === weekNumber) ?? selected?.weeks.filter(w => w.available).at(-1) ?? selected?.weeks.at(-1);
  const missingScores = managers.some(manager => manager.missingLineupScores > 0);
  const missingIdentity = managers.some(manager => manager.missingIdentities > 0);
  const uncertainAttribution = report.incompleteDraft || managers.some(manager => manager.weeks.some(w => w.attributionIncomplete));
  const partial = missingScores || missingIdentity || report.incompleteWeeks.length > 0 || uncertainAttribution;
  const chartData = selected?.weeks.map((w, i) => ({ week: w.week,
    manager: !w.available ? null : metric === "points" ? w.points : w[metric === "starts" ? "starters" : "pickups"].length,
    league: report.averages[i][metric],
  }));

  return <section className="waiver-impact" aria-label="Waiver Impact">
    <p className="waiver-intro">Estimated waiver/free-agent pickups and the points they added to starting lineups. Compare production, volume, and weekly contribution across managers.</p>
    {!report.weeks.length || !selected ? <p className="waiver-panel">No completed weeks with recorded rosters for {wrapped.year} yet.</p> : <>
      <div className="waiver-controls">
        <label>Sort managers<select value={sort} onChange={event => setSort(event.target.value as WaiverSort)}>{sortOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label className="waiver-check"><input type="checkbox" checked={excludeSpecialTeams} onChange={event => setExcludeSpecialTeams(event.target.checked)} />Exclude K/DST</label>
      </div>
      {partial && <div className="waiver-warning" role="status">
        <strong>Partial data.</strong>{" "}
        {report.incompleteWeeks.length > 0 && <>Missing roster coverage in week{report.incompleteWeeks.length === 1 ? "" : "s"} {report.incompleteWeeks.join(", ")}. Averages use recorded weeks only. </>}
        {uncertainAttribution && <>Incomplete or ambiguous ownership limits pickup estimates. </>}
        {missingScores && <>Some starting scores are missing; points and lineup shares use known scores only. </>}
        {missingIdentity && <>Missing player identity or position; unknown positions are excluded when K/DST are excluded. </>}
      </div>}
      <div className="waiver-table-scroll" tabIndex={0} aria-label="Scrollable manager leaderboard">
        <table className="waiver-leaderboard">
          <caption>Manager leaderboard</caption>
          <thead><tr><th scope="col">Manager</th><th scope="col">Pts/week</th><th scope="col">Total pts</th><th scope="col">Lineup share</th><th scope="col">Pickups</th><th scope="col">Unique starters</th><th scope="col">Starts</th><th scope="col">Coverage</th></tr></thead>
          <tbody>{managers.map((manager, rank) => <tr key={manager.id} className={selected.id === manager.id ? "waiver-selected" : undefined}>
            <th scope="row"><span className="waiver-rank">{rank + 1}</span><button aria-pressed={selected.id === manager.id} onClick={() => setManagerId(manager.id)}>{manager.name}</button></th>
            <td>{number(manager.pointsPerWeek)}</td><td>{number(manager.totalPoints)}{manager.missingScores > 0 && <span title="Missing waiver scores">*</span>}</td><td>{manager.share === null ? "—" : `${number(manager.share)}%`}</td>
            <td>{manager.pickups}</td><td>{manager.uniqueStarters}</td><td>{manager.starts}</td><td>{manager.coveredWeeks}/{report.weeks.length}</td>
          </tr>)}</tbody>
        </table>
      </div>
      <section className="waiver-panel" aria-label={`${selected.name} waiver detail`}>
        <h2>{selected.name} · waiver detail</h2>
        <p className="waiver-muted">{selected.coveredWeeks} of {report.weeks.length} completed weeks recorded{selected.missingScores > 0 ? ` · ${selected.missingScores} missing waiver score${selected.missingScores === 1 ? "" : "s"}` : ""}.</p>
        <dl className="waiver-stats">
          <div><dt>Points / week</dt><dd>{number(selected.pointsPerWeek)}</dd></div>
          <div><dt>Total points</dt><dd>{number(selected.totalPoints)}</dd></div>
          <div><dt>Pickups</dt><dd>{selected.pickups}</dd></div>
          <div><dt>Unique starters</dt><dd>{selected.uniqueStarters}</dd></div>
          <div><dt>Waiver starts</dt><dd>{selected.starts}</dd></div>
          <div><dt>Points / start</dt><dd>{number(selected.pointsPerStart)}</dd></div>
          <div><dt>Best week</dt><dd>{number(selected.bestWeek)}{selected.bestWeekNumber && <small>Week {selected.bestWeekNumber}</small>}</dd></div>
          <div><dt>Top pickup</dt><dd className="waiver-top-pickup">{selected.topPickup?.name ?? "—"}{selected.topPickup && <small>{selected.topPickup.position} · {number(selected.topPickup.points)} pts</small>}</dd></div>
        </dl>
        <label className="waiver-chart-control">Chart metric<select value={metric} onChange={event => setMetric(event.target.value as ChartMetric)}>{Object.entries(metricLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
        <div className="waiver-chart" role="img" aria-label={`${selected.name} weekly ${metricLabels[metric].toLowerCase()} compared with the league average. Individual weeks are available in the week breakdown below.`}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 16, right: 16, bottom: 8, left: 0 }} accessibilityLayer>
              <CartesianGrid stroke="var(--night-border)" strokeDasharray="3 3" />
              <XAxis dataKey="week" tick={{ fill: "var(--night-text)" }} />
              <YAxis width={42} allowDecimals={metric === "points"} tick={{ fill: "var(--night-text)" }} />
              <Tooltip contentStyle={{ background: "var(--night-surface)", borderColor: "var(--night-border)", borderRadius: 8, color: "var(--night-text)" }} labelFormatter={label => `Week ${label}`} formatter={(value: number) => number(value)} />
              <Legend />
              <Bar dataKey="manager" name={selected.name} fill="#64d6c4" radius={[3, 3, 0, 0]} maxBarSize={42} isAnimationActive={false} />
              <Line dataKey="league" name="League average" stroke="#e7b76c" strokeWidth={2} dot={{ r: 3 }} connectNulls={false} isAnimationActive={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        {week && <div className="waiver-week">
          <label>Week breakdown<select value={week.week} onChange={event => setWeekNumber(event.target.value)}>{report.weeks.map(value => <option key={value} value={value}>Week {value}{selected.weeks.find(w => w.week === value)?.available ? "" : " · unavailable"}</option>)}</select></label>
          {!week.available ? <p className="waiver-warning">No roster recorded for this week. Points and counts are unavailable.</p> : <>
            <p className="waiver-week-summary"><strong>{number(week.points)} points</strong> · {week.starters.length} waiver starts · {week.pickups.length} new pickups</p>
            <p className="waiver-muted">League average: {number(report.averages[report.weeks.indexOf(week.week)].points)} points · {number(report.averages[report.weeks.indexOf(week.week)].starts)} starts · {number(report.averages[report.weeks.indexOf(week.week)].pickups)} pickups.</p>
            {week.missingScores > 0 && <p className="waiver-warning">Partial points: {week.missingScores} missing waiver score{week.missingScores === 1 ? "" : "s"}. An em dash means unknown, not zero.</p>}
            <div className="waiver-week-grid">
              <div className="waiver-table-scroll"><table><caption>Weekly waiver starters</caption><thead><tr><th scope="col">Player</th><th scope="col">Position</th><th scope="col">Points</th></tr></thead><tbody>
                {week.starters.length ? week.starters.map(player => <tr key={player.id}><th scope="row">{player.name}</th><td>{player.position}</td><td>{number(player.points)}</td></tr>) : <tr><td colSpan={3}>No waiver players started.</td></tr>}
              </tbody></table></div>
              <section className="waiver-pickups" aria-label="New pickups"><h3>New pickups</h3>{week.pickups.length ? <ul>{week.pickups.map(player => <li key={player.id}><strong>{player.name}</strong><span>{player.position}</span><small>{week.starters.some(starter => starter.id === player.id) ? "Started" : "Bench"}</small></li>)}</ul> : <p>No new inferred pickups.</p>}</section>
            </div>
          </>}
        </div>}
      </section>
    </>}
    <details className="waiver-methodology"><summary>How these estimates work</summary>
      <p>Waiver claims and free agents are combined. A pickup is inferred when a player appears after being unrostered league-wide in the previous complete snapshot. Week 1 uses the league draft. Points count only while that manager continuously holds and starts the player.</p>
      <p>Pickups count acquisition events, including bench additions and observable re-adds. Unique starters count different pickup players started at least once. Waiver starts count one player in one weekly starting lineup; points/start measures their scoring efficiency. Same-week churn between snapshots is invisible.</p>
      <p>Direct transfers and duplicate ownership have unknown origin and are excluded. Missing snapshots prevent new inferences from absence; a missing manager roster breaks that manager’s waiver continuity. An incomplete draft prevents Week 1 pickup estimates.</p>
      <p>Points/week includes recorded zero-contribution weeks. Missing weeks are unavailable, not zero. League averages use managers with a recorded roster that week. Lineup share divides waiver points by all starting-lineup points; nonpositive denominators display an em dash. Missing scores are excluded from point sums and flagged as partial. Excluding K/DST filters all metrics and lineup points; players without a known skill position are also excluded.</p>
    </details>
  </section>;
}

export default function WaiverImpact() {
  const wrapped = selectedWrapped();
  return <WaiverImpactForSeason key={wrapped.year} wrapped={wrapped} />;
}
