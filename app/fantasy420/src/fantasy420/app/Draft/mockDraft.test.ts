import {
  advanceToUserTurn,
  DEFAULT_MOCK_DRAFT_SETTINGS,
  getDraftLength,
  getDraftView,
  getHistoricalNudgeAvailability,
  getMockDraftOpponentCandidatePool,
  getMockDraftTemperature,
  getPickLabel,
  getPickOwner,
  makeUserPick,
  MockDraftPlayer,
  nudgeHistoricalPick,
  validateMockDraftSettings,
} from "./mockDraft";

const players = Object.fromEntries(
  [
    ["1", "QB", 7],
    ["2", "RB", 8],
    ["3", "WR", 8],
    ["4", "TE", 10],
    ["5", "QB", 7],
    ["6", "RB", 8],
    ["7", "WR", 9],
    ["8", "TE", 10],
    ["9", "DST", 11],
    ["10", "K", 12],
    ["11", "QB", 13],
    ["12", "RB", 13],
    ["13", "WR", 13],
    ["14", "TE", 13],
    ["15", "DST", 13],
    ["16", "K", 13],
    ["17", "QB", 14],
    ["18", "RB", 14],
    ["19", "WR", 14],
    ["20", "TE", 14],
  ].map(([id, position, byeWeek]) => [
    id,
    { id, position, byeWeek } as MockDraftPlayer,
  ])
);
const ranking = Object.keys(players);

const lineupPlayers = Object.fromEntries(
  [
    ["qb-1", "QB"],
    ["qb-2", "QB"],
    ["qb-3", "QB"],
    ["qb-4", "QB"],
    ["rb-1", "RB"],
    ["rb-2", "RB"],
    ["rb-3", "RB"],
    ["wr-1", "WR"],
    ["wr-2", "WR"],
    ["wr-3", "WR"],
    ["wr-4", "WR"],
    ["te-1", "TE"],
    ["te-2", "TE"],
    ["te-3", "TE"],
    ["dst-1", "DST"],
  ].map(([id, position]) => [
    id,
    { id, position, byeWeek: 8 } as MockDraftPlayer,
  ])
);

function rosterWith(
  slots: Partial<typeof DEFAULT_MOCK_DRAFT_SETTINGS.roster>
) {
  return {
    ...Object.fromEntries(
      Object.keys(DEFAULT_MOCK_DRAFT_SETTINGS.roster).map((slot) => [slot, 0])
    ),
    ...slots,
  } as typeof DEFAULT_MOCK_DRAFT_SETTINGS.roster;
}

test("uses the requested defaults and a fourteen-round draft", () => {
  expect(DEFAULT_MOCK_DRAFT_SETTINGS).toMatchObject({
    draftPosition: 8,
    teamCount: 10,
    positionRisk: 1,
    byeRisk: 1,
    craziness: 1,
    roster: {
      QB: 1,
      RB: 2,
      WR: 2,
      TE: 1,
      FLEX: 2,
      SUPERFLEX: 1,
      DST: 0,
      K: 0,
      BENCH: 5,
    },
  });
  expect(getDraftLength(DEFAULT_MOCK_DRAFT_SETTINGS)).toBe(140);
});

test("rejects configured kicker slots", () => {
  expect(() =>
    validateMockDraftSettings({
      ...DEFAULT_MOCK_DRAFT_SETTINGS,
      seed: "no-kickers",
      roster: { ...DEFAULT_MOCK_DRAFT_SETTINGS.roster, K: 1 },
    })
  ).toThrow("K roster count must be zero");
});

test("snakes even rounds and formats chronological round pick labels", () => {
  expect(getPickOwner(0, 10)).toEqual({ round: 1, draftPosition: 1 });
  expect(getPickOwner(9, 10)).toEqual({ round: 1, draftPosition: 10 });
  expect(getPickOwner(10, 10)).toEqual({ round: 2, draftPosition: 10 });
  expect(getPickOwner(19, 10)).toEqual({ round: 2, draftPosition: 1 });
  expect(getPickLabel(10, 10)).toBe("2.01");
  expect(getPickLabel(19, 10)).toBe("2.10");
});

test("seeded opponents replay deterministically and pause for the user", () => {
  const settings = {
    ...DEFAULT_MOCK_DRAFT_SETTINGS,
    teamCount: 4,
    draftPosition: 3,
    seed: "abc123",
    roster: { ...DEFAULT_MOCK_DRAFT_SETTINGS.roster, BENCH: 0 },
  };
  const initial = { settings, picks: [] };
  const first = advanceToUserTurn(initial, players, ranking);
  const second = advanceToUserTurn(initial, players, ranking);

  expect(first).toEqual(second);
  expect(first.picks).toHaveLength(2);
  expect(getPickOwner(first.picks.length, 4).draftPosition).toBe(3);
});

test("a user pick advances opponents to the next user turn", () => {
  const settings = {
    ...DEFAULT_MOCK_DRAFT_SETTINGS,
    teamCount: 4,
    draftPosition: 3,
    seed: "abc123",
    roster: { ...DEFAULT_MOCK_DRAFT_SETTINGS.roster, BENCH: 0 },
  };
  const waiting = advanceToUserTurn({ settings, picks: [] }, players, ranking);
  const available = ranking.find((id) => !waiting.picks.includes(id))!;
  const advanced = makeUserPick(waiting, available, players, ranking);

  expect(advanced.picks[2]).toBe(available);
  expect(getPickOwner(advanced.picks.length, 4).draftPosition).toBe(3);
});

test("kickers are unavailable to users, opponents, and historical nudges", () => {
  const settings = {
    ...DEFAULT_MOCK_DRAFT_SETTINGS,
    teamCount: 2,
    draftPosition: 2,
    seed: "no-kickers",
    roster: {
      QB: 1,
      RB: 0,
      WR: 0,
      TE: 0,
      FLEX: 0,
      SUPERFLEX: 0,
      DST: 0,
      K: 0,
      BENCH: 0,
    },
  };
  const kickerFirstRanking = ["10", "1", "2"];
  const waiting = advanceToUserTurn(
    { settings, picks: [] },
    players,
    kickerFirstRanking
  );

  expect(waiting.picks).toEqual(["1"]);
  expect(
    makeUserPick(
      { settings: { ...settings, draftPosition: 1 }, picks: [] },
      "10",
      players,
      kickerFirstRanking
    ).picks
  ).toEqual([]);
  expect(
    getHistoricalNudgeAvailability(
      { settings, picks: ["1"] },
      0,
      players,
      kickerFirstRanking
    )
  ).toEqual({ better: false, worse: true });
});

test("DST remains eligible when its default roster count is zero", () => {
  const settings = {
    ...DEFAULT_MOCK_DRAFT_SETTINGS,
    teamCount: 2,
    draftPosition: 1,
    seed: "optional-dst",
  };

  const selected = makeUserPick(
    { settings, picks: [] },
    "9",
    players,
    ranking
  );

  expect(selected.picks[0]).toBe("9");
});

test("historical nudges preserve later user picks when they remain available", () => {
  const settings = {
    ...DEFAULT_MOCK_DRAFT_SETTINGS,
    teamCount: 3,
    draftPosition: 2,
    seed: "history",
    roster: { QB: 1, RB: 1, WR: 0, TE: 0, FLEX: 0, SUPERFLEX: 0, DST: 0, K: 0, BENCH: 0 },
  };
  let state = advanceToUserTurn({ settings, picks: [] }, players, ranking);
  state = makeUserPick(state, "4", players, ranking);
  state = makeUserPick(state, "8", players, ranking);
  const originalUserPicks = state.picks.filter(
    (_, index) => getPickOwner(index, settings.teamCount).draftPosition === 2
  );
  const changed = nudgeHistoricalPick(
    state,
    0,
    "worse",
    players,
    ranking
  );
  const changedUserPicks = changed.picks.filter(
    (_, index) => getPickOwner(index, settings.teamCount).draftPosition === 2
  );

  expect(changed.picks[0]).not.toBe(state.picks[0]);
  expect(changedUserPicks).toEqual(originalUserPicks);
  expect(getDraftView(changed, players, ranking).picks[0].rank).toBeGreaterThan(1);
});

test("historical replay stops when an edit takes a later user player", () => {
  const settings = {
    ...DEFAULT_MOCK_DRAFT_SETTINGS,
    teamCount: 3,
    draftPosition: 2,
    seed: "collision",
    roster: { QB: 1, RB: 1, WR: 0, TE: 0, FLEX: 0, SUPERFLEX: 0, DST: 0, K: 0, BENCH: 0 },
  };
  const state = {
    settings,
    picks: ["1", "2", "3", "4", "5", "6"],
  };

  const changed = nudgeHistoricalPick(state, 0, "worse", players, ranking);

  expect(changed.picks).toEqual(["2"]);
  expect(getPickOwner(changed.picks.length, 3).draftPosition).toBe(2);
});

test("historical nudge availability disables impossible directions", () => {
  const settings = {
    ...DEFAULT_MOCK_DRAFT_SETTINGS,
    teamCount: 2,
    draftPosition: 2,
    seed: "bounds",
  };

  expect(
    getHistoricalNudgeAvailability(
      { settings, picks: ["1"] },
      0,
      players,
      ranking
    )
  ).toEqual({ better: false, worse: true });
  expect(
    getHistoricalNudgeAvailability(
      { settings, picks: ["20"] },
      0,
      players,
      ranking
    )
  ).toEqual({ better: true, worse: false });
});

test("position risk discounts a saturated position", () => {
  const base = {
    ...DEFAULT_MOCK_DRAFT_SETTINGS,
    teamCount: 2,
    draftPosition: 1,
    seed: "position",
    craziness: 0.0001,
    byeRisk: 0.0001,
    roster: { QB: 1, RB: 1, WR: 0, TE: 0, FLEX: 0, SUPERFLEX: 0, DST: 0, K: 0, BENCH: 3 },
  };
  const positionRanking = ["1", "5", "11", "2", "6", "12", "20"];
  const picks = ["20", "1", "2", "8", "14", "5"];
  const low = advanceToUserTurn(
    { settings: { ...base, positionRisk: 0.0001 }, picks },
    players,
    positionRanking
  );
  const high = advanceToUserTurn(
    { settings: { ...base, positionRisk: 10000 }, picks },
    players,
    positionRanking
  );

  expect(players[low.picks[6]].position).toBe("QB");
  expect(players[high.picks[6]].position).toBe("RB");
});

test.each([
  {
    label: "second RB",
    roster: rosterWith({ QB: 1, RB: 2 }),
    team: ["qb-1", "rb-1"],
    available: ["qb-2", "wr-1", "rb-2"],
    expected: ["rb-2"],
  },
  {
    label: "second WR",
    roster: rosterWith({ QB: 1, WR: 2 }),
    team: ["qb-1", "wr-1"],
    available: ["qb-2", "rb-1", "wr-2"],
    expected: ["wr-2"],
  },
  {
    label: "QB",
    roster: rosterWith({ QB: 1, RB: 1 }),
    team: ["rb-1"],
    available: ["rb-2", "wr-1", "qb-1"],
    expected: ["qb-1"],
  },
  {
    label: "DST",
    roster: rosterWith({ QB: 1, DST: 1 }),
    team: ["qb-1"],
    available: ["qb-2", "wr-1", "dst-1"],
    expected: ["dst-1"],
  },
])("only keeps candidates that can fill the empty $label slot", ({
  roster,
  team,
  available,
  expected,
}) => {
  expect(
    getMockDraftOpponentCandidatePool(
      team,
      available,
      lineupPlayers,
      roster
    )
  ).toEqual(expected);
});

test("reassigns FLEX and SUPERFLEX optimally before identifying bench picks", () => {
  const roster = rosterWith({ QB: 1, RB: 2, FLEX: 1, SUPERFLEX: 1 });

  expect(
    getMockDraftOpponentCandidatePool(
      ["qb-1", "qb-2", "rb-1", "rb-2"],
      ["qb-3", "rb-3", "wr-1", "te-1"],
      lineupPlayers,
      roster
    )
  ).toEqual(["rb-3", "wr-1", "te-1"]);
});

test("the reported three-QB two-TE roster can only add an RB", () => {
  expect(
    getMockDraftOpponentCandidatePool(
      [
        "qb-1",
        "qb-2",
        "qb-3",
        "rb-1",
        "wr-1",
        "wr-2",
        "wr-3",
        "te-1",
        "te-2",
      ],
      ["qb-4", "rb-2", "rb-3", "wr-4", "te-3"],
      lineupPlayers,
      DEFAULT_MOCK_DRAFT_SETTINGS.roster
    )
  ).toEqual(["rb-2", "rb-3"]);
});

test("allows bench depth when dedicated TE is the only empty starter slot", () => {
  const roster = rosterWith({ QB: 1, RB: 1, TE: 1, BENCH: 2 });
  const available = ["qb-2", "rb-2", "wr-1", "te-1"];

  expect(
    getMockDraftOpponentCandidatePool(
      ["qb-1", "rb-1"],
      available,
      lineupPlayers,
      roster
    )
  ).toEqual(available);
});

test("opponent scoring cannot select bench depth while RB2 is empty", () => {
  const settings = {
    ...DEFAULT_MOCK_DRAFT_SETTINGS,
    teamCount: 2,
    draftPosition: 2,
    seed: "fill-rb-before-bench",
    craziness: 0.0001,
    positionRisk: 0.0001,
    byeRisk: 0.0001,
    roster: rosterWith({ QB: 1, RB: 2, BENCH: 2 }),
  };
  const ranked = ["qb-1", "qb-2", "wr-1", "rb-1", "rb-2", "te-1"];
  const state = {
    settings,
    picks: ["qb-1", "wr-1", "te-1"],
  };

  const advanced = advanceToUserTurn(state, lineupPlayers, ranked);

  expect(advanced.picks[3]).toBe("rb-1");
});

test("historical replay applies the starter-slot rule to regenerated opponents", () => {
  const settings = {
    ...DEFAULT_MOCK_DRAFT_SETTINGS,
    teamCount: 2,
    draftPosition: 1,
    seed: "replay-fills-rb",
    craziness: 0.0001,
    positionRisk: 0.0001,
    byeRisk: 0.0001,
    roster: rosterWith({ QB: 1, RB: 1, BENCH: 2 }),
  };
  const ranked = [
    "te-1",
    "qb-1",
    "qb-2",
    "rb-3",
    "wr-1",
    "wr-2",
    "rb-1",
  ];
  const state = {
    settings,
    picks: ["te-1", "qb-1", "qb-2", "wr-1", "wr-2", "rb-1"],
  };

  const changed = nudgeHistoricalPick(
    state,
    3,
    "better",
    lineupPlayers,
    ranked
  );

  expect(changed.picks[3]).toBe("rb-3");
  expect(changed.picks[5]).toBe("rb-1");
});

test("historical baseline does not invent unsupported bye-week avoidance", () => {
  const base = {
    ...DEFAULT_MOCK_DRAFT_SETTINGS,
    teamCount: 2,
    draftPosition: 1,
    seed: "bye",
    craziness: 0.0001,
    positionRisk: 0.0001,
    roster: { QB: 2, RB: 0, WR: 0, TE: 0, FLEX: 0, SUPERFLEX: 0, DST: 0, K: 0, BENCH: 0 },
  };
  const byeRanking = ["1", "5", "11", "20"];
  const low = makeUserPick(
    { settings: { ...base, byeRisk: 0.0001 }, picks: [] },
    "20",
    players,
    byeRanking
  );
  const high = makeUserPick(
    { settings: { ...base, byeRisk: 10000 }, picks: [] },
    "20",
    players,
    byeRanking
  );

  expect(low.picks.slice(1, 3)).toEqual(["1", "5"]);
  expect(high.picks.slice(1, 3)).toEqual(low.picks.slice(1, 3));
});

test("craziness expands reaches while remaining seed deterministic", () => {
  const oneRound = { QB: 1, RB: 0, WR: 0, TE: 0, FLEX: 0, SUPERFLEX: 0, DST: 0, K: 0, BENCH: 0 };
  const lowRanks: number[] = [];
  const highRanks: number[] = [];
  for (let index = 0; index < 20; index += 1) {
    const seed = `crazy-${index}`;
    const low = advanceToUserTurn(
      {
        settings: {
          ...DEFAULT_MOCK_DRAFT_SETTINGS,
          teamCount: 2,
          draftPosition: 2,
          seed,
          craziness: 0.0001,
          roster: oneRound,
        },
        picks: [],
      },
      players,
      ranking
    );
    const high = advanceToUserTurn(
      {
        settings: {
          ...DEFAULT_MOCK_DRAFT_SETTINGS,
          teamCount: 2,
          draftPosition: 2,
          seed,
          craziness: 10000,
          roster: oneRound,
        },
        picks: [],
      },
      players,
      ranking
    );
    lowRanks.push(ranking.indexOf(low.picks[0]) + 1);
    highRanks.push(ranking.indexOf(high.picks[0]) + 1);
    expect(
      advanceToUserTurn(
        {
          settings: high.settings,
          picks: [],
        },
        players,
        ranking
      )
    ).toEqual(high);
  }

  expect(Math.max(...lowRanks)).toBe(1);
  expect(Math.max(...highRanks)).toBeGreaterThan(3);
});

test("overall rank gaps matter when only two players remain", () => {
  const choicePlayers = Object.fromEntries(
    Array.from({ length: 6 }, (_, index) => {
      const id = String(index + 1);
      return [id, { id, position: "WR", byeWeek: 8 } as MockDraftPlayer];
    })
  );
  const choiceRanking = Object.keys(choicePlayers);
  const settings = {
    ...DEFAULT_MOCK_DRAFT_SETTINGS,
    teamCount: 6,
    draftPosition: 6,
    roster: {
      QB: 0,
      RB: 0,
      WR: 1,
      TE: 0,
      FLEX: 0,
      SUPERFLEX: 0,
      DST: 0,
      K: 0,
      BENCH: 0,
    },
  };
  let rankOneWins = 0;
  let rankTwoWins = 0;

  for (let index = 0; index < 10_000; index += 1) {
    const seed = `overall-rank-gap-${index}`;
    const rankOneChoice = advanceToUserTurn(
      {
        settings: { ...settings, seed },
        picks: ["2", "3", "4", "5"],
      },
      choicePlayers,
      choiceRanking
    ).picks[4];
    const rankTwoChoice = advanceToUserTurn(
      {
        settings: { ...settings, seed },
        picks: ["1", "3", "4", "5"],
      },
      choicePlayers,
      choiceRanking
    ).picks[4];

    if (rankOneChoice === "1") rankOneWins += 1;
    if (rankTwoChoice === "2") rankTwoWins += 1;
  }

  expect(rankOneWins).toBeGreaterThan(rankTwoWins + 200);
});

test("historical craziness stays tight early and expands in later rounds without a cap", () => {
  const reachPlayers = Object.fromEntries(
    Array.from({ length: 300 }, (_, index) => {
      const id = String(index + 100);
      return [id, { id, position: "WR", byeWeek: 8 } as MockDraftPlayer];
    })
  );
  const reachRanking = Object.keys(reachPlayers);
  const fifteenRounds = {
    QB: 0,
    RB: 0,
    WR: 1,
    TE: 0,
    FLEX: 0,
    SUPERFLEX: 0,
    DST: 0,
    K: 0,
    BENCH: 14,
  };
  const earlyRanks: number[] = [];
  const lateRanks: number[] = [];
  const uncappedRanks: number[] = [];

  for (let index = 0; index < 200; index += 1) {
    const early = advanceToUserTurn(
      {
        settings: {
          ...DEFAULT_MOCK_DRAFT_SETTINGS,
          teamCount: 10,
          draftPosition: 2,
          seed: `round-aware-${index}`,
          roster: fifteenRounds,
        },
        picks: [],
      },
      reachPlayers,
      reachRanking
    );
    const latePrefix = reachRanking.slice(0, 130);
    const late = advanceToUserTurn(
      {
        settings: {
          ...early.settings,
          draftPosition: 9,
        },
        picks: latePrefix,
      },
      reachPlayers,
      reachRanking
    );
    const uncapped = advanceToUserTurn(
      {
        settings: {
          ...early.settings,
          craziness: 10000,
          seed: `uncapped-${index}`,
        },
        picks: [],
      },
      reachPlayers,
      reachRanking
    );

    earlyRanks.push(reachRanking.indexOf(early.picks[0]) + 1);
    lateRanks.push(
      reachRanking.slice(130).indexOf(late.picks[130]) + 1
    );
    uncappedRanks.push(reachRanking.indexOf(uncapped.picks[0]) + 1);
  }

  const mean = (values: number[]) =>
    values.reduce((sum, value) => sum + value, 0) / values.length;

  expect(getMockDraftTemperature(14, 1)).toBeGreaterThan(
    getMockDraftTemperature(1, 1)
  );
  expect(mean(earlyRanks)).toBeLessThan(3);
  expect(mean(lateRanks)).toBeGreaterThan(mean(earlyRanks) * 4);
  expect(Math.max(...uncappedRanks)).toBeGreaterThan(100);
});
