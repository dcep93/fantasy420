import { useState } from "react";
import {
  CartesianGrid,
  LabelList,
  Scatter,
  ScatterChart,
  XAxis,
  YAxis,
} from "recharts";
import { bubbleStyle, clog, Helpers, Position, selectedWrapped } from ".";

export default function PointsAgainst() {
  const [position, updatePosition] = useState(Position[Position.DST] as string);
  const data = Object.values(selectedWrapped().nflTeams)
    .filter((t) => t.name !== "FA")
    .map((t) => ({
      t,
      weeks: Object.entries(t.nflGamesByScoringPeriod)
        .map(([weekNum, o]) => ({
          weekNum,
          o,
        }))
        .filter(({ o }) => o?.opp !== undefined)
        .map((o) => ({
          ...o,
          players: Object.values(selectedWrapped().nflPlayers).filter(
            (p) =>
              p.position === position &&
              p.nflTeamId === o.o!.opp &&
              p.scores[o.weekNum] !== undefined
          ),
        }))
        .map((o) => ({
          ...o,
          score: o.players
            .map((p) => p.scores[o.weekNum]!)
            .reduce((a, b) => a + b, 0),
        })),
    }))
    .map((o) => ({
      ...o,
      scores: o.weeks.map((w) => w.score),
    }))
    .map((o) => ({
      ...o,
      total: Helpers.toFixed(o.scores.reduce((a, b) => a + b, 0)),
    }))
    .sort((a, b) => b.total - a.total);
  return (
    <div>
      <div>
        <ScatterChart width={600} height={400}>
          <CartesianGrid />
          <XAxis type="number" dataKey="x" />
          <YAxis type="number" dataKey="y" />
          <Scatter
            data={data.map((d, i) => ({
              x: i,
              y: d.total,
              label: `${d.t.name} ${d.total}`,
            }))}
          >
            <LabelList
              dataKey="label"
              position="right"
              content={(props) => {
                // return <div style={{ height: "100px" }}>{props.value}</div>;
                const { x, y, value } = clog(props);
                const verticalOffset = -10; // Adjust this value to control vertical spacing
                return (
                  <text
                    x={x}
                    dx={0 * (x as number)}
                    y={(y as number) + verticalOffset}
                    dy={-4}
                    textAnchor="middle"
                    fill="#8884d8"
                    style={{ height: "100px" }}
                  >
                    {value}
                  </text>
                );
              }}
            />
          </Scatter>
        </ScatterChart>
      </div>
      <div>
        <select
          defaultValue={position}
          onChange={(e) => updatePosition(e.target.value)}
        >
          {Object.keys(Position)
            .filter((y) =>
              [Position.DST, Position.QB, Position.RB, Position.TE, Position.WR]
                .map((p) => Position[p])
                .includes(y)
            )
            .map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
        </select>
      </div>
      <div>
        {data.map((o) => (
          <div key={o.t.id} style={bubbleStyle}>
            <div>
              {o.t.name} (tot:{o.total}::avg:
              {Helpers.toFixed(
                o.scores.reduce((a, b) => a + b, 0) / o.scores.length
              )}
              )
            </div>
            <div>
              {o.weeks.map(({ weekNum, players, score }) => (
                <div key={weekNum}>
                  w{weekNum} {Helpers.toFixed(score)}{" "}
                  {players
                    .map((p) => ({ ...p, s: p.scores[weekNum] || 0 }))
                    .sort((a, b) => b.s - a.s)
                    .map(
                      (p) =>
                        `${p.name}:w::${p.s}:avg:${Helpers.toFixed(p.average)}`
                    )
                    .join(" / ")}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
