import { bubbleStyle, Helpers, Position, selectedWrapped } from "..";

export default function DeterminedByDiscreteScoring() {
  function calculateDSTDifference(
    teamId: string,
    periodId: string
  ): { superscore: number; msg: string } | null {
    const started = selectedWrapped()
      .ffTeams[teamId].rosters[periodId].starting.map(
        (playerId) => selectedWrapped().nflPlayers[playerId]
      )
      .find((p) => p.position === Position[Position.DST]);
    if (!started) return { superscore: 0, msg: "NO DST STARTED" };
    const offense =
      selectedWrapped().nflTeams[started.nflTeamId].nflGamesByScoringPeriod[
        periodId
      ];
    if (!offense) return null;
    var superscore = 0;
    const yards = offense.yardsAllowed;
    if (yards >= 550) {
      superscore += -6 - 1 * ((yards - 500) / 50);
      superscore -= -7;
    } else if (yards >= 500) {
      superscore += -6 - 1 * ((yards - 500) / 50);
      superscore -= -6;
    } else if (yards >= 450) {
      superscore += -5 - 1 * ((yards - 450) / 50);
      superscore -= -5;
    } else if (yards >= 400) {
      superscore += -3 - 2 * ((yards - 400) / 50);
      superscore -= -3;
    } else if (yards >= 350) {
      superscore += -1 - 2 * ((yards - 350) / 50);
      superscore -= -1;
    } else if (yards >= 300) {
      superscore += 0 - 1 * ((yards - 300) / 50);
      superscore -= 0;
    } else if (yards >= 200) {
      superscore += 2 - 2 * ((yards - 200) / 100);
      superscore -= 2;
    } else if (yards >= 100) {
      superscore += 3 - 1 * ((yards - 100) / 100);
      superscore -= 3;
    } else {
      superscore += 5 - 2 * (yards / 100);
      superscore -= 5;
    }
    if (offense.pointsAllowed >= 46) {
      superscore += -3 - 2 * ((offense.pointsAllowed - 35) / 11);
      superscore -= -5;
    } else if (offense.pointsAllowed >= 35) {
      superscore += -3 - 2 * ((offense.pointsAllowed - 35) / 11);
      superscore -= -3;
    } else if (offense.pointsAllowed >= 28) {
      superscore += -1 - 2 * ((offense.pointsAllowed - 28) / 7);
      superscore -= -1;
    } else if (offense.pointsAllowed >= 14) {
      superscore += 1 - 2 * ((offense.pointsAllowed - 14) / 14);
      superscore -= 1;
    } else if (offense.pointsAllowed >= 7) {
      superscore += 3 - 2 * ((offense.pointsAllowed - 7) / 7);
      superscore -= 3;
    } else if (offense.pointsAllowed >= 1) {
      superscore += 4 - 1 * ((offense.pointsAllowed - 1) / 6);
      superscore -= 4;
    } else {
      superscore += 5 - (1 * (offense.pointsAllowed - 0)) / 1;
      superscore -= 5;
    }
    return { superscore, msg: `${started.name} ${superscore.toFixed(2)}` };
  }
  function calculateKDifference(
    teamId: string,
    periodId: string
  ): { superscore: number; msg: string } | null {
    const started = selectedWrapped()
      .ffTeams[teamId].rosters[periodId].starting.map(
        (playerId) => selectedWrapped().nflPlayers[playerId]
      )
      .find((p) => p.position === Position[Position.K]);
    if (!started) return { superscore: 0, msg: "NO K STARTED" };
    const offense =
      selectedWrapped().nflTeams[started.nflTeamId].nflGamesByScoringPeriod[
        periodId
      ];
    if (!offense) return null;
    const superscore = offense.fieldGoals
      .filter((yards) => yards)
      .map((yards) => yards as number)
      .map((yards) => {
        var points = yards / 10;
        if (yards >= 60) {
          points -= 6;
        } else if (yards >= 50) {
          points -= 5;
        } else if (yards >= 40) {
          points -= 4;
        } else {
          points -= 3;
        }
        return points;
      })
      .reduce((a, b) => a + b, 0);
    return { superscore, msg: `${started.name} ${superscore.toFixed(2)}` };
  }
  return (
    <div>
      {Object.entries(selectedWrapped().ffMatchups)
        .flatMap(([periodId, matchup]) =>
          matchup.map((match) => ({
            periodId,
            teams: Helpers.sortByKey(
              match
                .map((teamId) =>
                  teamId === null ? null : selectedWrapped().ffTeams[teamId]
                )
                .map((team) => team!)
                .filter((team) => team.rosters[periodId])
                .map((team) => ({
                  ...team,
                  score: Helpers.toFixed(
                    team.rosters[periodId].starting
                      .map(
                        (playerId) =>
                          selectedWrapped().nflPlayers[playerId].scores[
                            periodId
                          ]!
                      )
                      .reduce((a, b) => a + b, 0)
                  ),
                }))
                .map((team) => {
                  const ds = [
                    calculateDSTDifference(team.id, periodId),
                    calculateKDifference(team.id, periodId),
                  ].filter((o) => o !== null);
                  return {
                    ...team,
                    msgs: ds.map((d) => d!.msg),
                    superscore:
                      team.score +
                      ds.map((d) => d!.superscore).reduce((a, b) => a + b, 0),
                  };
                }),
              (team) => -team.score
            ),
          }))
        )
        .map(({ teams, ...match }) =>
          teams.length === 0
            ? null
            : {
                ...match,
                winner: teams[0],
                loser: teams[1],
              }
        )
        .filter((match) => match !== null)
        .map((match) => match!)
        .filter((match) => match.loser.superscore > match.winner.superscore)
        .map((match, i) => (
          <div key={i}>
            <div style={bubbleStyle}>
              <div>week {match.periodId}:</div>
              <div>
                <b>{match.loser.name}</b> {match.loser.score} (ss{" "}
                {match.loser.superscore.toFixed(2)})
              </div>
              <div>would have beaten</div>
              <div>
                <b>{match.winner.name}</b> {match.winner.score} (ss{" "}
                {match.winner.superscore.toFixed(2)})
              </div>
              <div>if K and DST used continuous scoring:</div>
              <div style={bubbleStyle}>
                <div>{match.loser.msgs.join(" ")}</div>
                <div>{match.winner.msgs.join(" ")}</div>
              </div>
            </div>
          </div>
        ))}
    </div>
  );
}
