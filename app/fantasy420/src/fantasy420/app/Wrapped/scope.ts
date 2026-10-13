import type { WrappedType } from "../FetchWrapped";

export const ALL_YEARS = "all";
export const managerChanges: Record<string, string[]> = {
  "4": ["2022"],
  "2": ["2024", "2025"],
};
export const seasonOnlyViews: Record<string, string> = {
  Scoreboard: "Live matchups belong to the current season and week.",
  FantasyCalc: "Market values describe a roster at one point in time.",
  DraftBoard: "Each draft has its own pick order and roster.",
  StrengthOfSeason:
    "Bye-week strength uses one season’s schedule and market values.",
  OwnedTeams: "This view describes a season’s current roster snapshot.",
  ExtremeStuds: "This hypothetical lineup uses a season’s current roster.",
  PlayoffMachine:
    "Playoff brackets and remaining schedules belong to one season.",
  NFLTeams: "This roster and draft comparison uses one season’s snapshot.",
};
export function scopeLabel(year: string, years: string[]) {
  if (year !== ALL_YEARS) return year;
  const sorted = [...years].sort();
  return `All years${sorted.length ? ` (${sorted[0]}–${sorted.at(-1)})` : ""}`;
}
export function normalizeYear(
  year: string | null,
  seasons: Record<string, WrappedType>,
  current: string,
) {
  return year === ALL_YEARS || (year && Object.hasOwn(seasons, year))
    ? year!
    : current;
}
export function managerKey(id: string, year: string) {
  return `${id}:${(managerChanges[id] ?? []).filter((start) => start <= year).at(-1) ?? "original"}`;
}
export function completedWeeks(wrapped: WrappedType) {
  return [
    ...new Set(
      Object.values(wrapped.ffTeams).flatMap((team) =>
        Object.keys(team.rosters),
      ),
    ),
  ]
    .filter(
      (week) =>
        Number(week) > 0 &&
        Number(week) <= (wrapped.latestScoringPeriod ?? Infinity),
    )
    .sort((a, b) => Number(a) - Number(b));
}
