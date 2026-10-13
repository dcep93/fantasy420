import type { WrappedType } from "../../FetchWrapped";

export type ManagerWinsPoint = {
  weekNum: number;
  data: Record<string, number>;
  pointsFor: Record<string, number>;
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
  const pointsFor = Object.fromEntries(teams.map((team) => [team.id, 0]));
  const snapshot = (weekNum: number): ManagerWinsPoint => ({
    weekNum,
    data: { ...wins },
    pointsFor: { ...pointsFor },
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
      if (score !== undefined && opponentScore !== undefined) {
        pointsFor[team.id] = Math.round((pointsFor[team.id] + score) * 100) / 100;
        if (score > opponentScore) wins[team.id] += 1;
      }
    }
    points.push(snapshot(week));
  }
  return points;
}

/** Separate points-for tiebreaks within a win band without changing win totals. */
export function separateTiedWins(wins: Record<string, number>, pointsFor: Record<string, number>) {
  const pointsByWins = new Map<number, number[]>();
  for (const [id, count] of Object.entries(wins)) {
    pointsByWins.set(count, [...new Set([...(pointsByWins.get(count) ?? []), pointsFor[id]])].sort((a, b) => a - b));
  }
  return Object.fromEntries(Object.entries(wins).map(([id, count]) => {
    const group = pointsByWins.get(count)!;
    const offset = group.length > 1 ? 0.35 * group.indexOf(pointsFor[id]) / (group.length - 1) : 0;
    return [id, count + offset];
  }));
}
