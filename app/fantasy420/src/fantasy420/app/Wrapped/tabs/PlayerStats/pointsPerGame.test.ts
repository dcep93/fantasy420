import { getPointsPerGame } from "./pointsPerGame";

test("excludes null and zero scores from games played", () => {
  expect(getPointsPerGame([12, null, 0, 18])).toEqual({
    gamesPlayed: 2,
    pointsPerGame: 15,
  });
});

test("includes negative scores and rounds points per game", () => {
  expect(getPointsPerGame([10, -2, 5])).toEqual({
    gamesPlayed: 3,
    pointsPerGame: 4.33,
  });
});

test("returns zeroes when there are no qualifying games", () => {
  expect(getPointsPerGame([null, 0, null])).toEqual({
    gamesPlayed: 0,
    pointsPerGame: 0,
  });
});
