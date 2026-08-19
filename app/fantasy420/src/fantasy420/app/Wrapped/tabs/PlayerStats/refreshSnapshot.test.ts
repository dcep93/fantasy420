import {
  PlayerStatsRecord,
  refreshCompletedSeason,
  WrappedSeasonSnapshot,
} from "./refreshSnapshot";

const partialSnapshot = (): PlayerStatsRecord[] => [
  {
    name: "Veteran",
    position: "QB",
    total: 125,
    years: [
      { year: 2024, scores: [10, 15], total: 25 },
      { year: 2025, scores: [40, 60, null], total: 100 },
    ],
  },
  {
    name: "Stale Rookie",
    position: "WR",
    total: 3,
    years: [{ year: 2025, scores: [3], total: 3 }],
  },
];

function completedWrapped(
  players: WrappedSeasonSnapshot["nflPlayers"],
  latestScoringPeriod = 18
): WrappedSeasonSnapshot {
  return {
    year: "2025",
    latestScoringPeriod,
    nflPlayers: players,
  };
}

test("replaces partial 2025 data and recomputes the career total", () => {
  const result = refreshCompletedSeason(
    partialSnapshot(),
    completedWrapped({
      veteran: {
        name: "Veteran",
        position: "QB",
        total: 227.08,
        scores: { "1": 0, "3": 12.5, "18": 14.58 },
      },
    })
  );

  expect(result).toHaveLength(1);
  expect(result[0].total).toBe(252.08);
  expect(result[0].years[0]).toEqual({
    year: 2024,
    scores: [10, 15],
    total: 25,
  });
  expect(result[0].years[1].total).toBe(227.08);
});

test("preserves explicit zeroes and fills missing weeks with null", () => {
  const result = refreshCompletedSeason(
    [],
    completedWrapped({
      rookie: {
        name: "Rookie",
        position: "RB",
        total: 10,
        scores: { "1": 0, "2": 10, "18": 0 },
      },
    })
  );

  const scores = result[0].years[0].scores;
  expect(scores).toHaveLength(18);
  expect(scores[0]).toBe(0);
  expect(scores[1]).toBe(10);
  expect(scores[2]).toBeNull();
  expect(scores[17]).toBe(0);
});

test("appends new scorers in deterministic name order", () => {
  const result = refreshCompletedSeason(
    [],
    completedWrapped({
      zed: { name: "Zed", position: "WR", total: 1, scores: { "1": 1 } },
      alpha: {
        name: "Alpha",
        position: "TE",
        total: 2,
        scores: { "1": 2 },
      },
      zero: {
        name: "Zero",
        position: "RB",
        total: 0,
        scores: { "1": 0 },
      },
    })
  );

  expect(result.map((player) => player.name)).toEqual(["Alpha", "Zed"]);
});

test("rejects incomplete seasons before transforming", () => {
  expect(() =>
    refreshCompletedSeason(
      partialSnapshot(),
      completedWrapped({}, 17)
    )
  ).toThrow("Expected 18 completed scoring periods");
});

test("rejects duplicate player names", () => {
  const duplicate = partialSnapshot()[0];
  expect(() =>
    refreshCompletedSeason(
      [duplicate, { ...duplicate }],
      completedWrapped({})
    )
  ).toThrow("Duplicate player name in snapshot: Veteran");

  expect(() =>
    refreshCompletedSeason(
      [],
      completedWrapped({
        first: {
          name: "Duplicate",
          position: "RB",
          total: 1,
          scores: { "1": 1 },
        },
        second: {
          name: "Duplicate",
          position: "WR",
          total: 2,
          scores: { "1": 2 },
        },
      })
    )
  ).toThrow("Duplicate player name in wrapped season: Duplicate");
});
