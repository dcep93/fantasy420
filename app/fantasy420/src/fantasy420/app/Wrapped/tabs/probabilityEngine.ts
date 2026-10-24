import type { WrappedType } from "../../FetchWrapped";
import calibration from "./probabilityCalibration.json";
import { getWeeklyStrength } from "./playoffStrength";
import { createRankingRules, rankPlayoffTeams } from "./playoffStandings";

export const probabilityModel = calibration;

export function victoryProbability(a: number | null, b: number | null) {
  if (a === null || b === null || !Number.isFinite(a) || !Number.isFinite(b)) return 0.5;
  return 1 / (1 + Math.exp(-calibration.slope * (a - b)));
}

export type ProbabilityGame = {
  key: string; week: number; matchupIndex: number; a: number; b: number;
  strengthA: number | null; strengthB: number | null; probability: number;
};
export type ProbabilitySeason = {
  teams: { id: string; name: string }[];
  wins: number[]; points: number[]; headWins: number[]; headGames: number[];
  games: ProbabilityGame[];
};
export type ProbabilityResult = {
  ranks: number[][]; method: "exact" | "simulation"; scenarios: number;
  elapsedMs: number; maxError95: number;
};

export function prepareProbabilitySeason(wrapped: WrappedType, currentYear: string): ProbabilitySeason {
  const teams = Object.values(wrapped.ffTeams).map(({ id, name }) => ({ id, name }));
  const n = teams.length;
  const index = new Map(teams.map((team, i) => [team.id, i]));
  const wins = Array(n).fill(0), points = Array(n).fill(0);
  const headWins = Array(n * n).fill(0), headGames = Array(n * n).fill(0);
  const games: ProbabilityGame[] = [];
  const completed = wrapped.latestScoringPeriod ?? (Number(wrapped.year) < Number(currentYear)
    ? Math.max(0, ...Object.keys(wrapped.ffMatchups).map(Number)) : 0);
  const score = (id: string, week: string) => {
    const roster = wrapped.ffTeams[id]?.rosters[week];
    return roster?.starting.reduce((sum, pid) => sum + (wrapped.nflPlayers[pid]?.scores[week] || 0), 0);
  };
  for (const [week, matchups] of Object.entries(wrapped.ffMatchups).sort(([a], [b]) => Number(a) - Number(b))) {
    const strengths = Number(week) > completed ? getWeeklyStrength(wrapped, Number(week)) : {};
    // Match PlayoffMachine's PF: count scheduled completed roster weeks even if
    // the opponent's roster is missing. Never include postseason/in-progress PF.
    if (Number(week) > 0 && Number(week) <= completed) {
      teams.forEach((team, i) => {
        if (matchups.some(matchup => matchup.includes(team.id))) points[i] += score(team.id, week) ?? 0;
      });
    }
    matchups.forEach(([aId, bId], matchupIndex) => {
      const a = index.get(aId), b = index.get(bId);
      if (a === undefined || b === undefined || a === b) return;
      if (Number(week) <= completed) {
        const sa = score(aId, week), sb = score(bId, week);
        if (sa === undefined || sb === undefined) return;
        if (sa > sb) { wins[a]++; headWins[a * n + b]++; }
        else if (sb > sa) { wins[b]++; headWins[b * n + a]++; }
        else { wins[a] += 0.5; wins[b] += 0.5; }
      } else {
        const strengthA = strengths[aId] ?? null, strengthB = strengths[bId] ?? null;
        games.push({ key: `${week}:${matchupIndex}`, week: Number(week), matchupIndex,
          a, b, strengthA, strengthB, probability: victoryProbability(strengthA, strengthB) });
      }
      headGames[a * n + b]++; headGames[b * n + a]++;
    });
  }
  return { teams, wins, points, headWins, headGames, games };
}

export type CalculationOptions = { maxSamples?: number; timeBudgetMs?: number; exactLimit?: number };

export function calculateProbabilities(season: ProbabilitySeason, options: CalculationOptions = {}): ProbabilityResult {
  const started = performance.now();
  const n = season.teams.length;
  const rules = createRankingRules(season.teams.map(t => t.name), season.headGames);
  const wins = Float64Array.from(season.wins), head = Float64Array.from(season.headWins);
  const order = Array(n).fill(0);
  const totals = Array.from({ length: n }, () => Array(n).fill(0));
  const uncertain: ProbabilityGame[] = [];
  for (const game of season.games) {
    if (!Number.isFinite(game.probability) || game.probability < 0 || game.probability > 1)
      throw new Error("Win probabilities must be between 0% and 100%.");
    if (game.probability > 0 && game.probability < 1) uncertain.push(game);
    else {
      const winner = game.probability === 1 ? game.a : game.b;
      const loser = winner === game.a ? game.b : game.a;
      wins[winner]++; head[winner * n + loser]++;
    }
  }
  const add = (weight: number) => {
    rankPlayoffTeams(wins, head, season.points, rules, order);
    for (let rank = 0; rank < n; rank++) totals[order[rank]][rank] += weight;
  };
  const exact = uncertain.length <= (options.exactLimit ?? 15);
  let scenarios = 0;
  if (exact) {
    const visit = (i: number, weight: number) => {
      if (i === uncertain.length) { add(weight); scenarios++; return; }
      const { a, b, probability: p } = uncertain[i];
      wins[a]++; head[a * n + b]++;
      visit(i + 1, weight * p);
      wins[a]--; head[a * n + b]--;
      wins[b]++; head[b * n + a]++;
      visit(i + 1, weight * (1 - p));
      wins[b]--; head[b * n + a]--;
    };
    visit(0, 1);
  } else {
    const baseWins = wins.slice(), baseHead = head.slice();
    const maxSamples = options.maxSamples ?? 250_000;
    const deadline = started + (options.timeBudgetMs ?? 800);
    // Fixed seed and common random numbers make neighboring edits comparable.
    let state = 0x4202026;
    const random = () => {
      state ^= state << 13; state ^= state >>> 17; state ^= state << 5;
      return (state >>> 0) / 4294967296;
    };
    for (; scenarios < maxSamples; scenarios++) {
      if (scenarios > 0 && scenarios % 1024 === 0 && performance.now() >= deadline) break;
      wins.set(baseWins); head.set(baseHead);
      for (const game of season.games) {
        const draw = random();
        if (game.probability === 0 || game.probability === 1) continue;
        const winner = draw < game.probability ? game.a : game.b;
        const loser = winner === game.a ? game.b : game.a;
        wins[winner]++; head[winner * n + loser]++;
      }
      add(1);
    }
    for (const row of totals) for (let i = 0; i < row.length; i++) row[i] /= scenarios;
  }
  // Normalize roundoff in weighted exact sums, preserving each manager's 100%.
  if (exact) for (const row of totals) {
    const sum = row.reduce((a, b) => a + b, 0);
    if (sum) for (let i = 0; i < row.length; i++) row[i] /= sum;
  }
  return { ranks: totals, method: exact ? "exact" : "simulation", scenarios,
    elapsedMs: performance.now() - started, maxError95: exact ? 0 : 1.96 * 0.5 / Math.sqrt(scenarios) };
}
