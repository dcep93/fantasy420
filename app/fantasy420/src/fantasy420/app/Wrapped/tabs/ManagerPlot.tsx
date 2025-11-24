import { useState } from "react";
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Helpers, mapDict, selectedWrapped, selectedYear } from "..";

export const colors = Object.values({
  Red: "#E53935",
  Green: "#43A047",
  Blue: "#1E88E5",
  Black: "#000000",
  Cyan: "#00ACC1",
  Magenta: "#D81B60",
  Orange: "#FB8C00",
  Purple: "#8E24AA",
  Lime: "#C0CA33",
  Brown: "#6D4C41",
});

export default function ManagerPlot() {
  return <SubManagerPlot />;
}

function SubManagerPlot() {
  const dataA = mapDict(selectedWrapped().ffTeams, (t) => ({
    t,
    weeks: mapDict(
      mapDict(
        t.rosters,
        (w) => ({
          weekNum: parseInt(w.weekNum),
          opp: selectedWrapped()
            .ffMatchups[w.weekNum]?.find((m) => m.includes(t.id))
            ?.find((id) => id !== t.id),
          total: w.starting
            .map(
              (playerId) =>
                selectedWrapped().nflPlayers[playerId].scores[w.weekNum] || 0
            )
            .reduce((a, b) => a + b, 0),
        }),
        (weekNum) => weekNum !== "0"
      ),
      (o) => o
    ),
  }));
  const cumSum = (rosters: number[]) =>
    rosters.reduce(
      (prev, curr) => prev.concat(prev[prev.length - 1] + curr),
      [0]
    );
  const dataB = mapDict(
    mapDict(dataA, (o) => ({
      ...o,
      weeks: mapDict(o.weeks, (w) => ({
        ...w,
        oppTotal: w.opp === undefined ? 0 : dataA[w.opp].weeks[w.weekNum].total,
      })),
    })),
    (o) => ({
      t: o.t,
      wins: cumSum(
        Object.values(o.weeks).map((w) => (w.total < w.oppTotal ? 0 : 1))
      ),
      pointsFor: cumSum(Object.values(o.weeks).map((w) => w.total)),
      pointsAgainst: cumSum(
        Object.values(o.weeks).map((w) =>
          w.opp === undefined ? 0 : dataA[w.opp].weeks[w.weekNum].total
        )
      ),
    })
  );
  const appendAverage = (data: { [teamId: string]: number }) => ({
    data,
    average:
      Object.values(data).reduce((a, b) => a + b, 0) /
      Object.values(data).length,
  });
  const dataC = Object.values(dataB)[0].wins.map((_, weekIndex) => ({
    weekNum: weekIndex,
    pointsFor: appendAverage(mapDict(dataB, (o) => o.pointsFor[weekIndex])),
    pointsAgainst: appendAverage(
      mapDict(dataB, (o) => o.pointsAgainst[weekIndex])
    ),
  }));
  const dataD: {
    [key: string]: {
      x: number;
      ys: { average: number; data: { [teamId: string]: number } };
    }[];
  } = {
    ...(!selectedWrapped().fantasyCalc?.history.length
      ? {}
      : {
          fantasyCalc: selectedWrapped().fantasyCalc?.history.map((obj) => ({
            x: obj.date,
            ys: {
              average:
                Object.values(obj.values).reduce((a, b) => a + b, 0) /
                Object.keys(obj.values).length,
              data: obj.values,
            },
          })),
        }),
    pointsFor: dataC.map((o) => ({
      x: o.weekNum,
      ys: o.pointsFor,
    })),
    pointsAgainst: dataC.map((o) => ({
      x: o.weekNum,
      ys: o.pointsAgainst,
    })),
  };
  const [selectedTeamId, updateSelectedTeamId] = useState("");
  return (
    <div>
      <div>
        {Object.entries(dataD).map(([key, data]) => {
          var domainData = {
            year: "",
            min: 0,
            range: 0,
          };
          return (
            <div key={key}>
              <h1>
                {key} {data.length}
              </h1>
              <div
                style={{
                  width: "80vW",
                  height: "30em",
                  overflow: "hidden",
                }}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={data.map((o) => ({
                      x: o.x,
                      ...mapDict(o.ys.data, (v) => v - o.ys.average),
                    }))}
                  >
                    {key === "fantasyCalc" ? (
                      <XAxis
                        dataKey={"x"}
                        type={"number"}
                        scale={"time"}
                        domain={[
                          selectedWrapped().fantasyCalc!.history[0].date,
                        ]}
                        tickFormatter={(tick) =>
                          new Date(tick).toLocaleDateString()
                        }
                      />
                    ) : (
                      <XAxis dataKey="x" />
                    )}
                    <YAxis
                      domain={(domain) => {
                        if (domainData.year !== selectedYear) {
                          domainData = {
                            year: selectedYear,
                            min: domain[0],
                            range: domain[1] - domain[0],
                          };
                        }
                        return domain;
                      }}
                      hide
                    />
                    <Tooltip
                      content={({ label, payload, coordinate, viewBox }) => {
                        if (
                          domainData.year !== selectedYear ||
                          label === undefined ||
                          payload!.length === 0
                        )
                          return null;
                        const mappedPayload = payload!
                          .map(({ name, value, dataKey }) => ({
                            name: name!,
                            dataKey: dataKey!,
                            value: value as number,
                          }))
                          .sort((a, b) => b.value - a.value);
                        const cursorValue =
                          domainData.min +
                          domainData.range *
                            (1 -
                              (coordinate!.y! - viewBox!.y!) /
                                viewBox!.height!);
                        const closestTeamId = mappedPayload
                          .map(({ dataKey, value }) => ({
                            dataKey,
                            value: Math.abs(value - cursorValue),
                          }))
                          .filter((x) => x.value < 30)
                          .sort((a, b) => a.value - b.value)[0]
                          ?.dataKey as string;
                        setTimeout(() => updateSelectedTeamId(closestTeamId));
                        const values = data.find((d) => d.x === label)!.ys.data;
                        return (
                          <div
                            style={{
                              background: "white",
                              border: "1px solid black",
                              padding: "1em",
                              opacity: 0.8,
                            }}
                          >
                            <div style={{ textDecoration: "underline" }}>
                              week{" "}
                              {key === "fantasyCalc"
                                ? Helpers.toFixed(
                                    (label -
                                      selectedWrapped().fantasyCalc!.history[0]
                                        .date) /
                                      (1000 * 60 * 60 * 24 * 7),
                                    4
                                  )
                                : label}
                            </div>
                            <div>
                              {mappedPayload.map((p) => (
                                <div
                                  key={p.dataKey}
                                  style={{
                                    fontWeight:
                                      p.dataKey === closestTeamId
                                        ? "bold"
                                        : undefined,
                                  }}
                                >
                                  {key === "fantasyCalc" ? (
                                    values[p.dataKey].toFixed(2)
                                  ) : (
                                    <>
                                      {values[p.dataKey].toFixed(2)}: (
                                      {dataB[p.dataKey].wins[label]})
                                    </>
                                  )}{" "}
                                  {selectedWrapped().ffTeams[p.name].name}
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      }}
                    />
                    {Object.values(selectedWrapped().ffTeams).map(
                      (t, index) => (
                        <Line
                          key={t.id}
                          type="linear"
                          dataKey={t.id}
                          stroke={colors[index]}
                          isAnimationActive={false}
                          strokeWidth={t.id === selectedTeamId ? 10 : undefined}
                        />
                      )
                    )}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
