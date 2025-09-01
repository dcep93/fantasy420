import { bubbleStyle, Helpers, selectedWrapped } from "..";

export default function ChosenWrong() {
  return (
    <div>
      {Object.entries(selectedWrapped().ffMatchups)
        .map(([weekNum, matchups]) => ({ weekNum, matchups }))
        .filter(
          ({ weekNum }) =>
            Object.values(selectedWrapped().ffTeams)[0].rosters[weekNum]
        )
        .flatMap(({ weekNum, matchups }) =>
          matchups.map((matchup) => ({
            weekNum,
            teams: matchup
              .map((m) => (m === null ? null : selectedWrapped().ffTeams[m]))
              .filter((team) => team?.rosters[weekNum])
              .map((team) => team!)
              .map((team) => ({
                ...team,
                score: team.rosters[weekNum].starting
                  .map(
                    (playerId) =>
                      selectedWrapped().nflPlayers[playerId].scores[weekNum] ||
                      0
                  )
                  .reduce((a, b) => a + b, 0),
                ideal: Helpers.getIdeal(
                  team.rosters[weekNum].rostered,
                  team.rosters[weekNum].starting,
                  weekNum
                ),
              }))
              .map((team) => ({
                ...team,
                idealScore: Helpers.toFixed(
                  team.ideal
                    .map(
                      (playerId) =>
                        selectedWrapped().nflPlayers[playerId].scores[
                          weekNum
                        ] || 0
                    )
                    .reduce((a, b) => a + b, 0)
                ),
              }))
              .map((team) => ({
                ...team,
                text: `[${team.name}] ${Helpers.toFixed(team.score)} -> ${
                  team.idealScore
                }`,
              }))
              .sort((a, b) => a.score - b.score),
          }))
        )
        .filter(
          (matchup) => matchup.teams[0].idealScore > matchup.teams[1].score
        )
        .map((matchup, i) => (
          <div key={i}>
            <div style={bubbleStyle}>
              <div>week {matchup.weekNum}</div>
              <div>{matchup.teams[0].text}</div>
              <div>would have beaten</div>
              <div>{matchup.teams[1].text}</div>
              <div>if they had started</div>
              <div>---</div>
              <div>
                {matchup.teams[0].ideal
                  .filter(
                    (playerId) =>
                      !matchup.teams[0].rosters[
                        matchup.weekNum
                      ].starting.includes(playerId)
                  )
                  .map((playerId) => selectedWrapped().nflPlayers[playerId])
                  .map((player) => (
                    <div key={player.id}>
                      {player.name} {player.scores[matchup.weekNum]}
                    </div>
                  ))}
              </div>
              <div>---</div>
              <div>instead of</div>
              <div>---</div>
              <div>
                {matchup.teams[0].rosters[matchup.weekNum].starting
                  .filter(
                    (playerId) => !matchup.teams[0].ideal.includes(playerId)
                  )
                  .map((playerId) => selectedWrapped().nflPlayers[playerId])
                  .map((player) => (
                    <div key={player.id}>
                      {player.name} {player.scores[matchup.weekNum]}
                    </div>
                  ))}
              </div>
            </div>
          </div>
        ))}
    </div>
  );
}
