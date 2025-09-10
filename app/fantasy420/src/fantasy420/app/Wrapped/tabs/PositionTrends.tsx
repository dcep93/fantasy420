import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { bubbleStyle, clog, groupByF } from "..";
import { POSITION_COLORS } from "../../Draft";
import { playerStatsData } from "./PlayerStats";

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
                  avg: (({ scores }) =>
                    scores.reduce((a, b) => a + b, 0) / scores.length)({
                    scores: oos.map((ooo) => ooo.s!).filter(Boolean),
                  }),
                })
              ),
            }))
            .sort((a, b) => a.x - b.x),
        }))
        .sort((a, b) => b.year - a.year)
        .filter(({ year }) => year === 2024)
        .map(clog)
        .map((o) => (
          <div key={o.year}>
            <div style={bubbleStyle}>
              <h1>{o.year}</h1>
              <div>
                <ResponsiveContainer width="80%" height="100%">
                  <LineChart data={o.weeks}>
                    <XAxis dataKey="x" />
                    <YAxis />
                    <Tooltip
                    //   content={({ label, payload, coordinate, viewBox }) => {
                    //     if (
                    //       domainData.year !== selectedYear ||
                    //       label === undefined ||
                    //       payload!.length === 0
                    //     )
                    //       return null;
                    //     const mappedPayload = payload!
                    //       .map(({ name, value, dataKey }) => ({
                    //         name: name!,
                    //         dataKey: dataKey!,
                    //         value: value as number,
                    //       }))
                    //       .sort((a, b) => b.value - a.value);
                    //     const cursorValue =
                    //       domainData.min +
                    //       domainData.range *
                    //         (1 -
                    //           (coordinate!.y! - viewBox!.y!) /
                    //             viewBox!.height!);
                    //     const closestTeamId = mappedPayload
                    //       .map(({ dataKey, value }) => ({
                    //         dataKey,
                    //         value: Math.abs(value - cursorValue),
                    //       }))
                    //       .sort((a, b) => a.value - b.value)[0]
                    //       .dataKey as string;
                    //     setTimeout(() => updateSelectedTeamId(closestTeamId));
                    //     const values = data.find((d) => d.x === label)!.ys.data;
                    //     return (
                    //       <div
                    //         style={{
                    //           background: "white",
                    //           border: "1px solid black",
                    //           padding: "1em",
                    //           opacity: 0.8,
                    //         }}
                    //       >
                    //         <div style={{ textDecoration: "underline" }}>
                    //           week{" "}
                    //           {key === "fantasyCalc"
                    //             ? Helpers.toFixed(
                    //                 (label -
                    //                   selectedWrapped().fantasyCalc.history[0]
                    //                     .date) /
                    //                   (1000 * 60 * 60 * 24 * 7),
                    //                 4
                    //               )
                    //             : label}
                    //         </div>
                    //         <div>
                    //           {mappedPayload.map((p) => (
                    //             <div
                    //               key={p.dataKey}
                    //               style={{
                    //                 fontWeight:
                    //                   p.dataKey === closestTeamId
                    //                     ? "bold"
                    //                     : undefined,
                    //               }}
                    //             >
                    //               {key === "fantasyCalc" ? (
                    //                 values[p.dataKey].toFixed(2)
                    //               ) : (
                    //                 <>
                    //                   {values[p.dataKey].toFixed(2)}: (
                    //                   {dataB[p.dataKey].wins[label]})
                    //                 </>
                    //               )}{" "}
                    //               {selectedWrapped().ffTeams[p.name].name}
                    //             </div>
                    //           ))}
                    //         </div>
                    //       </div>
                    //     );
                    //   }}
                    />
                    {Object.keys(
                      groupByF(
                        o.weeks.flatMap((oo) => oo.ys),
                        (oo) => oo.position
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
            </div>
          </div>
        ))}
    </pre>
  );
}
