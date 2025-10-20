import { bubbleStyle, Helpers, selectedWrapped } from "..";

export default function StrengthOfSeason() {
  const byTeam = Object.values(selectedWrapped().ffTeams).map((team) => ({
    ...team,
    matchups: Object.entries(selectedWrapped().ffMatchups)
      .map(([weekNum, matchups]) => ({
        weekNum,
        teamIds: matchups
          .find((m) => m.includes(team.id))!
          .slice()
          .sort((a, b) => (a !== team.id ? 1 : -1)),
      }))
      .concat({ weekNum: "14", teamIds: [team.id, ""] })
      .map((obj) => ({
        ...obj,
        byes: obj.teamIds
          .filter((teamId) => teamId !== "")
          .map((teamId) => selectedWrapped().ffTeams[teamId!].rosters)
          .map((rosters) => rosters[obj.weekNum] || rosters["0"])
          .map((weekRoster) =>
            weekRoster.rostered.map(
              (playerId) => selectedWrapped().nflPlayers[playerId]
            )
          )
          .map((byePlayers, ffTeamIndex) =>
            byePlayers
              .filter(
                (byePlayer) =>
                  selectedWrapped().nflTeams[byePlayer.nflTeamId].byeWeek ===
                  parseInt(obj.weekNum)
              )
              .map((byePlayer) => ({
                name: byePlayer.name,
                score: byePlayer.scores[obj.weekNum],
                rawValue:
                  selectedWrapped().fantasyCalc?.players[byePlayer.id] || 0,
              }))
              .sort((a, b) => b.rawValue - a.rawValue)
              .map(({ rawValue, ...obj }) => ({
                ...obj,
                value: rawValue * (ffTeamIndex === 0 ? 1 : -1),
              }))
          ),
      })),
  }));
  const teamToTotal = Object.fromEntries(
    byTeam
      .map((team) => ({
        team,
        weeklyZ: Object.fromEntries(
          team.matchups.map((matchup) => [
            matchup.weekNum,
            selectedWrapped()
              .ffTeams[matchup.teamIds[0]].rosters[
                matchup.weekNum
              ]?.starting.map(
                (playerId) =>
                  selectedWrapped().nflPlayers[playerId].scores[matchup.weekNum]
              )
              .reduce((a, b) => a + b, 0),
          ])
        ),
        weeklyA: Object.fromEntries(
          team.matchups.map((matchup) => [
            matchup.weekNum,
            matchup.byes[0]
              .map((byePlayer) => byePlayer.value)
              .reduce((a, b) => a + b, 0),
          ])
        ),
      }))
      .map((o) => ({
        ...o,
        total: Helpers.toFixed(
          Object.values(o.weeklyA).reduce((a, b) => a + b)
        ),
      }))
      .map((o) => ({
        ...o,
        weeklyB: Object.fromEntries(
          Object.entries(o.weeklyA).map(([weekNum, weeklyAA]) => [
            weekNum,
            Helpers.toFixed(o.total - weeklyAA),
          ])
        ),
      }))
      .map((o) => [o.team.id, o])
  );
  return (
    <div>
      {byTeam
        .map((team) => ({
          team,
          gfo: -Helpers.toFixed(
            team.matchups
              .filter((matchup) => matchup.byes[1])
              .flatMap((matchup) =>
                matchup.byes[1].map((byePlayer) => byePlayer.value)
              )
              .reduce((a, b) => a + b)
          ),
          oppValue: Helpers.toFixed(
            ((values) => values.reduce((a, b) => a + b, 0) / values.length)(
              team.matchups
                .filter((m) => m.teamIds[1] !== "")
                .map(
                  (m) =>
                    teamToTotal[m.teamIds.find((id) => id !== team.id)!]
                      ?.weeklyB[m.weekNum]
                )
            )
          ),
        }))
        .sort((a, b) => a.oppValue - b.oppValue)
        .map(({ team, gfo, oppValue }, i) => (
          <div
            key={team.id}
            style={{
              border: "2px solid black",
              borderRadius: "20px",
              margin: "20px",
              padding: "20px",
            }}
          >
            <div>
              {i + 1}
              {")"} team: {team.name}
            </div>
            <div>team value: {teamToTotal[team.id].total}</div>
            <div>opponent value: {oppValue}</div>
            <div>bye gifts from opps: {gfo}</div>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "flex-start",
              }}
            >
              {team.matchups
                .map((obj) => ({
                  ...obj,
                  scores:
                    obj.teamIds[1] === ""
                      ? undefined
                      : obj.teamIds
                          .map((teamId) => ({
                            teamId,
                            weeklyZ: teamToTotal[teamId].weeklyZ[obj.weekNum],
                          }))
                          .map((o) =>
                            o.weeklyZ
                              ? o.weeklyZ
                              : teamToTotal[o.teamId].weeklyB[obj.weekNum]
                          ),
                }))
                .map((obj) => (
                  <div
                    key={obj.weekNum}
                    style={{
                      ...bubbleStyle,
                      backgroundColor:
                        obj.scores === undefined
                          ? undefined
                          : obj.scores[0] > obj.scores[1]
                          ? "lightgreen"
                          : "pink",
                    }}
                  >
                    <h3>
                      <div>week {obj.weekNum}</div>
                      <div>
                        {teamToTotal[team.id]?.weeklyB[obj.weekNum]} vs{" "}
                        {teamToTotal[obj.teamIds[1]]?.weeklyB[obj.weekNum]}
                      </div>
                      <div>
                        {selectedWrapped().ffTeams[obj.teamIds[1]!]?.name}
                      </div>
                    </h3>
                    {obj.byes.flatMap((ffTeam) =>
                      ffTeam.map((byePlayer) => (
                        <table key={byePlayer.name}>
                          <tbody>
                            <tr style={{ marginRight: "10em" }}>
                              <td>{byePlayer.value.toFixed(2)}</td>
                              <td>{byePlayer.name}</td>
                            </tr>
                          </tbody>
                        </table>
                      ))
                    )}
                  </div>
                ))}
            </div>
          </div>
        ))}
    </div>
  );
}
