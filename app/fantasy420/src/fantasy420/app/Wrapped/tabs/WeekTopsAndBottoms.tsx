import { bubbleStyle, Helpers, selectedWrapped } from "..";

export default function WeekTopsAndBottoms() {
  const counts = Object.fromEntries(
    Object.values(selectedWrapped().ffTeams).map((p) => [
      p.id,
      { ...p, tops: [] as string[], bottoms: [] as string[] },
    ])
  );
  const vals = Object.keys(Object.values(selectedWrapped().ffTeams)[0].rosters)
    .filter((weekNum) => weekNum !== "0")
    .map((weekNum) => {
      const sortedTeams = Helpers.sortByKey(
        Object.values(selectedWrapped().ffTeams)
          .filter((team) => team.rosters[weekNum])
          .map((team) => ({
            ...team,
            score: team.rosters[weekNum].starting
              .map(
                (playerId) =>
                  selectedWrapped().nflPlayers[playerId].scores[weekNum] || 0
              )
              .reduce((a, b) => a + b, 0),
          })),
        (team) => -team.score
      );
      if (sortedTeams.length === 0) return undefined;
      if (sortedTeams[0].score === 0) return undefined;
      const winnerAndLoser = {
        loser: sortedTeams[sortedTeams.length - 1],
        winner: sortedTeams[0],
        weekNum,
      };
      counts[winnerAndLoser.winner.id].tops.push(weekNum);
      counts[winnerAndLoser.loser.id].bottoms.push(weekNum);
      return winnerAndLoser;
    })
    .filter((v) => v !== undefined)
    .map((v) => v!);
  return (
    <div>
      <div>
        <table style={bubbleStyle}>
          <thead>
            <tr>
              <td></td>
              <td>tops</td>
              <td>bottoms</td>
            </tr>
          </thead>
          <tbody>
            {Object.values(counts).map((p, i) => (
              <tr key={i}>
                <td>
                  <b>{p.name}</b>
                </td>
                <td>{p.tops.join(",")}</td>
                <td>{p.bottoms.join(",")}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div>
          <div style={bubbleStyle}>
            {vals.map((o, i) => (
              <div key={i}>
                week {o.weekNum}: top score {o.winner.score.toFixed(2)}:{" "}
                <b>{o.winner.name}</b>
              </div>
            ))}
          </div>
        </div>
        <div>
          <div style={bubbleStyle}>
            {vals.map((o, i) => (
              <div key={i}>
                week {o.weekNum}: bottom score {o.loser.score.toFixed(2)}{" "}
                <b>{o.loser.name}</b>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
