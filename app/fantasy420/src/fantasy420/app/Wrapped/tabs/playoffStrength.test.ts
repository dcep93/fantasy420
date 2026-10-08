import type { WrappedType } from "../../FetchWrapped";
import { getWeeklyStrength } from "./playoffStrength";

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

test("normalizes roster strength to a league average of 100 and adjusts by week for byes", () => {
  const wrapped = season();
  expect(getWeeklyStrength(wrapped, 5)).toEqual({ a: 150, b: 50 });
  expect(getWeeklyStrength(wrapped, 6)).toEqual({ a: 0, b: 200 });
  expect(getWeeklyStrength(wrapped, 7)).toEqual({ a: 150, b: 50 });
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
