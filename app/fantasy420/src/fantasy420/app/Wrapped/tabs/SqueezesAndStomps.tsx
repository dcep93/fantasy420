import { bubbleStyle, Helpers, selectedWrapped } from "..";

export default function SqueezesAndStomps() {
  const num = 10;
  const rawPoints = Helpers.sortByKey(
    Object.entries(selectedWrapped().ffMatchups)
      .map(([periodId, matchups]) => ({
        periodId,
        matchups: matchups.map((matchup) =>
          Helpers.sortByKey(
            matchup
              .map((teamId) =>
                teamId === null ? null : selectedWrapped().ffTeams[teamId]
              )
              .filter((team) => team?.rosters[periodId])
              .map((team) => team!)
              .map((team) => ({
                ...team,
                score: team.rosters[periodId].starting
                  .map(
                    (playerId) =>
                      selectedWrapped().nflPlayers[playerId].scores[periodId] ||
                      0
                  )
                  .reduce((a, b) => a + b, 0),
              })),
            (p) => p.score
          )
        ),
      }))
      .flatMap(({ periodId, matchups }) =>
        matchups
          .filter((teams) => teams[0]?.score)
          .map((teams) => ({
            periodId,
            diff: teams[1].score - teams[0].score,
            winner: teams[1].name,
            loser: teams[0].name,
          }))
      ),
    (match) => match.diff
  );
  return (
    <div>
      <div>
        <div style={bubbleStyle}>
          {rawPoints.slice(0, num).map((point, i) => (
            <div key={i}>
              week {point.periodId}: {point.diff.toFixed(2)} point squeeze /{" "}
              <b>{point.winner}</b> beat <b>{point.loser}</b>
            </div>
          ))}
        </div>
      </div>
      <div>
        <div style={bubbleStyle}>
          {rawPoints
            .slice(-num)
            .reverse()
            .map((point, i) => (
              <div key={i}>
                week {point.periodId}: {point.diff.toFixed(2)} point stomp /{" "}
                <b>{point.winner}</b> beat <b>{point.loser}</b>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
