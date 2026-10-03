import type { WrappedType } from "../../FetchWrapped";

export type ManagerWinsPoint = {
  weekNum: number;
  data: Record<string, number>;
  average: number;
};

export function getManagerWins(wrapped: WrappedType): ManagerWinsPoint[] {
  const teams = Object.values(wrapped.ffTeams);
  if (!teams.length) return [];

  const weeks = [
    ...new Set(teams.flatMap((team) => Object.keys(team.rosters).map(Number))),
  ]
    .filter(
      (week) => week > 0 && week <= (wrapped.latestScoringPeriod ?? Infinity)
    )
    .sort((a, b) => a - b);
  const wins = Object.fromEntries(teams.map((team) => [team.id, 0]));
  const snapshot = (weekNum: number): ManagerWinsPoint => ({
    weekNum,
    data: { ...wins },
    average:
      Object.values(wins).reduce((sum, value) => sum + value, 0) / teams.length,
  });
  const points = [snapshot(0)];

  for (const week of weeks) {
    const scores = Object.fromEntries(
      teams.map((team) => {
        const roster = team.rosters[week];
        return [
          team.id,
          roster
            ? roster.starting.reduce(
                (sum, playerId) =>
                  sum + (wrapped.nflPlayers[playerId]?.scores[week] ?? 0),
                0
              )
            : undefined,
        ];
      })
    );
    for (const team of teams) {
      const opponentId = wrapped.ffMatchups[week]
        ?.find((matchup) => matchup.includes(team.id))
        ?.find((id) => id !== team.id);
      const score = scores[team.id];
      const opponentScore =
        opponentId === undefined ? undefined : scores[opponentId];
      if (
        score !== undefined &&
        opponentScore !== undefined &&
        score > opponentScore
      ) {
        wins[team.id] += 1;
      }
    }
    points.push(snapshot(week));
  }
  return points;
}
