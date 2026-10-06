import type { WrappedType } from "../../FetchWrapped";

export const STARTER_POSITIONS = ["QB", "RB", "WR", "TE", "K", "DST"] as const;

export function getBestByPosition(wrapped: WrappedType, position: string) {
  const cutoff = wrapped.latestScoringPeriod ?? Number.POSITIVE_INFINITY;
  const teams = Object.values(wrapped.ffTeams)
    .sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }))
    .map((team, colorIndex) => {
      const starts = Object.entries(team.rosters)
        .filter(([week]) => Number(week) > 0 && Number(week) <= cutoff)
        .flatMap(([week, roster]) =>
          roster.starting.flatMap((playerId) => {
            const player = wrapped.nflPlayers[playerId];
            const score = player?.scores[week];
            if (player?.position !== position || !Number.isFinite(score)) return [];
            const opponentId = wrapped.nflTeams[player.nflTeamId]
              ?.nflGamesByScoringPeriod[week]?.opp;
            return [{
              week: Number(week), playerId, playerName: player.name, score,
              opponent: opponentId ? wrapped.nflTeams[opponentId]?.name : undefined,
            }];
          })
        )
        .sort((a, b) => a.week - b.week || a.playerName.localeCompare(b.playerName));
      return {
        id: team.id, name: team.name, colorIndex, starts,
        total: starts.reduce((sum, start) => sum + start.score, 0),
      };
    })
    .sort((a, b) => b.total - a.total || a.colorIndex - b.colorIndex);
  return teams.some((team) => team.starts.length > 0) ? teams : [];
}
