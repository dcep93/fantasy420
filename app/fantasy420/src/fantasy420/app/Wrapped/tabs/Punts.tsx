import {
  CartesianGrid,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { clog, groupByF } from "..";
import allWrapped from "../allWrapped";

export default function Punts() {
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
                wrapped.nflTeams[p.obj.opp!]?.name
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
        longest_punt: data.flatMap((d) =>
          d
            .map((p) => ({
              ...p,
              distance: p.obj.punts.sort((a, b) => b.distance - a.distance)[0],
            }))
            .map((p) => ({
              x: p.key,
              y:
                p.obj.punts.map((x) => x.distance).sort((a, b) => b - a)[0] ||
                0,
              label: `${p.label} / ${p.obj.punter} / ${p.obj.punts.map(
                (p) => `${p.distance}->${p.landed}`
              )}`,
            }))
            .map((d) => ({ ...d, label: `${d.y.toFixed(2)} / ${d.label}` }))
        ),
        avg_punt_distance: data.flatMap((d) =>
          d
            .map((p) => ({
              x: p.key,
              y:
                p.obj.punts.length === 0
                  ? 0
                  : p.obj.punts
                      .map((x) => x.distance)
                      .reduce((a, b) => a + b, 0) / p.obj.punts.length,
              label: `${p.label} / ${p.obj.punter} / ${p.obj.punts.map(
                (p) => `${p.distance}->${p.landed}`
              )}`,
            }))
            .map((d) => ({ ...d, label: `${d.y.toFixed(2)} / ${d.label}` }))
        ),
        count: data.flatMap((d) =>
          d
            .map((p) => ({
              x: p.key,
              y: p.obj.punts.length,
              label: `${p.label} / ${p.obj.punter} / ${p.obj.punts.map(
                (p) => `${p.distance}->${p.landed}`
              )}`,
            }))
            .map((d) => ({ ...d, label: `${d.y.toFixed(2)} / ${d.label}` }))
        ),
        both_teams_count: data
          .map((d) =>
            Object.values(
              groupByF(clog(d), (data) =>
                [data.team.id, data.obj.opp].sort().join(",")
              )
            )
          )
          .flatMap((d) =>
            d
              .map((p) => ({
                x: p[0].key,
                y: p
                  .map((pp) => pp.obj.punts.length)
                  .reduce((a, b) => a + b, 0),
                label: `${p.map((pp) => pp.obj.punter)} / ${p[0].label}`,
              }))
              .map((d) => ({ ...d, label: `${d.y} / ${d.label}` }))
          ),
      }).map(([key, d]) => (
        <div key={key}>
          <h3>{key}</h3>
          <ScatterChart width={1200} height={500}>
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
