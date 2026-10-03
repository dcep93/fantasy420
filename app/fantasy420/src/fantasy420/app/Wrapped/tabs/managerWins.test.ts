import type { WrappedType } from "../../FetchWrapped";
import { getManagerWins } from "./managerWins";

function season(): WrappedType {
  const team = (id: string) => ({
    id,
    name: id,
    draft: [],
    rosters: Object.fromEntries([0, 1, 2, 3, 4].map((week) => [week, {
      weekNum: String(week), starting: [id], rostered: [id], projections: {},
    }])),
  });
  const player = (id: string, scores: Record<string, number>) => ({
    id, name: id, scores, nflTeamId: "1", position: "QB",
    projection: 0, total: 0, average: 0,
  });
  return {
    year: "2026", latestScoringPeriod: 3, nflTeams: {},
    ffTeams: { a: team("a"), b: team("b") },
    nflPlayers: {
      a: player("a", { 0: 100, 1: 20, 2: 10, 3: 5, 4: 50 }),
      b: player("b", { 0: 0, 1: 10, 2: 10, 3: 15, 4: 0 }),
    },
    ffMatchups: { 0: [["a", "b"]], 1: [["a", "b"]], 2: [["a", "b"]],
      3: [["a", "b"]], 4: [["a", "b"]] },
  };
}

test("accumulates completed wins, leaves ties unchanged, and excludes future weeks", () => {
  expect(getManagerWins(season())).toEqual([
    { weekNum: 0, data: { a: 0, b: 0 }, average: 0 },
    { weekNum: 1, data: { a: 1, b: 0 }, average: 0.5 },
    { weekNum: 2, data: { a: 1, b: 0 }, average: 0.5 },
    { weekNum: 3, data: { a: 1, b: 1 }, average: 1 },
  ]);
});

test("a zero completion cutoff produces only the preseason baseline", () => {
  expect(getManagerWins({ ...season(), latestScoringPeriod: 0 })).toEqual([
    { weekNum: 0, data: { a: 0, b: 0 }, average: 0 },
  ]);
});

test("legacy seasons use recorded weeks, preserving totals for byes and absent matchups", () => {
  const wrapped = season();
  delete wrapped.latestScoringPeriod;
  wrapped.ffMatchups["3"] = [["a"], ["b"]];
  delete wrapped.ffMatchups["4"];
  expect(getManagerWins(wrapped).at(-1)).toEqual({
    weekNum: 4, data: { a: 1, b: 0 }, average: 0.5,
  });
});

test("a missing opponent roster does not award either team a win", () => {
  const wrapped = season();
  delete wrapped.ffTeams.b.rosters["1"];
  expect(getManagerWins(wrapped)[1].data).toEqual({ a: 0, b: 0 });
});

test("aligns nonconsecutive weeks across managers and sorts them numerically", () => {
  const wrapped = season();
  delete wrapped.latestScoringPeriod;
  for (const team of Object.values(wrapped.ffTeams)) {
    team.rosters = { "10": { ...team.rosters["3"], weekNum: "10" },
      "2": team.rosters["2"] };
  }
  wrapped.nflPlayers.a.scores["10"] = 30;
  wrapped.nflPlayers.b.scores["10"] = 20;
  wrapped.ffMatchups["10"] = [["a", "b"]];
  expect(getManagerWins(wrapped)).toEqual([
    { weekNum: 0, data: { a: 0, b: 0 }, average: 0 },
    { weekNum: 2, data: { a: 0, b: 0 }, average: 0 },
    { weekNum: 10, data: { a: 1, b: 0 }, average: 0.5 },
  ]);
});

test("handles missing players and empty seasons safely", () => {
  const wrapped = season();
  delete wrapped.nflPlayers.a;
  expect(getManagerWins(wrapped)[1].data).toEqual({ a: 0, b: 1 });
  expect(getManagerWins({ ...wrapped, ffTeams: {} })).toEqual([]);
});
