import { mapDict, selectedWrapped } from "..";

const colors = Object.values({
  Red: "#FF0000",
  Green: "#00FF00",
  Blue: "#0000FF",
  Yellow: "#FFFF00",
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
      mapDict(t.rosters, (w) => ({
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
      })),
      (o) => o,
      (o) => o.opp !== undefined
    ),
  }));
  const data = Object.values(totals).map(({ t, rosters }, index) => ({
    // t,
    name: t.name,
    color: colors[index],
    opps: Object.values(rosters).map((w) => totals[w.opp!]!.t.name),
    points: Object.values(rosters).reduce(
      (prev, curr) => prev.concat(prev[prev.length - 1] + curr.total),
      [0]
    ),
    wins: Object.values(rosters)
      .map((w) => w.total > totals[w.opp!].rosters[w.weekNum].total)
      .reduce(
        (prev, curr) => prev.concat(prev[prev.length - 1] + (curr ? 1 : 0)),
        [0]
      ),
  }));
  return <pre>{JSON.stringify(data, null, 2)}</pre>;
}
