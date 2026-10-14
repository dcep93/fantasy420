import { findPlayerGame, playerPlayMatcher } from "./matchupPlayerIdentity";
import type { SeasonGame } from "./spiciestMatchupsData";

const game = (...names: string[]): SeasonGame => ({ week: 1, timestamp: 0, drives: [],
  teams: [{ name: "CAR", boxScore: [{ players: names.map(name => ({ name })) }] }] });

test("weekly box-score identity overrides a team saved after a trade", () => {
  const panthers = game("Christian McCaffrey"), niners = game("Jeff Wilson Jr.");
  expect(findPlayerGame("Christian McCaffrey", [panthers, niners], niners)).toBe(panthers);
});

test("normalizes accents, punctuation and suffixes without confusing first names", () => {
  const eagles = game("D'Andre Swift"), seahawks = game("Kenneth Walker");
  expect(findPlayerGame("D’André Swift", [eagles, seahawks], seahawks)).toBe(eagles);
  expect(findPlayerGame("Kenneth Walker III", [eagles, seahawks], eagles)).toBe(seahawks);
  expect(findPlayerGame("Ty Johnson", [game("Tez Johnson")])).toBeUndefined();
});

test("does not guess when full identities are duplicated across games", () => {
  const first = game("Tez Johnson"), second = game("Tez Johnson");
  expect(findPlayerGame("Tez Johnson", [first, second], first)).toBeUndefined();
  expect(findPlayerGame("Inactive Player", [first], second)).toBe(second);
});

test("Tez Johnson does not receive Juwan or Kameron Johnson's plays", () => {
  const matches = playerPlayMatcher("Tez Johnson", game("Tez Johnson", "Juwan Johnson", "Kameron Johnson"));
  expect(matches("B.Mayfield pass to T.Johnson for 8 yards.")).toBe(true);
  expect(matches("Tez Johnson catches for 8 yards.")).toBe(true);
  expect(matches("S.Rattler pass to J.Johnson (A.Winfield).")).toBe(false);
  expect(matches("Punt fair catch by K.Johnson.")).toBe(false);
  expect(matches("Johnson catches for 8 yards.")).toBe(false);
});

test("ambiguous abbreviated names require full identities", () => {
  const matches = playerPlayMatcher("Ty Johnson", game("Ty Johnson", "Tez Johnson"));
  expect(matches("T.Johnson runs.")).toBe(false);
  expect(matches("Ty Johnson runs.")).toBe(true);
  expect(matches("Tez Johnson runs.")).toBe(false);
  expect(playerPlayMatcher("Ty Johnson", game("Tez Johnson"))("T.Johnson runs.")).toBe(false);
});

test.each([
  ["A.J. Brown", "A.J.Brown catches."], ["D’Andre Swift", "D.Swift runs."],
  ["Kenneth Walker III", "K.Walker runs."], ["Amon-Ra St. Brown", "A.St.Brown catches."],
])("matches punctuated names and initials for %s", (name, text) => {
  expect(playerPlayMatcher(name, game(name))(text)).toBe(true);
});
