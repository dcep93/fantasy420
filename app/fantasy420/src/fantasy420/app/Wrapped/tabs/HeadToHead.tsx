import { bubbleStyle, groupByF, newManagers, selectedWrapped } from "..";
import allWrapped from "../allWrapped";

export default function HeadToHead() {
  return Object.values(selectedWrapped().ffTeams)
    .map((t) => ({
      t,
      allMatchups: Object.entries(allWrapped)
        .flatMap(([year, oldWrapped]) =>
          Object.entries(oldWrapped.ffMatchups).map(([weekNum, matchups]) => ({
            year,
            weekNum,
            opponent: matchups
              .find((teamIds) => teamIds.includes(t.id))!
              .find((teamId) => teamId !== t.id)!,
          }))
        )
        .filter((m) => allWrapped[m.year].ffTeams[t.id])
        .filter((m) => !(m.year < newManagers[t.id]?.slice().reverse()[0]))
        .filter(
          (m) => !(m.year < newManagers[m.opponent]?.slice().reverse()[0])
        )
        .map((obj) => ({
          ...obj,
          myTotal: (
            allWrapped[obj.year].ffTeams[t.id].rosters[obj.weekNum]?.starting ||
            []
          )
            .map(
              (playerId) =>
                allWrapped[obj.year].nflPlayers[playerId].scores[obj.weekNum] ||
                0
            )
            .reduce((a, b) => a + b, 0),
          oppTotal: (
            allWrapped[obj.year].ffTeams[obj.opponent].rosters[obj.weekNum]
              ?.starting || []
          )
            .map(
              (playerId) =>
                allWrapped[obj.year].nflPlayers[playerId].scores[obj.weekNum] ||
                0
            )
            .reduce((a, b) => a + b, 0),
        }))
        .filter(({ myTotal }) => myTotal > 0),
    }))
    .map((obj) => ({
      ...obj,
      wins: obj.allMatchups.filter((m) => m.myTotal > m.oppTotal).length,
    }))
    .map((obj) => ({
      ...obj,
      ratio: obj.wins / obj.allMatchups.length,
    }))
    .sort((a, b) => b.ratio - a.ratio)
    .map((obj) => (
      <div key={obj.t.id}>
        <div style={bubbleStyle}>
          <h1>: {obj.t.name}</h1>
          <h3>
            wins: {obj.wins}/{obj.allMatchups.length} = {obj.ratio.toFixed(4)}{" "}
            .. PF-PA:{" "}
            {obj.allMatchups
              .map((m) => m.myTotal)
              .reduce((a, b) => a + b, 0)
              .toFixed(2)}
            -
            {obj.allMatchups
              .map((m) => m.oppTotal)
              .reduce((a, b) => a + b, 0)
              .toFixed(2)}
          </h3>
          <div>
            {Object.entries(groupByF(obj.allMatchups, (m) => m.opponent)).map(
              ([oppId, ms]) => (
                <div
                  key={oppId}
                  title={ms
                    .map(
                      (m) =>
                        `${m.year} w${m.weekNum} ${m.myTotal.toFixed(
                          2
                        )}-${m.oppTotal.toFixed(2)}`
                    )
                    .join("\n")}
                >
                  {ms.filter((m) => m.myTotal > m.oppTotal).length}/{ms.length}{" "}
                  ..{" "}
                  {ms
                    .map((m) => m.myTotal)
                    .reduce((a, b) => a + b, 0)
                    .toFixed(2)}
                  -
                  {ms
                    .map((m) => m.oppTotal)
                    .reduce((a, b) => a + b, 0)
                    .toFixed(2)}{" "}
                  .. {selectedWrapped().ffTeams[oppId].name}
                </div>
              )
            )}
          </div>
        </div>
      </div>
    ));
}
