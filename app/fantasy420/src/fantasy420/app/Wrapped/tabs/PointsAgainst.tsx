import { useState } from "react";
import {
  CartesianGrid, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis,
} from "recharts";
import { bubbleStyle, selectedWrapped } from "..";
import { NIGHT_CHART_COLORS, NIGHT_COLORS } from "../../theme";
import { lookupTeamAbbreviation } from "./nflTeamAbbreviations";

export default function PointsAgainst() {
  const [position, updatePosition] = useState("DST");
  const wrapped = selectedWrapped();
  const cutoff = wrapped.latestScoringPeriod ?? Number.POSITIVE_INFINITY;
  const data = Object.values(wrapped.nflTeams)
    .filter((team) => team.name !== "FA")
    .map((team) => {
      const weeks = Object.entries(team.nflGamesByScoringPeriod)
        .filter(([week, game]) => Number(week) > 0 && Number(week) <= cutoff && game?.opp !== undefined)
        .map(([week, game]) => {
          const players = Object.values(wrapped.nflPlayers)
            .filter((player) => player.position === position && player.nflTeamId === game!.opp && Number.isFinite(player.scores[week]))
            .map((player) => ({ ...player, score: player.scores[week] }))
            .sort((a, b) => b.score - a.score);
          return {
            week: Number(week), players,
            opponent: wrapped.nflTeams[game!.opp!]?.name ?? "Unknown opponent",
            score: players.reduce((sum, player) => sum + player.score, 0),
          };
        })
        .filter((week) => week.players.length > 0)
        .sort((a, b) => a.week - b.week);
      const total = weeks.reduce((sum, week) => sum + week.score, 0);
      return { team, weeks, total, games: weeks.length, average: weeks.length ? total / weeks.length : 0 };
    })
    .filter((team) => team.games > 0 && Number.isFinite(team.average))
    .sort((a, b) => b.average - a.average || a.team.name.localeCompare(b.team.name))
    .map((team, index) => ({ ...team, rank: index + 1 }));

  return (
    <div style={{ padding: "0.75em" }}>
      <label style={{ display: "inline-flex", gap: "0.75em", alignItems: "center" }}>
        Opponent position
        <select value={position} onChange={(event) => updatePosition(event.target.value)}>
          {["QB", "RB", "WR", "TE", "K", "DST"].map((value) => <option key={value} value={value}>{value}</option>)}
        </select>
      </label>
      <p style={{ color: NIGHT_COLORS.mutedText }}>
        NFL teams ranked by fantasy points allowed to opposing {position} players per scored game.
        Higher averages mean more points allowed. Games without recorded player scores are excluded.
      </p>
      {data.length === 0 ? <p>No scored games available for {position} yet.</p> : <>
        <div style={{ overflowX: "auto", border: `1px solid ${NIGHT_COLORS.border}`, borderRadius: "1em", background: NIGHT_COLORS.chartCanvas }}>
          <div style={{ minWidth: 1080, height: 530 }} role="img"
            aria-label={`${position} fantasy points allowed per game by NFL team, ranked from highest to lowest. Exact averages and weekly scores follow.`}>
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 85, right: 40, bottom: 40, left: 28 }}>
                <CartesianGrid stroke={NIGHT_COLORS.chartGrid} strokeDasharray="3 3" />
                <XAxis type="number" dataKey="rank" name="Rank" domain={[0, data.length + 1]}
                  ticks={data.map((team) => team.rank)} stroke={NIGHT_COLORS.mutedText} tick={{ fontSize: 11 }}
                  label={{ value: "Rank by points allowed (1 = most)", position: "bottom", offset: 18, fill: NIGHT_COLORS.mutedText }} />
                <YAxis type="number" dataKey="average" name="Average allowed" domain={["auto", "auto"]}
                  stroke={NIGHT_COLORS.mutedText} tickFormatter={(value: number) => value.toFixed(1)}
                  label={{ value: "Points allowed / game", angle: -90, position: "insideLeft", offset: -14, fill: NIGHT_COLORS.mutedText }} />
                <Tooltip cursor={{ stroke: NIGHT_COLORS.mutedText, strokeDasharray: "3 3" }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const point = payload[0].payload as (typeof data)[number];
                    return <div style={{ background: NIGHT_COLORS.tooltip, color: NIGHT_COLORS.text, border: `1px solid ${NIGHT_COLORS.border}`, borderRadius: "0.5em", padding: "0.75em" }}>
                      <strong>#{point.rank} {point.team.name} · vs {position}</strong>
                      <div>Average allowed / game: {point.average.toFixed(2)}</div>
                      <div>Total allowed: {point.total.toFixed(2)}</div>
                      <div>Scored games: {point.games}</div>
                    </div>;
                  }} />
                <Scatter data={data} fill={NIGHT_CHART_COLORS[4]} isAnimationActive={false}
                  shape={(props: unknown) => {
                    const { cx, cy, payload } = props as { cx: number; cy: number; payload: (typeof data)[number] };
                    return (
                    <g>
                      <circle cx={cx} cy={cy} r={6} fill={NIGHT_CHART_COLORS[4]} stroke={NIGHT_COLORS.text} strokeWidth={2} />
                      <text x={cx} y={cy - 14} textAnchor="start" transform={`rotate(-45 ${cx} ${cy - 14})`}
                        fill={NIGHT_COLORS.text} fontSize={12} pointerEvents="none">{lookupTeamAbbreviation(payload.team.name) ?? payload.team.name}</text>
                    </g>
                    );
                  }} />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 340px), 1fr))", marginTop: "1em" }}>
          {data.map((team) => (
            <details key={team.team.id} style={{ ...bubbleStyle, display: "block", minWidth: 0, alignSelf: "start" }}>
              <summary style={{ cursor: "pointer" }}>
                <strong>#{team.rank} {team.team.name}</strong> · {team.average.toFixed(2)} / game
                <div style={{ color: NIGHT_COLORS.mutedText, marginTop: "0.35em" }}>{team.total.toFixed(2)} total · {team.games} scored games</div>
              </summary>
              {team.weeks.map((week) => (
                <div key={week.week} style={{ borderTop: `1px solid ${NIGHT_COLORS.border}`, marginTop: "0.65em", paddingTop: "0.65em" }}>
                  <strong>Week {week.week} vs {week.opponent}: {week.score.toFixed(2)}</strong>
                  {week.players.map((player) => <div key={player.id} style={{ marginTop: "0.3em" }}>
                    {player.name}: {player.score.toFixed(2)}
                    {Number.isFinite(player.average) && <span style={{ color: NIGHT_COLORS.mutedText }}> · season avg {player.average.toFixed(2)}</span>}
                  </div>)}
                </div>
              ))}
            </details>
          ))}
        </div>
      </>}
    </div>
  );
}
