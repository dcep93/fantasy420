import { render, screen, within } from "@testing-library/react";
import { vi } from "vitest";

import { WrappedType } from "../../FetchWrapped";

vi.mock("..", () => ({
  selectedWrapped: vi.fn(),
  selectedYear: "2099",
  groupByF: <T,>(items: T[], keyFor: (item: T) => string) =>
    items.reduce((groups, item) => {
      const key = keyFor(item);
      (groups[key] ??= []).push(item);
      return groups;
    }, {} as Record<string, T[]>),
}));

vi.mock("../../Draft", () => ({
  getCompositeForYear: vi.fn(),
  selectedDraft: vi.fn(),
}));

import {
  DraftDayReachesAndStealsForSeason,
  getDraftMarketAnalysis,
  sortByMarketGap,
} from "./DraftDayReachesAndSteals";

function player(
  id: string,
  name: string,
  total: number,
  average: number,
  weekOne: number,
  weekTwo: number
) {
  return {
    id,
    name,
    nflTeamId: "1",
    position: "WR",
    scores: { "0": total, "1": weekOne, "2": weekTwo },
    projection: 0,
    total,
    average,
  };
}

const wrapped: WrappedType = {
  year: "2099",
  latestScoringPeriod: 2,
  nflPlayers: {
    "101": player("101", "Reach Star", 300, 20, 20, 30),
    "102": player("102", "Reach Bust", 5, 1, 1, 0),
    "103": player("103", "At Cost", 100, 8, 8, 7),
    "104": player("104", "No Composite", 10, 2, 2, 1),
    "105": player("105", "Steal Bust", 40, 4, 4, 3),
    "106": player("106", "Steal Star", 250, 18, 18, 22),
  },
  nflTeams: {
    "1": {
      id: "1",
      name: "Moon City",
      byeWeek: 9,
      nflGamesByScoringPeriod: {},
    },
  },
  ffTeams: {
    a: {
      id: "a",
      name: "Alpha Manager",
      draft: [
        { playerId: 101, pickIndex: 4 },
        { playerId: 103, pickIndex: 9 },
        { playerId: 105, pickIndex: 17 },
      ],
      rosters: {
        "0": { weekNum: "0", starting: [], rostered: [], projections: {} },
        "1": {
          weekNum: "1",
          starting: ["101", "105"],
          rostered: ["101", "105"],
          projections: {},
        },
        "2": {
          weekNum: "2",
          starting: ["105"],
          rostered: ["105"],
          projections: {},
        },
      },
    },
    b: {
      id: "b",
      name: "Beta Manager",
      draft: [
        { playerId: 102, pickIndex: 5 },
        { playerId: 104, pickIndex: 11 },
        { playerId: 106, pickIndex: 18 },
      ],
      rosters: {
        "0": { weekNum: "0", starting: [], rostered: [], projections: {} },
        "1": {
          weekNum: "1",
          starting: ["102", "106"],
          rostered: ["102", "106"],
          projections: {},
        },
        "2": {
          weekNum: "2",
          starting: ["101", "106"],
          rostered: ["101", "106"],
          projections: {},
        },
      },
    },
  },
  ffMatchups: {},
};

const composite = {
  "101": 15,
  "102": 21,
  "103": 10,
  "105": 4,
  "106": 10,
};

test("classifies picks only by composite ADP versus actual selection", () => {
  const analysis = getDraftMarketAnalysis(wrapped, composite);

  expect(analysis.totalPicks).toBe(6);
  expect(analysis.unmatched).toEqual([
    {
      playerName: "No Composite",
      managerName: "Beta Manager",
      pickNumber: 12,
    },
  ]);

  expect(
    Object.fromEntries(
      analysis.entries.map((entry) => [
        entry.player.name,
        [entry.verdict, entry.gap],
      ])
    )
  ).toEqual({
    "Reach Star": ["reach", -10],
    "Reach Bust": ["reach", -15],
    "At Cost": ["at-cost", 0],
    "Steal Bust": ["steal", 14],
    "Steal Star": ["steal", 9],
  });

  expect(
    sortByMarketGap(analysis.entries, "reach").map(
      (entry) => entry.player.name
    )
  ).toEqual(["Reach Bust", "Reach Star"]);
  expect(
    sortByMarketGap(analysis.entries, "steal").map(
      (entry) => entry.player.name
    )
  ).toEqual(["Steal Bust", "Steal Star"]);
});

test("keeps performance alongside each market verdict without changing it", () => {
  const analysis = getDraftMarketAnalysis(wrapped, composite);
  const reach = analysis.entries.find(
    (entry) => entry.player.name === "Reach Star"
  )!;
  const steal = analysis.entries.find(
    (entry) => entry.player.name === "Steal Bust"
  )!;

  expect(reach.verdict).toBe("reach");
  expect(reach.player.total).toBe(300);
  expect(reach.starts).toBe(2);
  expect(reach.bestWeek).toEqual({ week: "2", points: 30 });
  expect(steal.verdict).toBe("steal");
  expect(steal.player.total).toBe(40);
});

test("renders only the reach and steal tables with ADP and performance", () => {
  render(
    <DraftDayReachesAndStealsForSeason
      year="2099"
      wrapped={wrapped}
      composite={composite}
    />
  );

  expect(screen.getAllByRole("columnheader", { name: "ADP" })).toHaveLength(2);
  expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();

  const reachRow = screen.getByText("Reach Star").closest("tr")!;
  expect(within(reachRow).getByText("10 early")).toBeVisible();
  expect(within(reachRow).getByText("300.0")).toBeVisible();
  expect(within(reachRow).getByText("20.0")).toBeVisible();
  expect(within(reachRow).getByText("W2 · 30.0")).toBeVisible();

  const stealsTable = screen.getByRole("table", {
    name: /steals, ordered by/i,
  });
  const stealRow = within(stealsTable).getByText("Steal Bust").closest("tr")!;
  expect(within(stealRow).getByText("14 late")).toBeVisible();
  expect(within(stealRow).getByText("40.0")).toBeVisible();

});

test("excludes kickers and defenses", () => {
  const kicker = { ...player("107", "Kicker", 100, 8, 8, 9), position: "K" };
  const defense = {
    ...player("108", "Defense", 120, 9, 9, 10),
    position: "DST",
  };
  const analysis = getDraftMarketAnalysis(
    {
      ...wrapped,
      nflPlayers: { ...wrapped.nflPlayers, "107": kicker, "108": defense },
      ffTeams: {
        ...wrapped.ffTeams,
        a: {
          ...wrapped.ffTeams.a,
          draft: [
            ...wrapped.ffTeams.a.draft,
            { playerId: 107, pickIndex: 19 },
            { playerId: 108, pickIndex: 20 },
          ],
        },
      },
    },
    { ...composite, "107": 100, "108": 101 }
  );

  expect(analysis.entries.map((entry) => entry.player.position)).not.toContain(
    "K"
  );
  expect(analysis.entries.map((entry) => entry.player.position)).not.toContain(
    "DST"
  );
});

test("distinguishes unavailable ADP from a draft that has not happened", () => {
  const { rerender } = render(
    <DraftDayReachesAndStealsForSeason
      year="2022"
      wrapped={wrapped}
      composite={undefined}
    />
  );
  expect(screen.getByText(/ADP unavailable for 2022/i)).toBeVisible();

  rerender(
    <DraftDayReachesAndStealsForSeason
      year="2026"
      wrapped={{
        ...wrapped,
        ffTeams: Object.fromEntries(
          Object.entries(wrapped.ffTeams).map(([id, team]) => [
            id,
            { ...team, draft: [] },
          ])
        ),
      }}
      composite={composite}
    />
  );
  expect(screen.getByText(/no draft picks yet for 2026/i)).toBeVisible();
});
