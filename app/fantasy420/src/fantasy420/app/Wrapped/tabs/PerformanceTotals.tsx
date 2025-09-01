import { bubbleStyle, selectedWrapped } from "..";
import { FFTeamType, NFLPlayerType } from "../../FetchWrapped";

export default function PerformanceTotals() {
  const fs = {
    starting: (team: FFTeamType, weekNum: string) =>
      team.rosters[weekNum].starting,
    bench: (team: FFTeamType, weekNum: string) =>
      team.rosters[weekNum].rostered.filter(
        (playerId) => !team.rosters[weekNum].starting.includes(playerId)
      ),
  };
  return (
    <div>
      {Object.values(selectedWrapped().ffTeams)
        .map((team) => ({
          team,
          data: Object.fromEntries(
            Object.entries(fs).map(([fName, f]) => [
              fName,
              Object.values(
                Object.keys(team.rosters)
                  .filter((weekNum) => weekNum !== "0")
                  .flatMap((weekNum) =>
                    f(team, weekNum).map((playerId) => ({
                      weekNum,
                      player: selectedWrapped().nflPlayers[playerId],
                    }))
                  )
                  .map((obj) => ({
                    ...obj,
                    score: obj.player?.scores[obj.weekNum] || 0,
                  }))
                  .filter((p) => p.player)
                  .reduce((prev, curr) => {
                    if (!prev[curr.player.id]) {
                      prev[curr.player.id] = {
                        player: curr.player,
                        score: 0,
                        weeks: [],
                      };
                    }
                    prev[curr.player.id].score += curr.score;
                    prev[curr.player.id].weeks.push(curr.weekNum);
                    return prev;
                  }, {} as { [playerId: string]: { player: NFLPlayerType; score: number; weeks: string[] } })
              ).sort((a, b) => b.score - a.score),
            ])
          ),
        }))
        .map(({ team, data }) => (
          <div key={team.id}>
            <div style={bubbleStyle}>
              <h2>{team.name}</h2>
              <div style={{ display: "flex" }}>
                {Object.entries(data).map(([fName, data]) => (
                  <div key={fName} style={bubbleStyle}>
                    <h4>{fName}</h4>
                    <table>
                      <tbody>
                        {data.map((d) => (
                          <tr
                            key={d.player.id}
                            title={d.weeks
                              .map(
                                (weekNum) =>
                                  `${weekNum}: ${d.player.scores[weekNum]}`
                              )
                              .join("\n")}
                          >
                            <td style={{ paddingRight: "3em" }}>
                              {d.score.toFixed(2)}
                            </td>
                            <td>{d.player.name}</td>
                            <td>{d.weeks.join(" ")}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
    </div>
  );
  //     .reduce((prev, curr) => {
  //       if (!prev[curr.playerId]) {
  //         prev[curr.playerId] = {
  //           score: 0,
  //           weeks: [],
  //         };
  //       }
  //       prev[curr.playerId].score += curr.score;
  //       prev[curr.playerId].weeks.push(curr.w);
  //       return prev;
  //     }, {} as { [playerId: string]: { score: number; weeks: string[] } })
  // ).map(([playerId, obj]) => ({
  //   name: `${selectedWrapped().nflPlayers[playerId].name} ${obj.weeks}`,
  //   ...obj,
  // }));
}
