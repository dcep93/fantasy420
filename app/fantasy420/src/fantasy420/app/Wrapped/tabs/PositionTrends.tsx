import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { bubbleStyle, groupByF, selectedYear } from "..";
import { usePlayerStats } from "./PlayerStats/usePlayerStats";
import LoadStatus from "./PlayerStats/LoadStatus";
import { NIGHT_CHART_COLORS } from "../../theme";

const POSITION_COLORS: Record<string, string> = {
  QB: NIGHT_CHART_COLORS[0],
  WR: NIGHT_CHART_COLORS[1],
  RB: NIGHT_CHART_COLORS[2],
};

export default function PositionTrends() {
  const stats = usePlayerStats();
  const playerStatsData = stats.data.map(player => ({ ...player,
    years: player.years.filter(year => selectedYear === "all" || String(year.year) === selectedYear),
  }));
  const coverage = [...new Set(playerStatsData.flatMap(player => player.years.map(year => year.year)))].sort((a,b)=>a-b);
  return (
    <div>
      <LoadStatus {...stats} />
      <p>{selectedYear === "all" ? `All years · NFL position history ${coverage[0] ?? ""}–${coverage.at(-1) ?? ""}. Pooled weekly averages use all nonzero recorded player scores.` : `Position history · ${selectedYear}`}</p>
      {Object.entries(
        groupByF(
          playerStatsData.flatMap((p) => p.years.map((y) => ({ p, y }))),
          (o) => selectedYear === "all" ? "all" : o.y.year.toString()
        )
      )
        .map(([year, yearPlayers]) => ({
          year,
          weeks: Object.entries(
            groupByF(
              yearPlayers.flatMap((o) =>
                o.p.years
                  .find((y) => y.year === o.y.year)!
                  .scores.map((s, wMinusOne) => ({
                    s,
                    w: wMinusOne + 1,
                    position: o.p.position,
                  }))
              ),
              (o) => o.w.toString()
            )
          )
            .map(([w, os]) => ({
              x: parseInt(w),
              ys: Object.entries(groupByF(os, (o) => o.position)).map(
                ([position, oos]) => ({
                  position,
                  scores: oos.map((ooo) => ooo.s!).filter(Boolean),
                })
              ),
            }))
            .sort((a, b) => a.x - b.x),
        }))
        .sort((a, b) => b.year.localeCompare(a.year))
        .map((o) => (
          <div key={o.year}>
            <div style={bubbleStyle}>
              <h2>{o.year === "all" ? "All years combined by week number" : o.year}</h2>
              <div style={{ display: "flex" }}>
                {[true, false].map((key, i) => (
                  <div key={i} style={{ width: "700px", height: "500px" }}>
                    <h2>{key ? "avg" : "count"}</h2>
                    <ResponsiveContainer width="80%" height="80%">
                      <LineChart
                        data={o.weeks.map((oo) => ({
                          x: oo.x,
                          ...Object.fromEntries(
                            oo.ys.map(({ position, scores }) => [
                              position,
                              key
                                ? scores.reduce((a, b) => a + b, 0) /
                                  scores.length
                                : scores.length,
                            ])
                          ),
                        }))}
                      >
                        <XAxis dataKey="x" />
                        <YAxis />
                        <Tooltip />
                        {Array.from(
                          new Set(
                            o.weeks.flatMap((w) => w.ys.map((y) => y.position))
                          )
                        )
                          .map((position) => ({
                            position,
                            stroke: POSITION_COLORS[position],
                          }))
                          .filter(({ stroke }) => stroke)
                          .map(({ position, stroke }) => (
                            <Line
                              key={position}
                              type="linear"
                              dataKey={position}
                              stroke={stroke}
                            />
                          ))}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
    </div>
  );
}
