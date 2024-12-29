import {
  CartesianGrid,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { groupByF } from "..";
import allWrapped from "../allWrapped";

export default function Plays() {
  const data = Object.values(allWrapped).flatMap((wrapped) =>
    Object.values(
      groupByF(
        Object.values(wrapped.nflTeams).flatMap((team) =>
          Object.entries(team.nflGamesByScoringPeriod)
            .map(([weekNum, obj]) => ({
              team,
              weekNum,
              key: `${wrapped.year}.${weekNum}`,
              obj: obj!,
            }))
            .map((p) => ({
              ...p,
              label: `${p.key} / ${p.team.name} vs ${
                wrapped.nflTeams[p.obj.opp].name
              }`,
            }))
        ),
        (obj) => obj.key
      )
    )
  );
  return (
    <div>
      {Object.entries({
        avg_punt_distance: data.flatMap((d) =>
          d
            .map((p) => ({
              x: p.key,
              y: p.obj.punts.reduce((a, b) => a + b, 0) / p.obj.punts.length,
              label: `${p.label} / ${p.obj.punter} / ${p.obj.punts}`,
            }))
            .map((d) => ({ ...d, label: `${d.y.toFixed(2)} / ${d.label}` }))
        ),
        // count: Object.values(groupByF(data, (data) => `${data}`)).flatMap((d) =>
        //   d
        //     .map((p) => ({
        //       x: p.key,
        //       y: p.obj.punts.length,
        //       label: p.label,
        //     }))
        //     .map((d) => ({ ...d, label: `${d.y} / ${d.label}` }))
        // ),
      }).map(([key, d]) => (
        <div key={key}>
          <h3>{key}</h3>
          <ScatterChart width={1200} height={800}>
            <CartesianGrid />
            <XAxis type="category" dataKey="x" />
            <YAxis type="number" dataKey="y" />
            <Scatter
              data={Object.values(groupByF(d, (d) => `${d.x}.${d.y}`)).flatMap(
                (d) => ({ ...d[0], label: d.map((dd) => dd.label).join("\n") })
              )}
            />
            <Tooltip
              content={(data) =>
                !data.active ? null : (
                  <pre style={{ backgroundColor: "white", padding: "5em" }}>
                    {data.payload![0].payload.label}
                  </pre>
                )
              }
            />
          </ScatterChart>
        </div>
      ))}
    </div>
  );
}
