import type { WrappedType } from "../../FetchWrapped";

/** Keep the first team when strengths tie or neither team's strength is known. */
export function getDefaultMatchupWinner(
  matchup: string[],
  strengths: Record<string, number | null>
): string | undefined {
  let winner: string | undefined;
  let bestStrength = -Infinity;
  for (const teamId of matchup) {
    const strength = strengths[teamId] ?? -Infinity;
    if (winner === undefined || strength > bestStrength) {
      winner = teamId;
      bestStrength = strength;
    }
  }
  return winner;
}

/** Relative available roster value: 100 is the league average for this week. */
export function getWeeklyStrength(
  wrapped: WrappedType,
  weekNum: number
): Record<string, number | null> {
  const values = Object.values(wrapped.ffTeams).map((team) => {
    const roster = team.rosters[String(weekNum)] ?? team.rosters["0"];
    let hasValue = false;
    const total = (roster?.rostered ?? []).reduce((sum, playerId) => {
      const value = wrapped.fantasyCalc?.players[playerId];
      if (value === undefined || !Number.isFinite(value) || value < 0) return sum;
      hasValue = true;
      const player = wrapped.nflPlayers[playerId];
      const onBye = player && wrapped.nflTeams[player.nflTeamId]?.byeWeek === weekNum;
      return sum + (onBye ? 0 : value);
    }, 0);
    return { id: team.id, value: hasValue ? total : null };
  });
  const knownValues = values.flatMap(({ value }) => value === null ? [] : [value]);
  const average = knownValues.length
    ? knownValues.reduce((sum, value) => sum + value, 0) / knownValues.length
    : 0;
  return Object.fromEntries(values.map(({ id, value }) => [
    id,
    value === null || average === 0 ? null : Math.round(100 * value / average),
  ]));
}
