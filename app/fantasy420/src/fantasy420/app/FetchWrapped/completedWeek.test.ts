import { latestCompletedWeek } from "./completedWeek";

const official = { statsOfficial: true };
const unfinished = { statsOfficial: false };

test("a bye does not hold back a completed week", () => {
  expect(latestCompletedWeek([
    { id: 1, proGamesByScoringPeriod: { "1": [official], "2": [official], "3": [unfinished] } },
    { id: 2, proGamesByScoringPeriod: { "1": [official], "3": [unfinished] } },
    { id: 3, proGamesByScoringPeriod: { "1": [official], "2": [] } },
  ])).toBe(2);
});

test.each([unfinished, {}])("waits for every game's official status: %j", (pending) => {
  expect(latestCompletedWeek([
    { id: 1, proGamesByScoringPeriod: { "1": [official], "2": [official] } },
    { id: 2, proGamesByScoringPeriod: { "1": [official], "2": [pending] } },
  ])).toBe(1);
});

test("checks every game in a team's scoring period", () => {
  expect(latestCompletedWeek([
    { id: 1, proGamesByScoringPeriod: { "1": [official, unfinished] } },
  ])).toBe(0);
});

test("does not skip an unfinished or missing earlier week", () => {
  const scenarios: Record<string, { statsOfficial: boolean }[]>[] = [{ "2": [unfinished] }, {}];
  for (const secondWeek of scenarios) {
    expect(latestCompletedWeek([
      { id: 1, proGamesByScoringPeriod: { "1": [official], ...secondWeek, "3": [official] } },
    ])).toBe(1);
  }
});

test("requires scheduled games before declaring any week complete", () => {
  expect(latestCompletedWeek([])).toBe(0);
  expect(latestCompletedWeek([{ id: 1, proGamesByScoringPeriod: { "1": [] } }])).toBe(0);
});

test("ignores free agents and nonpositive periods and handles unordered schedules", () => {
  expect(latestCompletedWeek([
    { id: 0, proGamesByScoringPeriod: { "1": [unfinished] } },
    { id: 1, proGamesByScoringPeriod: { "3": [official], "1": [official], "2": [official], "0": [unfinished] } },
  ])).toBe(3);
});
