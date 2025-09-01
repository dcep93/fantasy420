import { bubbleStyle, selectedWrapped } from "..";

export default function ConsistentlyAverage() {
  return (
    <div>
      <div>
        <div>
          how many wins would each manager have if every player scored X, where
          X is their mean score on the season
        </div>
        <div style={bubbleStyle}>
          {Object.values(selectedWrapped().ffTeams)
            .map((t) => ({
              t,
              advantages: Object.entries(selectedWrapped().ffMatchups)
                .filter(
                  ([weekNum]) =>
                    selectedWrapped().ffTeams[t.id].rosters[weekNum]
                )
                .map(([weekNum, teamIds]) =>
                  teamIds
                    .find((teamIds) => teamIds.includes(t.id))!
                    .sort((a, b) => (a === t.id ? 1 : -1))
                    .map((teamId) =>
                      selectedWrapped()
                        .ffTeams[teamId].rosters[weekNum].starting.map(
                          (playerId) =>
                            selectedWrapped().nflPlayers[playerId].average
                        )
                        .reduce((a, b) => a + b, 0)
                    )
                )
                .map((scores) => scores[1] - scores[0]),
            }))
            .map((o) => ({
              ...o,
              wins: o.advantages.filter((a) => a > 0).length,
            }))
            .sort((a, b) => b.wins - a.wins)
            .map((o) => (
              <div key={o.t.id}>
                <div>
                  {o.wins} {o.t.name}
                </div>
              </div>
            ))}
        </div>
      </div>
      <div>
        <div>...thus far week on week</div>
        <div style={bubbleStyle}>
          {Object.values(selectedWrapped().ffTeams)
            .map((t) => ({
              t,
              advantages: Object.entries(selectedWrapped().ffMatchups)
                .filter(
                  ([weekNum]) =>
                    selectedWrapped().ffTeams[t.id].rosters[weekNum]
                )
                .map(([weekNum, teamIds]) =>
                  teamIds
                    .find((teamIds) => teamIds.includes(t.id))!
                    .sort((a, b) => (a === t.id ? 1 : -1))
                    .map((teamId) =>
                      selectedWrapped()
                        .ffTeams[teamId].rosters[weekNum].starting.map(
                          (playerId) =>
                            Object.entries(
                              selectedWrapped().nflPlayers[playerId].scores
                            )
                              .filter(
                                ([iWeekNum, _]) =>
                                  iWeekNum !== "0" &&
                                  parseInt(iWeekNum) <= parseInt(weekNum)
                              )
                              .map(([_, score]) => score)
                        )
                        .map(
                          (scores) =>
                            scores.reduce((a, b) => a + b, 0) / scores.length
                        )
                        .reduce((a, b) => a + b, 0)
                    )
                )
                .map((scores) => scores[1] - scores[0]),
            }))
            .map((o) => ({
              ...o,
              wins: o.advantages.filter((a) => a > 0).length,
            }))
            .sort((a, b) => b.wins - a.wins)
            .map((o) => (
              <div key={o.t.id}>
                <div>
                  {o.wins} {o.t.name}
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
