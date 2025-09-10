import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { bubbleStyle, groupByF } from "..";
import { playerStatsData } from "./PlayerStats";

const POSITION_COLORS: Record<string, string> = {
  QB: "red",
  WR: "green",
  RB: "blue",
};

export default function PositionTrends() {
  return (
    <pre>
      {Object.entries(
        groupByF(
          playerStatsData.flatMap((p) => p.years.map((y) => ({ p, y }))),
          (o) => o.y.year.toString()
        )
      )
        .map(([year, yearPlayers]) => ({
          year: parseInt(year),
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
        .sort((a, b) => b.year - a.year)
        .map((o) => (
          <div key={o.year}>
            <div style={bubbleStyle}>
              <h1>{o.year}</h1>
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
    </pre>
  );
}
