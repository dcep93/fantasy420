import { fetchExtension } from "../Draft/Extension";
import { latestCompletedWeek } from "../FetchWrapped/completedWeek";
import { parseScoreboard } from "./data";

export function currentScoringWeek(schedule: any): number {
  const teams = schedule?.settings?.proTeams;
  if (!Array.isArray(teams) || !teams.length || teams.some(team => !team.proGamesByScoringPeriod)) {
    throw new Error("The NFL schedule is unavailable; cannot determine the current week.");
  }
  const weeks = teams.filter(team => team.id !== 0).flatMap(team =>
    Object.entries(team.proGamesByScoringPeriod).filter(([, games]) => Array.isArray(games) && games.length)
      .map(([week]) => Number(week))).filter(week => Number.isInteger(week) && week > 0);
  if (!weeks.includes(1)) throw new Error("The NFL schedule is incomplete; cannot determine the current week.");
  return Math.min(latestCompletedWeek(teams) + 1, Math.max(...weeks));
}

export async function fetchLiveScoreboard(year: number, fetcher = fetchExtension) {
  const base = `https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/${year}`;
  const read = async (url: string) => {
    const response = await fetcher({ url, json: true, maxAgeMs: 0, options: { credentials: "include", cache: "no-store" } });
    if (!response || response.error) throw new Error("ESPN could not load the live scoreboard. Sign in to ESPN in Chrome and try again.");
    return response;
  };
  const schedule = await read(`${base}?view=proTeamSchedules_wl`);
  const week = currentScoringWeek(schedule);
  const url = new URL(`${base}/segments/0/leagues/203836968`);
  url.searchParams.set("scoringPeriodId", String(week));
  for (const view of ["mMatchup", "mMatchupScore", "mRoster", "mScoreboard", "mSettings", "mStatus", "mTeam", "modular", "mNav"]) {
    url.searchParams.append("view", view);
  }
  let data = await read(url.toString());
  data = withPregameTotals(data, schedule, week, Date.now());
  const snapshot = parseScoreboard(data, year, Date.now(), { optimizeAll: true, week });
  if (!snapshot.matchups.length) throw new Error(`ESPN has no matchups available for Week ${week} yet.`);
  return snapshot;
}

/** Upcoming weeks have weekly totals but no Live fields until ESPN rolls over. */
export function withPregameTotals(data: any, schedule: any, week: number, now: number) {
  const games = schedule.settings.proTeams.filter((team: any) => team.id !== 0)
    .flatMap((team: any) => team.proGamesByScoringPeriod[String(week)] ?? []);
  const pregame = games.length > 0 && games.every((game: any) =>
    typeof game.date === "number" && game.date > now && game.statsOfficial !== true);
  if (!pregame || !Array.isArray(data?.schedule)) return data;
  const side = (value: any) => value && ({ ...value,
    totalPointsLive: 0,
    totalProjectedPointsLive: value.totalProjectedPoints,
  });
  return { ...data, schedule: data.schedule.map((matchup: any) => ({ ...matchup,
    home: side(matchup.home), away: side(matchup.away),
  })) };
}
