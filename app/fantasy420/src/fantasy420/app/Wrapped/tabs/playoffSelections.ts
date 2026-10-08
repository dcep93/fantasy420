import { getDefaultMatchupWinner } from "./playoffStrength";

export type SimulatedSelections = Record<string, Record<string, string>>;

export function getPlayoffSelections(
  matchups: Record<string, string[][]>,
  weeklyStrength: Record<number, Record<string, number | null>>,
  upcomingWeeks: number[],
  encodedPicks: string | null
) {
  let overrides: unknown;
  try {
    overrides = JSON.parse(encodedPicks ?? "null");
  } catch {
    overrides = null;
  }
  const selections: SimulatedSelections = {};
  const chalk: SimulatedSelections = {};
  for (const week of upcomingWeeks) {
    selections[week] = {};
    chalk[week] = {};
    const weekPicks = isRecord(overrides) ? overrides[week] : undefined;
    (matchups[week] ?? []).forEach((matchup, index) => {
      const defaultWinner = getDefaultMatchupWinner(matchup, weeklyStrength[week]);
      if (defaultWinner === undefined) return;
      chalk[week][index] = defaultWinner;
      const pick = isRecord(weekPicks) ? weekPicks[index] : undefined;
      selections[week][index] = typeof pick === "string" && matchup.includes(pick)
        ? pick
        : defaultWinner;
    });
  }
  return { selections, chalk };
}

export function serializePlayoffPicks(selections: SimulatedSelections, chalk: SimulatedSelections) {
  const picks: SimulatedSelections = {};
  for (const [week, matchups] of Object.entries(chalk)) {
    for (const [index, defaultWinner] of Object.entries(matchups)) {
      const winner = selections[week]?.[index];
      if (winner !== undefined && winner !== defaultWinner) {
        (picks[week] ??= {})[index] = winner;
      }
    }
  }
  return Object.keys(picks).length ? JSON.stringify(picks) : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
