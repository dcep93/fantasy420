import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { Helpers, mapDict, selectedWrapped } from "..";

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

export default function PerformanceGraph() {
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
        (w) => w.weekNum !== "0"
      ),
      (o) => o
    ),
  }));
  const raw = mapDict(totals, (t) => ({
    opps: Object.values(t.rosters).map((w) => totals[w.opp!]?.t.name),
    points: Object.values(t.rosters).reduce(
      (prev, curr) => prev.concat(prev[prev.length - 1] + curr.total),
      [0]
    ),
    wins: Object.values(t.rosters)
      .map((w) => w.total > totals[w.opp!]?.rosters[w.weekNum].total)
      .reduce(
        (prev, curr) => prev.concat(prev[prev.length - 1] + (curr ? 1 : 0)),
        [0]
      ),
  }));
  const data = Object.keys(Object.values(selectedWrapped().ffTeams)[0].rosters)
    .map((weekNum) => parseInt(weekNum))
    .map((weekNum) => ({
      weekNum,
      points: Object.values(raw).map(({ points }) => points[weekNum]),
    }))
    .map(({ weekNum, points }) => ({
      weekNum,
      average: points.reduce((a, b) => a + b, 0) / points.length,
    }))
    .map(({ weekNum, average }) => ({
      weekNum,
      average,
      ...mapDict(
        selectedWrapped().ffTeams,
        (t) => raw[t.id].points[weekNum] - average
      ),
    }));
  return (
    <div style={{ width: "80em", height: "30em" }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <XAxis dataKey="weekNum" />
          <Tooltip
            content={({ label, payload }) => (
              <div
                style={{
                  background: "white",
                  border: "1px solid black",
                  padding: "1em",
                  opacity: 0.8,
                }}
              >
                <div>
                  week {label} avg:{" "}
                  {data.find((d) => d.weekNum === label)?.average}
                </div>
                <div>
                  {payload!
                    .map(({ name, value, dataKey }) => ({
                      name,
                      dataKey,
                      value: value as number,
                    }))
                    .sort((a, b) => b.value - a.value)
                    .map((p) => (
                      <div key={p.dataKey}>
                        {Helpers.toFixed(p.value as number)}: {p.name}
                      </div>
                    ))}
                </div>
              </div>
            )}
          />
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
  );
}
