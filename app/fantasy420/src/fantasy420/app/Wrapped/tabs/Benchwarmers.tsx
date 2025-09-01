import { bubbleStyle, Helpers, selectedWrapped } from "..";

export default function Benchwarmers() {
  const weeks = Object.keys(
    Object.values(selectedWrapped().ffTeams)[0].rosters
  ).filter((weekNum) => weekNum !== "0");
  return (
    <div>
      <div style={bubbleStyle}>
        {weeks
          .flatMap((weekNum) =>
            Object.values(selectedWrapped().ffTeams).map((team) => ({
              teamName: team.name,
              weekNum,
              score: team.rosters[weekNum].rostered
                .filter(
                  (playerId) =>
                    !team.rosters[weekNum].starting.includes(playerId) &&
                    selectedWrapped().nflPlayers[playerId]
                )
                .map(
                  (playerId) =>
                    selectedWrapped().nflPlayers[playerId].scores[weekNum] || 0
                )
                .reduce((a, b) => a + b, 0),
            }))
          )
          .sort((a, b) => b.score - a.score)
          .map((o, i) => (
            <div key={i}>
              [{o.teamName}] bench week {o.weekNum} scored{" "}
              {Helpers.toFixed(o.score)}
            </div>
          ))}
      </div>
      <div style={bubbleStyle}>
        {weeks
          .flatMap((weekNum) =>
            Object.values(selectedWrapped().ffTeams).flatMap((team) =>
              team.rosters[weekNum].rostered
                .filter(
                  (playerId) =>
                    !team.rosters[weekNum].starting.includes(playerId) &&
                    selectedWrapped().nflPlayers[playerId]
                )
                .map((playerId) => ({
                  teamName: team.name,
                  weekNum,
                  player: selectedWrapped().nflPlayers[playerId],
                }))
            )
          )
          .map((o) => ({ ...o, score: o.player.scores[o.weekNum]! }))
          .sort((a, b) => b.score - a.score)
          .slice(
            0,
            weeks.length * Object.keys(selectedWrapped().ffTeams).length
          )
          .map((o, i) => (
            <div key={i}>
              [{o.teamName}]: [{o.player.name}] week {o.weekNum}: {o.score}
            </div>
          ))}
      </div>
    </div>
  );
}
