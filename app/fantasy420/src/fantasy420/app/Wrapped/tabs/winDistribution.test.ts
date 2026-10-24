import { getWinDistributions } from "./winDistribution";
import { prepareProbabilitySeason, type ProbabilitySeason } from "./probabilityEngine";
import current from "../dataJson/2026.json";

function fixture(): ProbabilitySeason {
  return {
    teams: ["A", "B", "C"].map(id => ({ id, name: id })), wins: [2, 3.5, 1], points: [100, 200, 300],
    headGames: Array(9).fill(0), headWins: Array(9).fill(0),
    games: [[0, 1, 0.8], [0, 2, 0.3], [1, 2, 0.6]].map(([a, b, probability], i) => ({
      key: String(i), a, b, probability, week: i + 1, matchupIndex: 0, strengthA: 100, strengthB: 100,
    })),
  };
}

test("exact marginals agree with all eight weighted joint outcomes, including half-win offsets", () => {
  const season = fixture();
  const expected = season.teams.map(() => new Map<number, number>());
  for (let outcome = 0; outcome < 8; outcome++) {
    const wins = [...season.wins];
    let mass = 1;
    season.games.forEach((game, i) => {
      const aWins = !!(outcome & (1 << i));
      wins[aWins ? game.a : game.b]++;
      mass *= aWins ? game.probability : 1 - game.probability;
    });
    wins.forEach((winTotal, i) => expected[i].set(winTotal, (expected[i].get(winTotal) ?? 0) + mass));
  }
  const actual = getWinDistributions(season);
  actual.forEach((points, i) => {
    expect(points.reduce((sum, point) => sum + point.probability, 0)).toBeCloseTo(1, 14);
    for (const point of points) expect(point.probability).toBeCloseTo(expected[i].get(point.wins) ?? 0, 14);
  });
  expect(actual[0].map(p => p.probability)).toEqual([expect.closeTo(0.14), expect.closeTo(0.62), expect.closeTo(0.24)]);
  expect(actual[1].map(p => p.wins)).toEqual([3.5, 4.5, 5.5]);
});

test("locked winners and finished seasons produce point masses; PF cannot alter win probabilities", () => {
  const season = fixture();
  season.games.forEach((game, i) => { game.probability = i === 1 ? 0 : 1; });
  const actual = getWinDistributions(season);
  expect(actual.map(points => points.filter(point => point.probability > 0))).toEqual([
    [{ wins: 3, probability: 1 }], [{ wins: 4.5, probability: 1 }], [{ wins: 2, probability: 1 }],
  ]);
  season.points[0] += 1000;
  expect(getWinDistributions(season)).toEqual(actual);
  season.games = [];
  expect(getWinDistributions(season)).toEqual(season.wins.map(wins => [{ wins, probability: 1 }]));
});

test("current league distributions conserve probability and the expected number of remaining wins", () => {
  const season = prepareProbabilitySeason(current, "2026");
  const points = getWinDistributions(season);
  points.forEach(row => expect(row.reduce((sum, p) => sum + p.probability, 0)).toBeCloseTo(1, 12));
  const finalWins = points.flat().reduce((sum, point) => sum + point.wins * point.probability, 0);
  expect(finalWins).toBeCloseTo(season.wins.reduce((sum, wins) => sum + wins, 0) + season.games.length, 12);
});
