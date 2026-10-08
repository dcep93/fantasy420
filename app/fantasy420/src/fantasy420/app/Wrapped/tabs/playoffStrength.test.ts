import type { WrappedType } from "../../FetchWrapped";
import { getDefaultMatchupWinner, getWeeklyStrength, sortMatchupsByStrengthGap } from "./playoffStrength";

function season(): WrappedType {
  return {
    year: "2026", ffMatchups: {}, nflTeams: {
      nfl: { id: "nfl", name: "NFL team", byeWeek: 6, nflGamesByScoringPeriod: {} },
    },
    nflPlayers: Object.fromEntries(["a", "b"].map((id) => [id, {
      id, name: id, position: "WR", nflTeamId: id === "a" ? "nfl" : "other",
      scores: {}, projection: 0, total: 0, average: 0,
    }])),
    ffTeams: Object.fromEntries(["a", "b"].map((id) => [id, {
      id, name: id, draft: [], rosters: {
        "0": { weekNum: "0", starting: [], rostered: [id], projections: {} },
      },
    }])),
    fantasyCalc: { timestamp: 0, history: [], players: { a: 300, b: 100 } },
  };
}

test("sorts closest matchups first while retaining original selection indices and schedule order", () => {
  const matchups = [["a", "b"], ["c", "d"], ["e", "f"], ["g", "h"]];
  const strengths = { a: 130, b: 80, c: 95, d: 100, e: 90, f: 90, g: 105, h: 100 };
  const sorted = sortMatchupsByStrengthGap(matchups, strengths);
  expect(sorted.map(({ matchupIndex, gap }) => [matchupIndex, gap])).toEqual([
    [2, 0], [1, 5], [3, 5], [0, 50],
  ]);
  const picks = ["b", "d", "f", "h"];
  expect(sorted.map(({ matchupIndex }) => picks[matchupIndex])).toEqual(["f", "d", "h", "b"]);
  expect(matchups).toEqual([["a", "b"], ["c", "d"], ["e", "f"], ["g", "h"]]);
});

test("puts unknown strength gaps last without treating zero strength as missing", () => {
  const sorted = sortMatchupsByStrengthGap(
    [["a", "b"], ["c", "d"], ["e", "f"], ["g", "h"]],
    { a: null, b: 100, c: 0, d: 10, e: 50, f: NaN }
  );
  expect(sorted.map(({ matchupIndex }) => matchupIndex)).toEqual([1, 0, 2, 3]);
  expect(sortMatchupsByStrengthGap([], {})).toEqual([]);
});

test("normalizes roster strength to a league average of 100 and adjusts by week for byes", () => {
  const wrapped = season();
  expect(getWeeklyStrength(wrapped, 5)).toEqual({ a: 150, b: 50 });
  expect(getWeeklyStrength(wrapped, 6)).toEqual({ a: 0, b: 200 });
  expect(getWeeklyStrength(wrapped, 7)).toEqual({ a: 150, b: 50 });
});

test("defaults to the stronger team regardless of matchup order and changes with byes", () => {
  const wrapped = season();
  expect(getDefaultMatchupWinner(["b", "a"], getWeeklyStrength(wrapped, 5))).toBe("a");
  expect(getDefaultMatchupWinner(["a", "b"], getWeeklyStrength(wrapped, 5))).toBe("a");
  expect(getDefaultMatchupWinner(["a", "b"], getWeeklyStrength(wrapped, 6))).toBe("b");
});

test("handles ties, missing strength, zero strength and empty matchups deterministically", () => {
  expect(getDefaultMatchupWinner(["a", "b"], { a: 100, b: 100 })).toBe("a");
  expect(getDefaultMatchupWinner(["a", "b"], { a: null, b: null })).toBe("a");
  expect(getDefaultMatchupWinner(["a", "b"], { a: null, b: 0 })).toBe("b");
  expect(getDefaultMatchupWinner(["a", "b"], { a: 0, b: null })).toBe("a");
  expect(getDefaultMatchupWinner([], {})).toBeUndefined();
});

test("uses the saved weekly roster when available, including bench players", () => {
  const wrapped = season();
  wrapped.ffTeams.a.rosters["5"] = {
    weekNum: "5", starting: ["b"], rostered: ["b", "bench"], projections: {},
  };
  wrapped.fantasyCalc!.players.bench = 100;
  expect(getWeeklyStrength(wrapped, 5)).toEqual({ a: 133, b: 67 });
});

test("shows unavailable for missing or unusable values without inventing neutral strength", () => {
  const wrapped = season();
  delete wrapped.fantasyCalc;
  expect(getWeeklyStrength(wrapped, 5)).toEqual({ a: null, b: null });
  wrapped.fantasyCalc = { timestamp: 0, history: [], players: { a: NaN, b: 100 } };
  expect(getWeeklyStrength(wrapped, 5)).toEqual({ a: null, b: 100 });
  wrapped.fantasyCalc.players = { a: 0, b: 0 };
  expect(getWeeklyStrength(wrapped, 5)).toEqual({ a: null, b: null });
});
