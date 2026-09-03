import { render, screen, within } from "@testing-library/react";
import { expect, test } from "vitest";

import { WrappedType } from "../../FetchWrapped";
import { wrappedModules } from "..";
import { NFLTeamsForSeason } from "./NFLTeams";

const emptyGame = {
  fieldGoals: [],
  pointsAllowed: 0,
  yardsAllowed: 0,
  punts: [],
  punter: "",
};

const wrapped: WrappedType = {
  year: "2026",
  latestScoringPeriod: 0,
  nflPlayers: {
    qb1: {
      id: "qb1",
      name: "Josh Allen",
      nflTeamId: "2",
      position: "QB",
      scores: {},
      projection: 0,
      total: 0,
      average: 0,
    },
    qb2: {
      id: "qb2",
      name: "Backup Bill",
      nflTeamId: "2",
      position: "QB",
      scores: {},
      projection: 0,
      total: 0,
      average: 0,
    },
    rb1: {
      id: "rb1",
      name: "Jet Runner",
      nflTeamId: "20",
      position: "RB",
      scores: {},
      projection: 0,
      total: 0,
      average: 0,
    },
  },
  nflTeams: {
    "0": { id: "0", name: "FA", byeWeek: 0, nflGamesByScoringPeriod: {} },
    "2": {
      id: "2",
      name: "Bills",
      byeWeek: 2,
      nflGamesByScoringPeriod: {
        "1": { ...emptyGame, opp: "20" },
      },
    },
    "20": {
      id: "20",
      name: "Jets",
      byeWeek: 2,
      nflGamesByScoringPeriod: {
        "1": { ...emptyGame, opp: "2" },
      },
    },
  },
  ffTeams: {},
  ffMatchups: {},
};

test("renders slash-searchable team bubbles with ranked depth charts and schedules", () => {
  render(
    <NFLTeamsForSeason
      wrapped={wrapped}
      composite={{ qb1: 1, rb1: 2, qb2: 3 }}
    />
  );

  const bills = screen.getByTestId("nfl-team-2");
  expect(within(bills).getByRole("heading", { name: "/Bills" })).toBeVisible();
  expect(within(bills).getByText("Josh Allen — 1 ADP · QB1")).toBeVisible();
  expect(within(bills).getByText("Backup Bill — 3 ADP · QB2")).toBeVisible();

  const players = within(bills).getByRole("list", {
    name: "Bills depth chart",
  });
  expect(within(players).getAllByRole("listitem")).toHaveLength(2);

  const schedule = within(bills).getByRole("list", {
    name: "Bills schedule",
  });
  const weeks = within(schedule).getAllByRole("listitem");
  expect(weeks).toHaveLength(18);
  expect(within(weeks[0]).getByText("W1")).toBeVisible();
  expect(within(weeks[0]).getByText("Jets")).toBeVisible();
  expect(within(weeks[1]).getByText("W2")).toBeVisible();
  expect(within(weeks[1]).getByText("BYE")).toBeVisible();
  expect(weeks[1]).toHaveClass("nfl-team-schedule-bye");
  expect(screen.queryByText("/FA")).not.toBeInTheDocument();
});

test("registers NFLTeams directly after SpiciestMatchups", () => {
  const names = Object.keys(wrappedModules);
  expect(names.indexOf("NFLTeams")).toBe(names.indexOf("SpiciestMatchups") + 1);
});
