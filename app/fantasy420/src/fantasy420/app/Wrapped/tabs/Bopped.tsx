import { bubbleStyle, Helpers, selectedWrapped } from "..";

export default function Bopped() {
  const managerScores = Object.fromEntries(
    Object.values(selectedWrapped().ffTeams).map((o) => [
      o.id,
      Object.fromEntries(
        Object.values(o.rosters).map((oo) => [
          oo.weekNum,
          oo.starting
            .map((id) => selectedWrapped().nflPlayers[id].scores[oo.weekNum]!)
            .reduce((a, b) => a + b, 0),
        ])
      ),
    ])
  );
  const opponents = Object.fromEntries(
    Object.values(selectedWrapped().ffTeams).map((o) => [
      o.id,
      Object.fromEntries(
        Object.entries(selectedWrapped().ffMatchups).map(
          ([weekNum, matchups]) => [
            weekNum,
            matchups
              .find((matchup) => matchup.includes(o.id))!
              .find((teamId) => teamId !== o.id)!,
          ]
        )
      ),
    ])
  );
  const players = Object.values(selectedWrapped().nflPlayers)
    .map((player) => ({
      ...player,
      best: Object.entries(player.scores)
        .map(([weekNum, score]) => ({ weekNum, score: score || 0 }))
        .filter(({ score }) => score !== 0)
        .filter((o) => selectedWrapped().ffMatchups[o.weekNum] !== undefined)
        .sort((a, b) => b.score - a.score)[0],
    }))
    .filter((player) => player.best !== undefined)
    .filter((player) => player.best.score >= 20)
    .map((player) => ({
      ...player,
      bestOwner: Object.values(selectedWrapped().ffTeams).find((t) =>
        t.rosters[player.best.weekNum]?.rostered.includes(player.id)
      )!,
    }))
    .filter((player) => player.bestOwner !== undefined)
    .map((player) => ({
      ...player,
      bestOpponentId: !selectedWrapped().ffTeams[player.bestOwner.id].rosters[
        player.best.weekNum
      ].starting.includes(player.id)
        ? null
        : opponents[player.bestOwner.id][player.best.weekNum],
    }))
    .map((player) => ({
      ...player,
      key: player.bestOpponentId || player.bestOwner.id,
    }));
  return (
    <div>
      {Object.values(selectedWrapped().ffTeams).map((t) => (
        <div key={t.id}>
          <div style={bubbleStyle}>
            <h2>
              {t.name} [ benched{" "}
              {
                players
                  .filter((player) => player.key === t.id)
                  .filter((player) => player.bestOpponentId === null).length
              }{" "}
              / got bopped{" "}
              {
                players
                  .filter((player) => player.key === t.id)
                  .filter((player) => player.bestOpponentId !== null).length
              }{" "}
              ]
            </h2>
            <table>
              <thead>
                <tr>
                  <td>matchup outcome</td>
                </tr>
              </thead>
              <tbody>
                {players
                  .filter((player) => player.key === t.id)
                  .sort((a, b) => b.best.score - a.best.score)
                  .map((player) => (
                    <tr key={player.id}>
                      <td style={{ float: "right", marginRight: "2em" }}>
                        {Helpers.toFixed(
                          managerScores[t.id][player.best.weekNum] -
                            managerScores[opponents[t.id][player.best.weekNum]][
                              player.best.weekNum
                            ]
                        )}
                      </td>
                      <td>[{player.name}]</td>
                      <td>blew their load for</td>
                      <td>[{player.best.score}]</td>
                      <td style={{ padding: "0 2em" }}>
                        week [{player.best.weekNum}]
                      </td>
                      <>
                        {player.bestOpponentId === null ? (
                          <td>
                            on the bench vs [
                            {
                              selectedWrapped().ffTeams[
                                opponents[player.key][player.best.weekNum]
                              ].name
                            }
                            ]
                          </td>
                        ) : (
                          <>
                            <td>by [{player.bestOwner.name}]</td>
                          </>
                        )}
                      </>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}
