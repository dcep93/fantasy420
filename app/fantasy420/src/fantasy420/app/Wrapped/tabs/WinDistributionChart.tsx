import { useMemo, useState, useSyncExternalStore, type CSSProperties } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { NIGHT_CHART_COLORS, NIGHT_COLORS } from "../../theme";
import type { ProbabilitySeason } from "./probabilityEngine";
import { getWinDistributions } from "./winDistribution";
import "./WinDistributionChart.css";

const percent = (value: number) => `${(value * 100).toFixed(1)}%`;
const compactQuery = "(max-width: 600px), (hover: none), (pointer: coarse)";
const isCompact = () => typeof window.matchMedia === "function" && window.matchMedia(compactQuery).matches;
function subscribeCompact(listener: () => void) {
  const media = window.matchMedia?.(compactQuery);
  media?.addEventListener("change", listener);
  return () => media?.removeEventListener("change", listener);
}

export default function WinDistributionChart({ season }: { season: ProbabilitySeason }) {
  const [selectedTeamId, setSelectedTeamId] = useState<string>();
  const [hoveredTeamId, setHoveredTeamId] = useState<string>();
  const showDetailsBelow = useSyncExternalStore(subscribeCompact, isCompact, () => false);
  const [inspectedWins, setInspectedWins] = useState<number>();
  const highlighted = selectedTeamId ?? hoveredTeamId;
  const { data, ticks, maxWins } = useMemo(() => {
    const distributions = getWinDistributions(season);
    const maxWins = Math.max(1, ...distributions.flatMap(points => points.map(point => point.wins)));
    const ticks = [...new Set([
      ...Array.from({ length: Math.floor(maxWins) + 1 }, (_, wins) => wins),
      ...distributions.flatMap(points => points.map(point => point.wins)),
    ])].sort((a, b) => a - b);
    const lookup = distributions.map(points => new Map(points.map(point => [point.wins, point.probability])));
    const data: { wins: number; [key: string]: number | null }[] = ticks.map(wins => ({ wins, ...Object.fromEntries(season.teams.map((team, i) => [
      `team_${team.id}`,
      // Half-win offsets from completed ties are separate discrete supports.
      // Skip the other support rather than drawing artificial zero spikes.
      lookup[i].get(wins) ?? (Number.isInteger(wins - season.wins[i]) ? 0 : null),
    ])) }));
    return { data, ticks, maxWins };
  }, [season]);
  const toggle = (id: string) => {
    setSelectedTeamId(previous => previous === id ? undefined : id);
    setHoveredTeamId(undefined);
  };
  const inspected = data.find(point => point.wins === inspectedWins);
  const details = season.teams.flatMap((team, i) => {
    const value = inspected?.[`team_${team.id}`];
    return value == null || (selectedTeamId && selectedTeamId !== team.id) ? [] : [{ team, i, value }];
  }).sort((a, b) => b.value - a.value);

  return <section className="win-distribution" aria-label="Win total probabilities">
    <h2>How many wins?</h2>
    <p className="playoff-strength-guide" id="win-distribution-guide">
      Exact probabilities for each final win total, including your matchup overrides.
      Hover to highlight a manager; select a name to isolate their line. Select it again or use Show all to compare everyone.
      Points-for adjustments affect finishing positions, not win totals.
      {showDetailsBelow && " Tap a win total on the graph to see its probabilities below."}
      {season.wins.some(wins => !Number.isInteger(wins)) && " Completed ties count as half a win, as in the standings above."}
    </p>
    <div className="win-distribution-managers" role="group" aria-label="Choose managers to display">
      <button aria-pressed={!selectedTeamId} onClick={() => { setSelectedTeamId(undefined); setHoveredTeamId(undefined); }}>Show all</button>
      {season.teams.map((team, i) => <button key={team.id} aria-label={`Isolate ${team.name}`}
        aria-pressed={selectedTeamId === team.id}
        style={{ "--manager-color": NIGHT_CHART_COLORS[i] } as CSSProperties}
        onMouseEnter={() => setHoveredTeamId(team.id)} onMouseLeave={() => setHoveredTeamId(undefined)}
        onFocus={() => setHoveredTeamId(team.id)} onBlur={() => setHoveredTeamId(undefined)}
        onClick={() => toggle(team.id)}>
        <span className="win-distribution-swatch" aria-hidden="true" />{team.name}
      </button>)}
    </div>
    <div className="win-distribution-chart" aria-describedby="win-distribution-guide">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} accessibilityLayer margin={{ top: 16, right: 24, bottom: 30, left: 12 }}
          onClick={state => {
            if (showDetailsBelow && state?.activeLabel != null) setInspectedWins(Number(state.activeLabel));
          }}>
          <CartesianGrid stroke={NIGHT_COLORS.chartGrid} strokeDasharray="3 5" vertical={false} />
          <XAxis dataKey="wins" type="number" domain={[0, maxWins]} ticks={ticks}
            minTickGap={20} tick={{ fill: NIGHT_COLORS.mutedText }}
            label={{ value: "Final wins", position: "bottom", offset: 12, fill: NIGHT_COLORS.mutedText }} />
          <YAxis width={64} domain={[0, (max: number) => Math.min(1, Math.max(0.1, Math.ceil(max * 10) / 10))]}
            tickFormatter={value => `${Math.round(value * 100)}%`} tick={{ fill: NIGHT_COLORS.mutedText }} />
          <Tooltip trigger={showDetailsBelow ? "click" : "hover"}
            active={showDetailsBelow ? false : undefined}
            labelFormatter={label => `${label} final wins`}
            formatter={(value, name) => [percent(Number(value)), name]}
            itemSorter={item => -Number(item.value)}
            contentStyle={{ background: NIGHT_COLORS.tooltip, borderColor: NIGHT_COLORS.border, color: NIGHT_COLORS.text }} />
          {season.teams.map((team, i) => (!selectedTeamId || selectedTeamId === team.id) && <Line
            key={team.id} name={team.name} dataKey={`team_${team.id}`} type="linear" connectNulls
            stroke={NIGHT_CHART_COLORS[i]} strokeWidth={highlighted === team.id ? 4 : 2}
            strokeOpacity={highlighted && highlighted !== team.id ? 0.2 : 1}
            dot={{ r: highlighted === team.id ? 4 : 2 }} activeDot={{ r: 6 }} isAnimationActive={false}
            onMouseEnter={() => setHoveredTeamId(team.id)} onMouseLeave={() => setHoveredTeamId(undefined)}
            onClick={() => { if (!showDetailsBelow) toggle(team.id); }} />)}
        </LineChart>
      </ResponsiveContainer>
    </div>
    {showDetailsBelow && inspected && <div className="win-distribution-details" role="region" aria-label="Selected win total probabilities">
      <div className="win-distribution-details-heading">
        <strong>{inspected.wins} final wins</strong>
        <button aria-label="Dismiss win total details" onClick={() => setInspectedWins(undefined)}>Close</button>
      </div>
      <dl>{details.map(({ team, i, value }) => <div key={team.id}>
        <dt style={{ color: NIGHT_CHART_COLORS[i] }}>{team.name}</dt><dd>{percent(value)}</dd>
      </div>)}</dl>
      {!details.length && <p>No outcomes at this win total for the selected manager.</p>}
    </div>}
  </section>;
}
