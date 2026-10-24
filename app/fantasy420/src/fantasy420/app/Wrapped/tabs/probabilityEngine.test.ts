import { calculateProbabilities, prepareProbabilitySeason, victoryProbability, probabilityModel,
  type ProbabilitySeason } from "./probabilityEngine";
import { createRankingRules, rankPlayoffTeams } from "./playoffStandings";
import { getWeeklyStrength } from "./playoffStrength";
import current from "../dataJson/2026.json";
import archive from "../dataJson/2022.json";
import type { WrappedType } from "../../FetchWrapped";

function tinySeason(): ProbabilitySeason {
  return { teams: ["A", "B", "C", "D"].map(id => ({ id, name: id })),
    wins: [0, 0, 0, 0], points: [400, 300, 200, 100],
    headWins: Array(16).fill(0), headGames: [0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0],
    games: [{ key: "1:0", week: 1, matchupIndex: 0, a: 0, b: 1, strengthA: 100, strengthB: 100, probability: 0.75 },
      { key: "1:1", week: 1, matchupIndex: 1, a: 2, b: 3, strengthA: 100, strengthB: 100, probability: 0.4 }] };
}

test("exact calculation weights all outcomes rather than counting them equally", () => {
  const result = calculateProbabilities(tinySeason());
  expect(result.method).toBe("exact");
  expect(result.scenarios).toBe(4);
  const expected = [[0.75, 0, 0.25, 0], [0.25, 0, 0.75, 0], [0, 0.4, 0, 0.6], [0, 0.6, 0, 0.4]];
  result.ranks.forEach((row, i) => row.forEach((p, j) => expect(p).toBeCloseTo(expected[i][j], 12)));
});

test("0/100% overrides prune impossible branches and PF changes only tiebreakers", () => {
  const season = tinySeason();
  season.games[0].probability = 0; season.games[1].probability = 1;
  let result = calculateProbabilities(season);
  expect(result.scenarios).toBe(1);
  expect(result.ranks[1][0]).toBe(1); // B beats C on PF at one win each.
  season.points[2] += 1000;
  result = calculateProbabilities(season);
  expect(result.ranks[2][0]).toBe(1);
  expect(result.ranks[0][2]).toBe(1); // Losing A cannot overtake winners.
  expect(season.wins).toEqual([0, 0, 0, 0]);
});

test("simulation agrees with exact weighted enumeration and repeats with a fixed sample count", () => {
  const season = tinySeason();
  const exact = calculateProbabilities(season);
  const options = { exactLimit: 0, maxSamples: 80_000, timeBudgetMs: Infinity };
  const simulated = calculateProbabilities(season, options);
  expect(simulated.method).toBe("simulation");
  simulated.ranks.forEach((row, i) => row.forEach((p, j) => expect(Math.abs(p - exact.ranks[i][j])).toBeLessThan(0.008)));
  expect(calculateProbabilities(season, options).ranks).toEqual(simulated.ranks);
});

test("current schedule has identical weekly strengths and excludes incomplete PF", () => {
  const season = prepareProbabilitySeason(current, "2026");
  expect(season.games).toHaveLength(35);
  for (const game of season.games) {
    const strengths = getWeeklyStrength(current, game.week);
    expect(game.strengthA).toBe(strengths[season.teams[game.a].id]);
    expect(game.strengthB).toBe(strengths[season.teams[game.b].id]);
  }
  const changed = structuredClone(current);
  for (const player of Object.values(changed.nflPlayers)) player.scores["7" as keyof typeof player.scores] = 99999;
  expect(prepareProbabilitySeason(changed, "2026").points).toEqual(season.points);
});

test("archived 2022 final standings preserve PlayoffMachine's wins, points and H2H order", () => {
  const season = prepareProbabilitySeason(archive, "2026");
  expect(season.games).toHaveLength(0);
  const result = calculateProbabilities(season);
  const morgan = season.teams.findIndex(team => team.name === "Team Morgan");
  const mcmc = season.teams.findIndex(team => team.name === "🇺🇲🇺🇲🇺🇲 MCMCGAGA");
  expect(season.wins[morgan]).toBe(9);
  expect(season.points[morgan]).toBeCloseTo(1664.4);
  expect(season.points[mcmc]).toBeCloseTo(1960.3);
  expect(result.ranks[morgan][1]).toBe(1);
  expect(result.ranks[mcmc][0]).toBe(1); // MCMCGAGA won their Week 6 matchup.
});

test("explicit zero and unknown current cutoff do not finalize partial scores", () => {
  const zero = { ...current, latestScoringPeriod: 0 };
  const unknown = { ...current, latestScoringPeriod: undefined };
  expect(prepareProbabilitySeason(zero, "2026").points).toEqual(Array(10).fill(0));
  expect(prepareProbabilitySeason(unknown, "2026").games).toHaveLength(65);
});

test("historical ties count half wins but no head-to-head wins, just as PlayoffMachine", () => {
  const season: WrappedType = structuredClone(current);
  const [a, b] = season.ffMatchups["1"][0];
  const teams = season.ffTeams;
  teams[a].rosters["1"].starting = []; teams[b].rosters["1"].starting = [];
  const prepared = prepareProbabilitySeason({ ...season, ffMatchups: { "1": [[a, b]] }, latestScoringPeriod: 1 }, "2026");
  const ai = prepared.teams.findIndex(team => team.id === a), bi = prepared.teams.findIndex(team => team.id === b);
  expect(prepared.wins[ai]).toBe(0.5); expect(prepared.wins[bi]).toBe(0.5);
  expect(prepared.headGames[ai * 10 + bi]).toBe(1);
  expect(prepared.headWins[ai * 10 + bi]).toBe(0);
});

test("probability curve is symmetric, monotonic and neutral for missing strengths", () => {
  expect(victoryProbability(100, 100)).toBe(0.5);
  expect(victoryProbability(120, 80)).toBeGreaterThan(victoryProbability(110, 90));
  expect(victoryProbability(120, 80) + victoryProbability(80, 120)).toBeCloseTo(1, 14);
  expect(victoryProbability(null, 80)).toBe(0.5);
  expect(victoryProbability(NaN, 80)).toBe(0.5);
  expect(probabilityModel.games).toBe(200);
  for (const source of probabilityModel.sources) {
    expect(source.fantasyCalcTimestamp).toBeLessThan(Date.parse(source.cutoffUtc));
  }
});

test("ranking matches the original PlayoffMachine comparator for varied multi-team ties", () => {
  const season = prepareProbabilitySeason(current, "2026");
  const n = season.teams.length;
  const rules = createRankingRules(season.teams.map(t => t.name), season.headGames);
  for (let sample = 0; sample < 200; sample++) {
    const wins = season.teams.map((_, i) => (sample * (i + 3) + i) % 4);
    const head = season.headWins.map((v, i) => v + ((sample + i) % 2));
    const groups: Record<string, number[]> = {};
    wins.forEach((v, i) => (groups[v] ??= []).push(i));
    const expected = Object.keys(groups).map(Number).sort((a, b) => b - a).flatMap(w => {
      const group = groups[w];
      const counts = new Set(group.flatMap(a => group.filter(b => a !== b).map(b => season.headGames[a * n + b])));
      const useH2H = counts.size === 1 && [...counts][0] > 0;
      const h2h = (a: number) => group.filter(b => b !== a).reduce((sum, b) => sum + head[a * n + b], 0);
      return group.sort((a, b) => (useH2H ? h2h(b) - h2h(a) : 0) || season.points[b] - season.points[a] ||
        season.teams[a].name.localeCompare(season.teams[b].name));
    });
    // A team's self-record is always zero.
    for (let i = 0; i < n; i++) head[i * n + i] = 0;
    expect(rankPlayoffTeams(wins, head, season.points, rules, [])).toEqual(expected);
  }
});

test("three-team H2H is used only for equally played groups, with name as final fallback", () => {
  const names = ["Zulu", "Alpha", "Bravo"];
  const equal = [0, 1, 1, 1, 0, 1, 1, 1, 0];
  const head = [0, 1, 1, 0, 0, 1, 0, 0, 0];
  expect(rankPlayoffTeams([5, 5, 5], head, [0, 1000, 2000], createRankingRules(names, equal), [])).toEqual([0, 1, 2]);
  const unequal = [...equal]; unequal[1] = 2; unequal[3] = 2;
  expect(rankPlayoffTeams([5, 5, 5], head, [0, 1000, 2000], createRankingRules(names, unequal), [])).toEqual([2, 1, 0]);
  expect(rankPlayoffTeams([5, 5, 5], Array(9).fill(0), [0, 0, 0], createRankingRules(names, equal), [])).toEqual([1, 2, 0]);
});

test("current 35-game calculation stays near a second and conserves every finishing place", () => {
  const result = calculateProbabilities(prepareProbabilitySeason(current, "2026"));
  expect(result.method).toBe("simulation");
  expect(result.elapsedMs).toBeLessThan(1500);
  expect(result.scenarios).toBeGreaterThan(5000);
  result.ranks.forEach(row => expect(row.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 10));
  for (let rank = 0; rank < 10; rank++) {
    expect(result.ranks.reduce((sum, row) => sum + row[rank], 0)).toBeCloseTo(1, 10);
  }
  const totalTop4 = result.ranks.reduce((sum, row) => sum + row.slice(0, 4).reduce((a, b) => a + b, 0), 0);
  expect(totalTop4).toBeCloseTo(4, 10);
  console.info(`ProbabilityMachine benchmark: ${result.scenarios} seasons in ${result.elapsedMs.toFixed(0)}ms; ±${(100 * result.maxError95).toFixed(2)}pp`);
});
