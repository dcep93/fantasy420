import {
  Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from "recharts";
import { selectedWrapped } from "..";
import { NIGHT_CHART_COLORS, NIGHT_COLORS } from "../../theme";
import { getBestByPosition, STARTER_POSITIONS } from "./bestByPositionData";

export default function BestByPosition() {
  const wrapped = selectedWrapped();
  return (
    <div style={{ padding: "0.75em", display: "grid", gap: "1em" }}>
      <p style={{ margin: 0, color: NIGHT_COLORS.mutedText }}>
        Total fantasy points from scored starts, through{" "}
        {wrapped.latestScoringPeriod === undefined
          ? "all recorded weeks"
          : `week ${wrapped.latestScoringPeriod}`}. Expand a manager to see each player and week.
      </p>
      {STARTER_POSITIONS.map((position) => {
        const data = getBestByPosition(wrapped, position).map((team, index) => ({
          ...team, label: `${index + 1}. ${team.name}`,
          color: NIGHT_CHART_COLORS[team.colorIndex % NIGHT_CHART_COLORS.length],
        }));
        return (
          <section key={position} aria-label={`${position} starter points`} style={{
            padding: "1em", border: `1px solid ${NIGHT_COLORS.border}`,
            borderRadius: "1em", background: NIGHT_COLORS.surface, minWidth: 0,
          }}>
            <h2 style={{ margin: "0 0 0.5em" }}>{position}</h2>
            {data.length === 0 ? <p>No scored starts for {position} yet.</p> : <>
              <div style={{ overflowX: "auto" }}>
                <div style={{ minWidth: 620, height: data.length * 42 + 65 }}
                  role="img" aria-label={`${position} managers ranked by total starter points; exact totals and breakdowns follow.`}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} layout="vertical" margin={{ top: 8, right: 80, bottom: 24, left: 8 }}>
                      <CartesianGrid stroke={NIGHT_COLORS.chartGrid} strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" stroke={NIGHT_COLORS.mutedText}
                        label={{ value: "Total starter fantasy points", position: "bottom", fill: NIGHT_COLORS.mutedText }} />
                      <YAxis type="category" dataKey="label" width={175} interval={0}
                        tick={{ fill: NIGHT_COLORS.text, fontSize: 12 }} tickLine={false} />
                      <Tooltip cursor={{ fill: NIGHT_COLORS.surfaceAlt }}
                        contentStyle={{ background: NIGHT_COLORS.tooltip, borderColor: NIGHT_COLORS.border, color: NIGHT_COLORS.text }}
                        formatter={(value: number) => [value.toFixed(2), "Starter points"]} />
                      <Bar dataKey="total" name="Starter points" barSize={24} isAnimationActive={false}>
                        {data.map((team) => <Cell key={team.id} fill={team.color} />)}
                        <LabelList dataKey="total" position="right" fill={NIGHT_COLORS.text}
                          formatter={(value: number) => value.toFixed(2)} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div style={{ display: "grid", gap: "0.4em" }}>
                {data.map((team) => (
                  <details key={team.id} style={{ borderTop: `1px solid ${NIGHT_COLORS.border}`, paddingTop: "0.4em" }}>
                    <summary style={{ cursor: "pointer", color: team.color }}>
                      {team.label} — {team.total.toFixed(2)} points ({team.starts.length} scored starts)
                    </summary>
                    <div style={{ overflowX: "auto" }}>
                      {team.starts.length === 0 ? <p>No scored starts for {position} yet.</p> : <table style={{ width: "100%", textAlign: "left", borderSpacing: "0.75em 0.4em" }}>
                        <caption style={{ textAlign: "left", padding: "0.5em" }}>{team.name} — {position} scoring breakdown</caption>
                        <thead><tr><th scope="col">Week</th><th scope="col">Player</th><th scope="col">Opponent</th><th scope="col">Points</th></tr></thead>
                        <tbody>{team.starts.map((start, index) => (
                          <tr key={`${start.week}-${start.playerId}-${index}`}>
                            <td>{start.week}</td><td>{start.playerName}</td>
                            <td>{start.opponent ?? "—"}</td><td>{start.score.toFixed(2)}</td>
                          </tr>
                        ))}</tbody>
                      </table>}
                    </div>
                  </details>
                ))}
              </div>
            </>}
          </section>
        );
      })}
    </div>
  );
}
