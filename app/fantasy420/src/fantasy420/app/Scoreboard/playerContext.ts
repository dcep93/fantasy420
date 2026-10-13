import type { ProjectedPlayer } from "./lineup";

/** Schedule-derived status, not an inferred live game clock. */
export function playerGameContext(proTeamId: number | undefined, schedule: any, week: number, now: number): NonNullable<ProjectedPlayer["game"]> {
  const teams = schedule?.settings?.proTeams;
  const team = Array.isArray(teams) ? teams.find((value: any) => value.id === proTeamId && value.id !== 0) : undefined;
  const unknown = { team: team?.abbrev ?? "", opponent: "—", status: "Unknown" as const, kickoff: null };
  if (!team) return unknown;
  const games = team.proGamesByScoringPeriod?.[week];
  if (!Array.isArray(games) || !games.length) {
    return team.byeWeek === week ? { ...unknown, opponent: "BYE", status: "Bye" } : unknown;
  }
  const game = games.find((value: any) => value.awayProTeamId === proTeamId || value.homeProTeamId === proTeamId);
  if (!game) return unknown;
  const away = game.awayProTeamId === proTeamId;
  const opponent = teams.find((value: any) => value.id === (away ? game.homeProTeamId : game.awayProTeamId));
  const kickoff = !game.startTimeTBD && typeof game.date === "number" && Number.isFinite(game.date) ? game.date : null;
  return { team: unknown.team, opponent: opponent?.abbrev ? `${away ? "@" : "vs "}${opponent.abbrev}` : "—",
    status: game.statsOfficial === true ? "Final" : kickoff === null || kickoff > now ? "Scheduled" : "Started", kickoff };
}
