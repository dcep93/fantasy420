import { headToHeadProbability } from "../../Scoreboard/probability";
import { competitiveSwing, summarizeProbabilitySpiciness, summarizeSpiciness, TIMELINE_EVENT_EPSILON } from "./matchupSpiciness";

const timeline = (probabilities: number[], remaining = probabilities.map(() => 100)) =>
  probabilities.map((probability, minute) => ({ minute, probability, remaining: remaining[minute] }));
const summarize = (probabilities: number[], remaining?: number[]) => summarizeProbabilitySpiciness(timeline(probabilities, remaining));

test("meaningful favorite reversals outrank failed comebacks and ignore tiny wiggles", () => {
  expect(summarize([80, 20]).score).toBeGreaterThan(summarize([5, 39]).score);
  expect(summarize([49, 51, 49, 51])).toMatchObject({ score: 0, meaningfulLeadChanges: 0 });
  expect(summarize([50, 70, 90, 80])).toMatchObject({ swingScore: 0, reversalBonus: 0 });
  expect(competitiveSwing(-40, -2)).toBeCloseTo(30.4);
  expect(competitiveSwing(-40, 30)).toBe(50);
});

test("segments only ten-point reversals and selects the top three competitive swings", () => {
  expect(summarize([40, 50]).swingScore).toBe(10);
  expect(summarize([40.01, 50]).swingScore).toBe(0);
  expect(summarize([50, 70, 30, 80, 20, 50])).toMatchObject({ biggestSwings: [40, 30, 30], swingScore: 100 });
});

test("inclusive swing thresholds tolerate team-swap arithmetic without admitting smaller swings", () => {
  for (const probabilities of [[35.99, 45.99], [35.99, 65.99, 55.99, 65.99]]) {
    expect(summarize(probabilities.map(probability => 100 - probability))).toEqual(summarize(probabilities));
  }
  expect(summarize([35.99, 45.99]).swingScore).toBe(5.99);
  expect(summarize([35.99, 45.9899999]).swingScore).toBe(0);
  expect(summarize([35.99, 65.99, 55.9900001, 65.99]).biggestSwings).toEqual([24.01]);
});

test("favorite and late boundaries tolerate floating-point noise but retain meaningful differences", () => {
  const probabilities = [59.99999999999999, 40.00000000000001];
  const remaining = [100, 25.000000000000004];
  const result = summarize(probabilities, remaining);
  expect(result).toMatchObject({ meaningfulLeadChanges: 1, lateLeadChanges: 1, reversalBonus: 10, lastReversalMinute: 1 });
  expect(summarize(probabilities.map(probability => 100 - probability), remaining)).toEqual(result);
  expect(summarize([59.9999999, 40], remaining).meaningfulLeadChanges).toBe(0);
  expect(summarize([60, 40.0000001], remaining).meaningfulLeadChanges).toBe(0);
  expect(summarize([60, 40], [100, 25.0000001]).lateLeadChanges).toBe(0);
});

test("40/60 hysteresis preserves favorites through ties and ignores first acquisition", () => {
  expect(summarize([60, 50, 40])).toMatchObject({ meaningfulLeadChanges: 1, reversalBonus: 5, lastReversalMinute: 2 });
  expect(summarize([50, 55, 60, 50, 59, 41, 50, 60])).toMatchObject({ meaningfulLeadChanges: 0, reversalBonus: 0, lastReversalMinute: null });
  expect(summarize([40, 50, 60, 50, 40])).toMatchObject({ meaningfulLeadChanges: 2, reversalBonus: 10 });
  expect(summarize([])).toMatchObject({ score: 0, meaningfulLeadChanges: 0 });
});

test("reversals double only in the final quarter of initial projected scoring, capped at thirty", () => {
  expect(summarize([60, 40], [100, 26])).toMatchObject({ reversalBonus: 5, lateLeadChanges: 0 });
  expect(summarize([60, 40], [100, 25])).toMatchObject({ reversalBonus: 10, lateLeadChanges: 1 });
  expect(summarize([60, 40, 60, 40, 60], [100, 25, 20, 10, 0]))
    .toMatchObject({ meaningfulLeadChanges: 4, lateLeadChanges: 4, reversalBonus: 30 });
  expect(summarize([60, 40], [0, 0])).toMatchObject({ reversalBonus: 5, lateLeadChanges: 0, suspenseBonus: 0 });
});

test("interpolates decisive threshold time and remaining work, preserving scoring event times", () => {
  expect(summarize([80, 0], [100, 0])).toMatchObject({ lastReversalMinute: 0.5, lateLeadChanges: 0 });
  const event = timeline([80, 0], [100, 0]);
  event[1].minute = TIMELINE_EVENT_EPSILON;
  expect(summarizeProbabilitySpiciness(event)).toMatchObject({ lastReversalMinute: TIMELINE_EVENT_EPSILON, lateLeadChanges: 1 });
});

test("constant ties earn twenty late suspense and certain outcomes earn zero", () => {
  expect(summarize([50, 50], [100, 0]).suspenseBonus).toBe(20);
  for (const probability of [0, 100]) expect(summarize([probability, probability], [100, 0]).suspenseBonus).toBe(0);
  expect(summarize([50, 50], [100, 25]).suspenseBonus).toBe(0);
  expect(summarize([50, 50], [100, 12.5]).suspenseBonus).toBe(10);
});

test("integrates the triangle exactly across 25, 50, 75 and clips at final-quarter boundary", () => {
  expect(summarize([0, 0, 100], [100, 25, 0]).suspenseBonus).toBe(5);
  expect(summarize([100, 0], [100, 0]).suspenseBonus).toBe(0);
  expect(summarize([0, 0, 50], [100, 25, 0]).suspenseBonus).toBe(5);
  expect(summarize([0, 0, 100], [100, 50, 0]).suspenseBonus).toBe(5);
});

test("duplicate samples, idle elapsed time and linear subdivisions do not change scoring", () => {
  const coarse = timeline([80, 0, 100], [100, 25, 0]);
  const dense = [coarse[0], { minute: 0.5, probability: 40, remaining: 62.5 }, coarse[1],
    { minute: 1.5, probability: 50, remaining: 12.5 }, coarse[2]];
  expect(summarizeProbabilitySpiciness(dense)).toEqual(summarizeProbabilitySpiciness(coarse));
  expect(summarizeProbabilitySpiciness(coarse.flatMap(point => [point, point]))).toEqual(summarizeProbabilitySpiciness(coarse));
  const idle = [coarse[0], { ...coarse[0], minute: 100 }, ...coarse.slice(1).map(point => ({ ...point, minute: point.minute + 100 }))];
  expect(summarizeProbabilitySpiciness(idle)).toEqual({ ...summarizeProbabilitySpiciness(coarse), lastReversalMinute: 101.6 });
});

test("all components are symmetric and sum their rounded values", () => {
  const original = timeline([12.234, 62.345, 21.234, 83.456], [100, 50, 20, 0]);
  const result = summarizeProbabilitySpiciness(original);
  expect(summarizeProbabilitySpiciness(original.map(point => ({ ...point, probability: 100 - point.probability })))).toEqual(result);
  expect(result.swingScore).toBe(Number(result.biggestSwings.reduce((sum, swing) => sum + swing, 0).toFixed(2)));
  expect(result.score).toBe(Number((result.swingScore + result.reversalBonus + result.suspenseBonus).toFixed(2)));
});

test("raw timelines use the same actual probabilities as the chart and clamp remaining per team", () => {
  const points = [
    { minute: 0, scores: [0, 0] as [number, number], projectedScores: [20, 30] as [number, number] },
    { minute: 100, scores: [40, 10] as [number, number], projectedScores: [38, 15] as [number, number] },
    { minute: 200, scores: [40, 30] as [number, number], projectedScores: [40, 30] as [number, number] },
  ];
  expect(summarizeSpiciness(points)).toEqual(summarizeProbabilitySpiciness(points.map(point => ({
    minute: point.minute,
    probability: 100 * headToHeadProbability({ score: point.scores[0], projected: point.projectedScores[0] },
      { score: point.scores[1], projected: point.projectedScores[1] }),
    remaining: Math.max(0, point.projectedScores[0] - point.scores[0]) + Math.max(0, point.projectedScores[1] - point.scores[1]),
  }))));
});
