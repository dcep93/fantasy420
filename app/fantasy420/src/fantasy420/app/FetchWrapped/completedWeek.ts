type ScheduledGame = { statsOfficial?: boolean };
type ProTeamSchedule = {
  id: number;
  proGamesByScoringPeriod: Record<string, ScheduledGame[]>;
};

/** A bye contributes no games; an unfinished scheduled game blocks its week. */
export function latestCompletedWeek(teams: ProTeamSchedule[]): number {
  const gamesByWeek = new Map<number, ScheduledGame[]>();
  for (const team of teams) {
    if (team.id === 0) continue;
    for (const [period, games] of Object.entries(team.proGamesByScoringPeriod)) {
      const week = Number(period);
      if (!Number.isInteger(week) || week < 1) continue;
      gamesByWeek.set(week, [...(gamesByWeek.get(week) ?? []), ...games]);
    }
  }

  // Consumers treat every week through the cutoff as complete, so never skip
  // an earlier unfinished week (for example, a postponed game).
  let completed = 0;
  while (true) {
    const games = gamesByWeek.get(completed + 1);
    if (!games?.length || !games.every((game) => game.statsOfficial === true)) {
      return completed;
    }
    completed += 1;
  }
}
