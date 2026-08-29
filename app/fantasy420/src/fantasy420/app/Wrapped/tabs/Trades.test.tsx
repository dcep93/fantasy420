import { render, screen, within } from "@testing-library/react";

import { WrappedType } from "../../FetchWrapped";
import {
  getOwnershipMoves,
  groupOwnershipMoves,
  TradesForSeason,
} from "./Trades";

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

test("renders one-way ownership changes as a compact from-to move", () => {
  render(<TradesForSeason wrapped={makeWrapped()} />);

  const weekThree = screen.getByTestId("trade-week-3");
  expect(
    within(weekThree).getByText(
      "1 exchange · 1 direct move · 3 players moved"
    )
  ).toBeInTheDocument();
  const alphaToBravo = within(weekThree).getByTestId("trade-deal-3:a:b");
  expect(alphaToBravo).toHaveTextContent(
    "Direct move · 1 player movedFromAlpha→ToBravoFourRB"
  );
  expect(alphaToBravo).not.toHaveTextContent("No players received");
});

test("renders an empty state when ownership does not change", () => {
  const wrapped = makeWrapped();
  Object.values(wrapped.ffTeams).forEach((team) => {
    team.rosters = { "1": team.rosters["1"] };
  });

  render(<TradesForSeason wrapped={wrapped} />);

  expect(
    screen.getByText("No direct ownership moves found for 2025.")
  ).toBeInTheDocument();
});
