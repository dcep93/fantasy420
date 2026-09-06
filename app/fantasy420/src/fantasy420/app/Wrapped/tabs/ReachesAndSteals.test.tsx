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
  getReachStealColor,
  getReachStealResult,
  getReachStealVerdict,
  REACH_STEAL_COLORS,
  REACH_STEAL_MAX_GAP,
  REACH_STEAL_MIN_INTENSITY,
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

  expect(getReachStealResult(4, 15)).toMatchObject({
    gap: -10,
    label: "Reach 10",
    verdict: "reach",
  });
  expect(getReachStealResult(18, 10)).toMatchObject({
    gap: 9,
    label: "Steal 9",
    verdict: "steal",
  });
  expect(getReachStealResult(4, 14.5).label).toBe("Reach 9.5");
  expect(getReachStealResult(9, 10).label).toBe("At ADP");
  expect(getReachStealResult(11, undefined).label).toBe("No ADP");
});

test("increases intensity with magnitude and clamps at thirty picks", () => {
  (["reach", "steal"] as const).forEach((verdict) => {
    const small = getReachStealColor(verdict, 1);
    const medium = getReachStealColor(verdict, 15);
    const maximum = getReachStealColor(verdict, REACH_STEAL_MAX_GAP);
    const outlier = getReachStealColor(verdict, 100);

    expect(small.intensity).toBeGreaterThan(REACH_STEAL_MIN_INTENSITY);
    expect(small.intensity).toBeLessThan(medium.intensity);
    expect(medium.intensity).toBeLessThan(maximum.intensity);
    expect(maximum.intensity).toBe(1);
    expect(outlier).toEqual(maximum);
    expect(new Set([small.color, medium.color, maximum.color]).size).toBe(3);
  });
});

function relativeLuminance(color: string): number {
  const channels = [1, 3, 5].map(
    (offset) => Number.parseInt(color.slice(offset, offset + 2), 16) / 255
  );
  return channels
    .map((channel) =>
      channel <= 0.04045
        ? channel / 12.92
        : ((channel + 0.055) / 1.055) ** 2.4
    )
    .reduce(
      (total, channel, index) =>
        total + channel * [0.2126, 0.7152, 0.0722][index],
      0
    );
}

function contrastRatio(first: string, second: string): number {
  const luminances = [relativeLuminance(first), relativeLuminance(second)].sort(
    (left, right) => right - left
  );
  return (luminances[0] + 0.05) / (luminances[1] + 0.05);
}

test("keeps every sampled gradient color legible with the card text", () => {
  const cardText = "#111827";
  const backgrounds = [
    REACH_STEAL_COLORS.neutral,
    ...(["reach", "steal"] as const).flatMap((verdict) =>
      [1, 5, 10, 20, 30, 100].map(
        (magnitude) => getReachStealColor(verdict, magnitude).color
      )
    ),
  ];

  backgrounds.forEach((background) => {
    expect(contrastRatio(background, cardText)).toBeGreaterThanOrEqual(4.5);
  });
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

test("shows a legend and labels reaches, steals, at-cost picks, and missing ADP", () => {
  render(
    <ReachesAndStealsForSeason
      year="2099"
      wrapped={wrapped}
      composite={composite}
    />
  );

  const legend = screen.getByLabelText("Reach and steal color legend");
  expect(legend).toHaveTextContent("Reach");
  expect(legend).toHaveTextContent("At/No ADP");
  expect(legend).toHaveTextContent("Steal");
  expect(legend).toHaveTextContent("Stronger color = larger ADP gap");

  expect(
    screen.getByRole("group", { name: "Reach Star: Reach 10" })
  ).toHaveStyle({
    backgroundColor: getReachStealResult(4, 15).color,
  });
  expect(
    screen.getByRole("group", { name: "Steal Star: Steal 9" })
  ).toHaveStyle({
    backgroundColor: getReachStealResult(18, 10).color,
  });
  expect(screen.getByRole("group", { name: "At Cost: At ADP" })).toHaveStyle({
    backgroundColor: REACH_STEAL_COLORS.neutral,
  });
  expect(
    screen.getByRole("group", { name: "No Composite: No ADP" })
  ).toHaveStyle({
    backgroundColor: REACH_STEAL_COLORS.neutral,
  });
  expect(screen.getAllByText("Reach 10")).toHaveLength(2);
  expect(screen.getByText("Steal 9")).toBeVisible();
  expect(screen.getByText("At ADP")).toBeVisible();
  expect(screen.getByText("No ADP")).toBeVisible();
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
