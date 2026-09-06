import { render, screen, within } from "@testing-library/react";
import { vi } from "vitest";

import { WrappedType } from "../../FetchWrapped";

vi.mock("..", () => ({
  bubbleStyle: {
    border: "2px solid var(--night-border)",
    borderRadius: "1em",
    margin: "0.5em",
    padding: "0.7em",
  },
  groupByF: <T,>(items: T[], keyFor: (item: T) => string) =>
    items.reduce((groups, item) => {
      const key = keyFor(item);
      (groups[key] ??= []).push(item);
      return groups;
    }, {} as Record<string, T[]>),
  selectedWrapped: vi.fn(),
  selectedYear: "2099",
}));

vi.mock("../../Draft", () => ({
  getCompositeForYear: vi.fn(),
}));

import { formatDraftBoardSummary, getDraftBoardColumns } from "./DraftBoard";
import { getPerformance } from "./DraftValue";
import {
  getReachStealVerdict,
  REACH_STEAL_COLORS,
  ReachesAndStealsForSeason,
} from "./ReachesAndSteals";

function player(id: string, name: string, position = "WR") {
  return {
    id,
    name,
    nflTeamId: "1",
    position,
    scores: { "0": 100, "1": 10, "2": 20 },
    projection: 0,
    total: 100,
    average: 15,
  };
}

const emptyRoster = {
  "0": { weekNum: "0", starting: [], rostered: [], projections: {} },
};

const wrapped: WrappedType = {
  year: "2099",
  latestScoringPeriod: 2,
  nflPlayers: {
    "101": player("101", "Reach Star"),
    "102": player("102", "At Cost"),
    "103": player("103", "Kicker", "K"),
    "104": player("104", "No Composite"),
    "105": player("105", "Steal Star"),
    "106": player("106", "Defense", "DST"),
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
      name: "Alpha Manager With A Long Name",
      draft: [
        { playerId: 101, pickIndex: 4 },
        { playerId: 102, pickIndex: 9 },
        { playerId: 103, pickIndex: 19 },
      ],
      rosters: emptyRoster,
    },
    b: {
      id: "b",
      name: "Beta Manager",
      draft: [
        { playerId: 104, pickIndex: 11 },
        { playerId: 105, pickIndex: 18 },
        { playerId: 106, pickIndex: 20 },
      ],
      rosters: emptyRoster,
    },
  },
  ffMatchups: {},
};

const composite = {
  "101": 15,
  "102": 10,
  "103": 30,
  "105": 10,
  "106": 15,
};

test("classifies picks from overall pick number versus composite ADP", () => {
  expect(getReachStealVerdict(4, 15)).toBe("reach");
  expect(getReachStealVerdict(18, 10)).toBe("steal");
  expect(getReachStealVerdict(9, 10)).toBe("neutral");
  expect(getReachStealVerdict(11, undefined)).toBe("neutral");
});

test("renders manager columns in permanent draft order with DraftBoard summaries", () => {
  render(
    <ReachesAndStealsForSeason
      year="2099"
      wrapped={wrapped}
      composite={composite}
    />
  );

  const board = screen.getByTestId("reaches-and-steals-board");
  expect(board).not.toHaveAttribute("role", "button");
  expect(board).not.toHaveAttribute("tabindex");
  expect(screen.queryByText(/click board to switch/i)).not.toBeInTheDocument();

  const firstColumn = screen.getByTestId("draft-board-column-a");
  const pickIndexes = within(firstColumn)
    .getAllByTestId(/^reach-steal-pick-/)
    .map((element) =>
      Number(element.dataset.testid?.replace("reach-steal-pick-", ""))
    );
  expect(pickIndexes).toEqual([4, 9, 19]);

  const firstEntry = getDraftBoardColumns(
    wrapped,
    getPerformance(wrapped),
    composite
  )[0][0];
  expect(
    within(firstColumn).getByText(
      formatDraftBoardSummary({
        pickIndex: firstEntry.pick.pickIndex,
        compositeRank: firstEntry.compositeRank,
        position: firstEntry.player.position,
        draftRank: firstEntry.performance?.draftRank,
        performanceRank: firstEntry.performance?.totalRank,
      })
    )
  ).toBeVisible();
});

test("colors reaches, steals, at-cost picks, and missing ADP", () => {
  render(
    <ReachesAndStealsForSeason
      year="2099"
      wrapped={wrapped}
      composite={composite}
    />
  );

  expect(screen.getByLabelText("Reach Star: reach")).toHaveStyle({
    backgroundColor: REACH_STEAL_COLORS.reach,
  });
  expect(screen.getByLabelText("Steal Star: steal")).toHaveStyle({
    backgroundColor: REACH_STEAL_COLORS.steal,
  });
  expect(screen.getByLabelText("At Cost: neutral")).toHaveStyle({
    backgroundColor: REACH_STEAL_COLORS.neutral,
  });
  expect(screen.getByLabelText("No Composite: neutral")).toHaveStyle({
    backgroundColor: REACH_STEAL_COLORS.neutral,
  });
});

test("includes kickers and defenses", () => {
  render(
    <ReachesAndStealsForSeason
      year="2099"
      wrapped={wrapped}
      composite={composite}
    />
  );

  expect(screen.getByText("Kicker")).toBeVisible();
  expect(screen.getByText("Defense")).toBeVisible();
});

test("distinguishes unavailable ADP from a draft that has not happened", () => {
  const { rerender } = render(
    <ReachesAndStealsForSeason
      year="2022"
      wrapped={wrapped}
      composite={undefined}
    />
  );
  expect(screen.getByText(/ADP unavailable for 2022/i)).toBeVisible();

  rerender(
    <ReachesAndStealsForSeason
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
