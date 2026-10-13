import { fireEvent, render, screen } from "@testing-library/react";
import type { WrappedType } from "../../FetchWrapped";
import allWrapped from "../allWrapped";
import { wrappedModules } from "..";
import {
  ALL_YEARS,
  completedWeeks,
  managerKey,
  normalizeYear,
  scopeLabel,
  seasonOnlyViews,
} from "../scope";
import { buildHistory, managerReports } from "./allYearsData";
import { aggregateReports } from "./allYearsReports";
import { AggregateTable } from "./AllYears";

function season(
  year: string,
  scores: number[],
  opponent: number[],
  id = "1",
): WrappedType {
  const players = Object.fromEntries(
    [
      ["a", scores],
      ["b", opponent],
    ].map(([key, values]) => {
      const pid = key as string,
        points = values as number[];
      return [
        pid,
        {
          id: pid,
          name: pid,
          position: "QB",
          nflTeamId: pid,
          scores: Object.fromEntries([
            ["0", 9999],
            ...points.map((s, i) => [String(i + 1), s]),
          ]),
          total: 9999,
          average: 0,
          projection: 0,
        },
      ];
    }),
  );
  return {
    year,
    latestScoringPeriod: scores.length,
    nflPlayers: players,
    nflTeams: {},
    ffTeams: Object.fromEntries(
      [
        [id, "a"],
        ["9", "b"],
      ].map(([tid, pid]) => {
        const rosters: WrappedType["ffTeams"][string]["rosters"] = {
          0: { weekNum: "0", starting: [], rostered: [pid], projections: {} },
        };
        scores.forEach((_, i) => {
          rosters[i + 1] = {
            weekNum: String(i + 1),
            starting: [pid],
            rostered: [pid],
            projections: { [pid]: 10 },
          };
        });
        return [
          tid,
          { id: tid, name: `Team ${tid} ${year}`, draft: [], rosters },
        ];
      }),
    ),
    ffMatchups: Object.fromEntries(
      scores.map((_, i) => [String(i + 1), [[id, "9"]]]),
    ),
  };
}

test("scope validates years and distinguishes manager turnover", () => {
  const seasons = { 2025: season("2025", [10], [8]) };
  expect(normalizeYear("bogus", seasons, "2025")).toBe("2025");
  expect(normalizeYear(ALL_YEARS, seasons, "2025")).toBe("all");
  expect(scopeLabel("all", ["2026", "2021"])).toBe("All years (2021–2026)");
  expect(managerKey("2", "2023")).not.toBe(managerKey("2", "2024"));
  expect(managerKey("2", "2024")).not.toBe(managerKey("2", "2025"));
  expect(managerKey("2", "2025")).toBe(managerKey("2", "2026"));
});

test("pooled totals and rates weight weeks, preserve ties, and exclude week zero", () => {
  const h = buildHistory({
    2024: season("2024", [10], [10]),
    2025: season("2025", [20, 30, 40], [1, 50, 10]),
  });
  const r = managerReports(h, "ManagerPlot", 10)![0].rows.find((r) =>
    String(r[0]).startsWith("Team 1"),
  )!;
  expect(r.slice(1, 9)).toEqual([4, 100, 25, 4, 2, 1, 1, 50]);
  const unique = managerReports(h, "UniquesStarted", 10)![0].rows.find((r) =>
    String(r[0]).startsWith("Team 1"),
  )!;
  expect(unique[2]).toBe(1);
  expect(h.teams.every((t) => Number(t.week) > 0)).toBe(true);
  expect(
    aggregateReports(h, "HeadToHead")[0]
      .rows.find((r) => String(r[0]).startsWith("Team 1"))
      ?.slice(2, 7),
  ).toEqual([4, 2, 1, 1, 50]);
});

test("no unfinished weeks and no merging different managers with a reused ID", () => {
  const old = season("2023", [10, 50], [8, 20], "2");
  old.latestScoringPeriod = 1;
  const next = season("2024", [20], [8], "2");
  const empty = season("2026", [90], [40], "2");
  empty.latestScoringPeriod = 0;
  expect(completedWeeks(empty)).toEqual([]);
  const h = buildHistory({ 2023: old, 2024: next, 2026: empty });
  expect(h.teams).toHaveLength(4);
  expect(
    new Set(h.teams.filter((t) => t.team.id === "2").map((t) => t.manager))
      .size,
  ).toBe(2);
  expect(
    aggregateReports(h, "SqueezesAndStomps")[0].rows.map((r) => r[0]),
  ).toEqual(["2023", "2024"]);
});

test("points allowed uses weighted game counts and omits absent positional data", () => {
  const a = season("2024", [10], [8]),
    b = season("2025", [20, 30, 40], [1, 2, 3]);
  for (const w of [a, b])
    w.nflTeams = {
      def: {
        id: "def",
        name: "Defense",
        byeWeek: 0,
        nflGamesByScoringPeriod: Object.fromEntries(
          completedWeeks(w).map((week) => [
            week,
            {
              opp: "a",
              fieldGoals: [],
              pointsAllowed: 0,
              yardsAllowed: 0,
              punts: [],
              punter: "",
            },
          ]),
        ),
      },
    };
  a.nflTeams.def.name = "Previous franchise name";
  const row = aggregateReports(
    buildHistory({ 2024: a, 2025: b }),
    "PointsAgainst",
  )[0].rows[0];
  expect(row.slice(0, 5)).toEqual(["Defense", "QB", 4, 100, 25]);
});

test("no ownership moves are invented across seasons", () => {
  const a = season("2024", [10], [8]),
    b = season("2025", [20], [8]);
  b.ffTeams["1"].rosters[1].rostered = ["b"];
  b.ffTeams["9"].rosters[1].rostered = ["a"];
  expect(
    aggregateReports(buildHistory({ 2024: a, 2025: b }), "Trades")[0].rows,
  ).toEqual([]);
});

test("every remaining view has an explicit scope policy and every pooled report handles real history", () => {
  for (const removed of [
    "MondayNight",
    "StandingsPrediction",
    "StdDev",
    "Punts",
  ])
    expect(wrappedModules).not.toHaveProperty(removed);
  const specialized = new Set([
    "PlayerStats",
    "PositionTrends",
    "SpiciestMatchups",
    "json",
  ]);
  const h = buildHistory(allWrapped);
  for (const tab of Object.keys(wrappedModules)) {
    if (seasonOnlyViews[tab] || specialized.has(tab)) continue;
    const reports = aggregateReports(h, tab);
    expect(reports.length, tab).toBeGreaterThan(0);
    for (const r of reports)
      for (const row of r.rows) {
        expect(row.length, `${tab}: ${r.title}`).toBe(r.columns.length);
        for (const value of row)
          if (typeof value === "number")
            expect(Number.isFinite(value), tab).toBe(true);
      }
  }
}, 20000);

test("aggregate tables sort numerically, filter, and preserve year context", () => {
  render(
    <AggregateTable
      report={{
        title: "Records",
        columns: ["Year", "Points"],
        rows: [
          [2024, 2],
          [2025, 10],
        ],
      }}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Points" }));
  expect(screen.getAllByRole("row")[1]).toHaveTextContent("202510");
  fireEvent.change(screen.getByRole("textbox"), { target: { value: "2024" } });
  expect(screen.getAllByRole("row")).toHaveLength(2);
  expect(screen.getAllByRole("row")[1]).toHaveTextContent("20242");
});
