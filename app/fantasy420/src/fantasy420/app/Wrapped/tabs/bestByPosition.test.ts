import type { WrappedType } from "../../FetchWrapped";
import { getBestByPosition } from "./bestByPositionData";

function season(): WrappedType {
  const team = (id: string, starters: string[]) => ({
    id, name: `Manager ${id}`, draft: [],
    rosters: Object.fromEntries([0, 1, 2, 3].map((week) => [week, {
      weekNum: String(week), starting: starters, rostered: starters, projections: {},
    }])),
  });
  const player = (id: string, position: string, scores: Record<string, number>) => ({
    id, name: id, position, scores, nflTeamId: "1", projection: 0, total: 0, average: 0,
  });
  return {
    year: "2026", latestScoringPeriod: 2, nflTeams: {}, ffMatchups: {},
    ffTeams: { "2": team("2", ["q2", "rb"]), "1": team("1", ["q1", "missing"]) },
    nflPlayers: {
      q1: player("q1", "QB", { 0: 100, 1: 10.25, 2: 20.5, 3: 100 }),
      q2: player("q2", "QB", { 1: 15, 2: -5 }),
      rb: player("rb", "RB", { 1: 20, 2: 0 }),
    },
  };
}

test("ranks scored starts by position and excludes preseason and future weeks", () => {
  const rows = getBestByPosition(season(), "QB");
  expect(rows.map(({ id, total }) => ({ id, total }))).toEqual([
    { id: "1", total: 30.75 }, { id: "2", total: 10 },
  ]);
  expect(rows[0].starts.map(({ week, score }) => ({ week, score }))).toEqual([
    { week: 1, score: 10.25 }, { week: 2, score: 20.5 },
  ]);
  expect(rows[0].starts[0].opponent).toBeUndefined();
});

test("preserves zero and negative scores, skips missing players and non-finite scores", () => {
  const wrapped = season();
  wrapped.nflPlayers.q1.scores = { 1: NaN, 2: Infinity };
  expect(getBestByPosition(wrapped, "QB").map((row) => row.total)).toEqual([10, 0]);
  const rb = getBestByPosition(wrapped, "RB")[0];
  expect(rb.total).toBe(20);
  expect(rb.starts.map((start) => start.score)).toEqual([20, 0]);
});

test("keeps manager colors stable when rankings and positions change", () => {
  const wrapped = season();
  const initial = getBestByPosition(wrapped, "QB");
  wrapped.nflPlayers.q2.scores["2"] = 100;
  const reordered = getBestByPosition(wrapped, "QB");
  expect(reordered[0].id).toBe("2");
  expect(reordered[0].colorIndex).toBe(initial[1].colorIndex);
  expect(getBestByPosition(wrapped, "RB")[0].colorIndex).toBe(reordered[0].colorIndex);
});

test("handles no scored starts and uses recorded weeks for legacy seasons", () => {
  const wrapped = season();
  expect(getBestByPosition(wrapped, "DST")).toEqual([]);
  expect(getBestByPosition({ ...wrapped, latestScoringPeriod: 0 }, "QB")).toEqual([]);
  delete wrapped.latestScoringPeriod;
  expect(getBestByPosition(wrapped, "QB")[0].total).toBe(130.75);
});


test("keeps managers with no scored starts at zero when another manager has position scores", () => {
  const rows = getBestByPosition(season(), "RB");
  expect(rows.map(({ id, total, starts }) => ({ id, total, starts: starts.length }))).toEqual([
    { id: "2", total: 20, starts: 2 },
    { id: "1", total: 0, starts: 0 },
  ]);
});
