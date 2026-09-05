import { defenseStatsForGame } from "./defenseStats";

test("ignores defense totals for an unofficial game", () => {
  expect(
    defenseStatsForGame(false, { yardsAllowed: 432, pointsAllowed: 40 })
  ).toEqual({ yardsAllowed: 0, pointsAllowed: 0 });
});

test("uses defense totals once the game is official", () => {
  expect(
    defenseStatsForGame(true, { yardsAllowed: 432, pointsAllowed: 40 })
  ).toEqual({ yardsAllowed: 432, pointsAllowed: 40 });
});
