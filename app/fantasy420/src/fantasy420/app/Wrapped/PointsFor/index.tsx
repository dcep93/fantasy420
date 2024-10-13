import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Helpers, mapDict, selectedWrapped, selectedYear } from "..";

const colors = Object.values({
  Red: "#FF0000",
  Green: "#00FF00",
  Blue: "#0000FF",
  Black: "#000000",
  Cyan: "#00FFFF",
  Magenta: "#FF00FF",
  Orange: "#FFA500",
  Purple: "#800080",
  Lime: "#00FF00",
  Pink: "#FFC0CB",
});

export default function PointsFor() {
  const totals = mapDict(selectedWrapped().ffTeams, (t) => ({
    t,
    rosters: mapDict(
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
  const reduce = (rosters: number[]) =>
    rosters.reduce(
      (prev, curr) => prev.concat(prev[prev.length - 1] + curr),
      [0]
    );
  const raw = mapDict(totals, (t) => ({
    opps: reduce(
      Object.values(t.rosters).map(
        ({ weekNum, opp }) => totals[opp!]!.rosters[weekNum].total
      )
    ),
    points: reduce(Object.values(t.rosters).map(({ total }) => total)),
    wins: Object.values(t.rosters)
      .map((w) => w.total > totals[w.opp!]?.rosters[w.weekNum].total)
      .reduce(
        (prev, curr) => prev.concat(prev[prev.length - 1] + (curr ? 1 : 0)),
        [0]
      ),
  }));
  const predata = Object.keys(
    Object.values(selectedWrapped().ffTeams)[0].rosters
  )
    .map((weekNum) => parseInt(weekNum))
    .map((weekNum) => ({
      weekNum,
      points: Object.values(raw).map(({ points }) => points[weekNum]),
      opps: Object.values(raw).map(({ opps }) => opps[weekNum]),
    }))
    .map(({ weekNum, points, opps }) => ({
      weekNum,
      average: points.reduce((a, b) => a + b, 0) / points.length,
      averageOpps: opps.reduce((a, b) => a + b, 0) / opps.length,
    }));
  const allData = {
    pointsFor: predata.map(({ weekNum, average }) => ({
      weekNum,
      average,
      ...mapDict(
        selectedWrapped().ffTeams,
        (t) => raw[t.id].points[weekNum] - average
      ),
    })),
    pointsAgainst: predata.map(({ weekNum, averageOpps }) => ({
      weekNum,
      average: averageOpps,
      ...mapDict(
        selectedWrapped().ffTeams,
        (t) => raw[t.id].opps[weekNum] - averageOpps
      ),
    })),
  };
  return (
    <div>
      <div>
        {Object.entries(allData).map(([key, data]) => {
          var domainData = {
            // useState makes the bubbles
            // disappear, perhaps because
            // the component is rerendered
            year: "",
            min: 0,
            range: 0,
          };
          return (
            <div key={key}>
              <h1>{key}</h1>
              <div style={{ width: "80em", height: "30em" }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data}>
                    <XAxis dataKey="weekNum" />
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
                            name,
                            dataKey,
                            value: value as number,
                          }))
                          .sort((a, b) => b.value - a.value);
                        const cursorValue =
                          domainData.min +
                          domainData.range *
                            (1 -
                              (coordinate!.y! - viewBox!.y!) /
                                viewBox!.height!);
                        const minDistanceKey = mappedPayload
                          .map(({ dataKey, value }) => ({
                            dataKey,
                            value: Math.abs(value - cursorValue),
                          }))
                          .sort((a, b) => a.value - b.value)[0].dataKey;
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
                              week {label} avg:{" "}
                              {Helpers.toFixed(
                                data.find((d) => d.weekNum === label)!.average
                              )}
                            </div>
                            <div>
                              {mappedPayload.map((p) => (
                                <div
                                  key={p.dataKey}
                                  style={{
                                    fontWeight:
                                      p.dataKey === minDistanceKey
                                        ? "bold"
                                        : undefined,
                                  }}
                                >
                                  {Helpers.toFixed(p.value as number)}: (
                                  {raw[p.dataKey!].wins[label]}) (
                                  {Helpers.toFixed(
                                    totals[p.dataKey!].rosters[label].total
                                  )}
                                  ) {p.name}
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
                          type="monotone"
                          dataKey={t.id}
                          stroke={colors[index]}
                          name={t.name}
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
      <div>
        <h1>fantasyCalc</h1>
        <div style={{ width: "80em", height: "30em" }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={selectedWrapped().fantasyCalc.history.map((obj) => ({
                date: new Date(obj.date).toLocaleDateString(),
                x: obj.date,
                ...obj.values,
              }))}
            >
              <XAxis
                dataKey={"x"}
                type={"number"}
                scale={"time"}
                domain={[selectedWrapped().fantasyCalc.history[0].date]}
                tickFormatter={(tick) => new Date(tick).toLocaleDateString()}
              />
              <YAxis domain={[200, 600]} />
              <Tooltip />
              {Object.values(selectedWrapped().ffTeams).map((t, index) => (
                <Line
                  key={t.id}
                  type="monotone"
                  dataKey={t.id}
                  stroke={colors[index]}
                  name={t.name}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
