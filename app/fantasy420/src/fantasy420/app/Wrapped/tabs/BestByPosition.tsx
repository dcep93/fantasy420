import { bubbleStyle, Helpers, Position, selectedWrapped } from "..";

export default function BestByPosition() {
  return (
    <div>
      {Object.values(Position)
        .filter((p) => Number.isInteger(p))
        .map((p) => p as Position)
        .filter((p) => p > 0)
        .map((position) => ({
          position,
          asdf: Helpers.sortByKey(
            Object.values(selectedWrapped().ffTeams)
              .map((team) => ({
                ...team,
                p: Object.entries(team.rosters)
                  .flatMap(([scoringPeriod, rosters]) =>
                    rosters.starting.map((playerId) => ({
                      scoringPeriod,
                      asdf: selectedWrapped().nflPlayers[playerId],
                    }))
                  )
                  .filter((p) => p.asdf.position === Position[position]),
              }))
              .map((team) => ({
                ...team,
                score: team.p
                  .map((p) => p.asdf.scores[p.scoringPeriod] || 0)
                  .reduce((a, b) => a + b, 0),
              })),
            (obj) => -obj.score
          ),
        }))
        .map(({ position, asdf }, i) => (
          <div key={i} style={bubbleStyle}>
            <h3>{Position[position]}</h3>
            {asdf.map((obj, i) => (
              <div
                key={i}
                title={JSON.stringify(
                  obj.p.map(
                    (a) =>
                      `w${a.scoringPeriod} vs ${
                        selectedWrapped().nflTeams[
                          selectedWrapped().nflTeams[a.asdf.nflTeamId]
                            .nflGamesByScoringPeriod[a.scoringPeriod]?.opp || ""
                        ]?.name
                      } / ${a.asdf.name}: ${a.asdf.scores[a.scoringPeriod]}`
                  ),
                  null,
                  2
                )}
              >
                ({i + 1}) {obj.score.toFixed(2)} <b>{obj.name}</b>
              </div>
            ))}
          </div>
        ))}
    </div>
  );
}
