import { render, screen, within } from "@testing-library/react";
import { vi } from "vitest";

import { WrappedType } from "../../FetchWrapped";
import {
  getOwnershipMoves,
  groupOwnershipMoves,
  TradesForSeason,
} from "./Trades";

vi.mock("..", () => ({ selectedWrapped: vi.fn() }));
vi.mock("../../Draft", () => ({ POSITION_COLORS: {} }));

function makeWrapped(): WrappedType {
  const roster = (weekNum: string, rostered: string[]) => ({
    projections: {},
    rostered,
    starting: [],
    weekNum,
  });
  const team = (
    id: string,
    name: string,
    rosters: Record<string, ReturnType<typeof roster>>
  ) => ({ draft: [], id, name, rosters });
  const player = (id: string, name: string, position: string) => ({
    average: 0,
    id,
    name,
    nflTeamId: "1",
    position,
    projection: 0,
    scores: { "1": 10, "2": 12 },
    total: 22,
  });

  return {
    ffMatchups: {},
    ffTeams: {
      a: team("a", "Alpha", {
        "1": roster("1", ["one", "two", "ghost"]),
        "2": roster("2", ["two", "three", "four"]),
        "3": roster("3", ["two", "five"]),
      }),
      b: team("b", "Bravo", {
        "1": roster("1", ["three", "four"]),
        "2": roster("2", ["one"]),
        "3": roster("3", ["one", "four"]),
      }),
      c: team("c", "Charlie", {
        "1": roster("1", ["five"]),
        "2": roster("2", ["five", "new"]),
        "3": roster("3", ["three"]),
      }),
    },
    nflPlayers: {
      five: player("five", "Five", "TE"),
      four: player("four", "Four", "RB"),
      new: player("new", "New", "QB"),
      one: player("one", "One", "WR"),
      three: player("three", "Three", "QB"),
      two: player("two", "Two", "RB"),
    },
    nflTeams: {},
    year: "2025",
  };
}

test("derives only direct week-over-week ownership moves", () => {
  const moves = getOwnershipMoves(makeWrapped());

  expect(moves).toEqual(
    expect.arrayContaining([
      { fromTeamId: "a", playerId: "one", toTeamId: "b", weekNum: "2" },
      { fromTeamId: "b", playerId: "three", toTeamId: "a", weekNum: "2" },
      { fromTeamId: "b", playerId: "four", toTeamId: "a", weekNum: "2" },
      { fromTeamId: "a", playerId: "three", toTeamId: "c", weekNum: "3" },
      { fromTeamId: "a", playerId: "four", toTeamId: "b", weekNum: "3" },
      { fromTeamId: "c", playerId: "five", toTeamId: "a", weekNum: "3" },
    ])
  );
  expect(moves).toHaveLength(6);
  expect(moves.some((move) => move.playerId === "ghost")).toBe(false);
  expect(moves.some((move) => move.playerId === "new")).toBe(false);
});

test("groups uneven exchanges by week and manager pair", () => {
  const weeks = groupOwnershipMoves(makeWrapped());

  expect(
    weeks.map((week) => [
      week.weekNum,
      week.exchangeCount,
      week.directMoveCount,
      week.moveCount,
    ])
  ).toEqual([
    ["2", 1, 0, 3],
    ["3", 1, 1, 3],
  ]);
  expect(
    weeks[0].deals[0].sides.map((side) => [
      side.teamId,
      side.received.map((move) => move.playerId),
    ])
  ).toEqual([
    ["a", ["four", "three"]],
    ["b", ["one"]],
  ]);
  expect(
    weeks[1].deals.map((deal) =>
      deal.sides.map((side) => side.teamId)
    )
  ).toEqual([
    ["a", "b"],
    ["a", "c"],
  ]);
});

test("renders weekly deal summaries and explicit receiving sides", () => {
  render(<TradesForSeason wrapped={makeWrapped()} />);

  const weekTwo = screen.getByTestId("trade-week-2");
  expect(within(weekTwo).getByText("Week 2")).toBeInTheDocument();
  expect(
    within(weekTwo).getByText("1 exchange · 3 players moved")
  ).toBeInTheDocument();
  expect(
    within(weekTwo).getByRole("region", { name: "Alpha receives" })
  ).toHaveTextContent("FourRBThreeQB");
  expect(
    within(weekTwo).getByRole("region", { name: "Bravo receives" })
  ).toHaveTextContent("OneWR");
});

test("shows only exchanges and counts only their players", () => {
  render(<TradesForSeason wrapped={makeWrapped()} />);

  const weekThree = screen.getByTestId("trade-week-3");
  expect(
    within(weekThree).getByText("1 exchange · 2 players moved")
  ).toBeInTheDocument();
  expect(within(weekThree).queryByTestId("trade-deal-3:a:b")).toBeNull();
  expect(within(weekThree).getByTestId("trade-deal-3:a:c"))
    .toHaveTextContent("Exchange · 2 players moved");
  expect(within(weekThree).queryByText("Four")).toBeNull();
  expect(screen.queryByText(/direct move/i)).toBeNull();
});

test("omits weeks containing only one-way moves", () => {
  const wrapped = makeWrapped();
  wrapped.ffTeams.a.rosters["3"].rostered = ["two"];

  render(<TradesForSeason wrapped={wrapped} />);

  expect(screen.getByTestId("trade-week-2")).toBeInTheDocument();
  expect(screen.queryByTestId("trade-week-3")).toBeNull();
});

test("renders an empty state when there are only one-way moves", () => {
  const wrapped = makeWrapped();
  Object.values(wrapped.ffTeams).forEach((team) => {
    delete team.rosters["3"];
  });
  wrapped.ffTeams.b.rosters["2"].rostered = [];

  render(<TradesForSeason wrapped={wrapped} />);

  expect(screen.getByText("No exchanges found for 2025.")).toBeInTheDocument();
  expect(screen.queryByTestId("trade-week-2")).toBeNull();
});

test("renders an empty state when ownership does not change", () => {
  const wrapped = makeWrapped();
  Object.values(wrapped.ffTeams).forEach((team) => {
    team.rosters = { "1": team.rosters["1"] };
  });

  render(<TradesForSeason wrapped={wrapped} />);

  expect(
    screen.getByText("No exchanges found for 2025.")
  ).toBeInTheDocument();
});
