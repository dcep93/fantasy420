import { isReliableWeeklyProjection, readWeeklyProjections } from "./weeklyProjections";

const stat = { seasonId: 2023, scoringPeriodId: 1, statSourceId: 1, appliedTotal: 12.345, appliedStats: { "42": 12.345 } as Record<string, number> };
const zero = { ...stat, appliedTotal: 0, appliedStats: { "42": 2, "72": -2 } };
const entry = (playerId: number, stats: (typeof stat)[] = []) => ({
  playerId, playerPoolEntry: { player: { stats } },
});

test("requires a projection for the exact season and week, with no actual or generic fallback", () => {
  expect(readWeeklyProjections([
    entry(1, [stat]),
    entry(2, [{ ...stat, statSourceId: 0 }]),
    entry(3, [{ ...stat, seasonId: 2024 }]),
    entry(4, [{ ...stat, scoringPeriodId: 0 }]),
    entry(5, [{ ...stat, scoringPeriodId: 2 }]),
    { playerId: 6 },
  ], 2023, 1)).toEqual({ "1": 12.35 });
});

test("keeps a zero supported by scoring contributions and omits absent and nonfinite values", () => {
  const result = readWeeklyProjections([
    entry(1, [zero]),
    entry(2),
    entry(3, [{ ...stat, appliedTotal: NaN }]),
    entry(4, [{ ...stat, appliedTotal: Infinity }]),
    { playerId: 5, playerPoolEntry: { player: { stats: [{ ...stat, appliedTotal: null }] } } },
    { playerId: 6, playerPoolEntry: { player: { stats: [{ ...stat, appliedTotal: undefined }] } } },
  ], 2023, 1);
  expect(result).toEqual({ "1": 0 });
  expect(JSON.parse(JSON.stringify(result))).toEqual({ "1": 0 });
});

test("rejects ESPN's explicit historical zeros with empty scoring inputs even when variance is present", () => {
  const incomplete = { ...stat, appliedTotal: 0, appliedStats: {}, stats: {}, variance: { "42": 2.096784293 } };
  const participationOnly = { ...incomplete, stats: { "210": 0.882352941 } };
  expect(readWeeklyProjections([
    entry(1, [incomplete]),
    entry(2, [participationOnly]),
    entry(3, [{ ...stat, appliedTotal: 0, appliedStats: { "42": 0 } }]),
    entry(4, [{ ...stat, appliedTotal: 0, appliedStats: { "42": NaN } }]),
    entry(5, [{ ...stat, appliedTotal: 0, appliedStats: { "42": Infinity } }]),
  ], 2023, 1)).toEqual({});
});

test("prefers an archived lineup record while retaining a valid fallback when the archive lacks it", () => {
  expect(readWeeklyProjections([
    entry(1, [stat]), entry(2, [stat]),
    entry(1, [zero]), entry(2, [{ ...stat, appliedTotal: 0, appliedStats: {} }]),
  ], 2023, 1)).toEqual({ "1": 0, "2": 12.35 });
});

test("legacy and version 1 zeros are unverified; version 2 checks their scoring inputs", () => {
  expect(isReliableWeeklyProjection(0)).toBe(false);
  expect(isReliableWeeklyProjection(0, 1)).toBe(false);
  expect(isReliableWeeklyProjection(0, 2)).toBe(true);
  expect(isReliableWeeklyProjection(12)).toBe(true);
  for (const value of [undefined, null, NaN, Infinity, "0"]) {
    expect(isReliableWeeklyProjection(value, 1)).toBe(false);
  }
});
