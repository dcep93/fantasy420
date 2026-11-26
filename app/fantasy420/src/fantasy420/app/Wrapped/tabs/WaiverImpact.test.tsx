import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import type { WrappedType } from "../../FetchWrapped";
import { WaiverImpactForSeason } from "./WaiverImpact";
import { wrappedCategories } from "../WrappedNavigation";
import { seasonOnlyViews } from "../scope";

vi.mock("..", () => ({ selectedWrapped: vi.fn() }));
vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  ComposedChart: ({ data, children }: any) => <div data-testid="waiver-chart"><span>{JSON.stringify(data)}</span>{children}</div>,
  Bar: ({ name }: any) => <span>{name}</span>, Line: () => null,
  CartesianGrid: () => null, XAxis: () => null, YAxis: () => null, Tooltip: () => null, Legend: () => null,
}));
afterEach(cleanup);

function fixture(): WrappedType {
  const roster = (weekNum: string, rostered: string[], starting = rostered) => ({ weekNum, rostered, starting, projections: {} });
  return { year: "2026", latestScoringPeriod: 2, nflTeams: {}, ffMatchups: {},
    ffTeams: {
      a: { id: "a", name: "Alpha", draft: [{ playerId: 1, pickIndex: 0 }], rosters: { "1": roster("1", ["1", "3"], ["1"]), "2": roster("2", ["1", "3"]) } },
      b: { id: "b", name: "Bravo", draft: [{ playerId: 2, pickIndex: 1 }], rosters: { "1": roster("1", ["2", "4", "5"]), "2": roster("2", ["2", "4", "5"]) } },
    }, nflPlayers: Object.fromEntries(["1", "2", "3", "4", "5"].map(id => [id, {
      id, name: `Player ${id}`, position: id === "4" ? "K" : "WR", nflTeamId: "1", projection: 0, total: 0, average: 0,
      scores: { "1": id === "4" ? 3 : 0, "2": id === "3" ? 20 : id === "4" ? 3 : 0 },
    }])),
  };
}

test("registers in Beta after Probability Machine and is season-only", () => {
  const tabs = wrappedCategories.find(c => c.name === "Beta")!.tabs;
  expect(tabs[0]).toBe("ProbabilityMachine");
  expect(tabs).toContain("WaiverImpact");
  expect(seasonOnlyViews.WaiverImpact).toMatch(/season/i);
});

test("sorts on quantity while preserving selected manager, then selects another manager", () => {
  render(<WaiverImpactForSeason wrapped={fixture()} />);
  const table = screen.getByRole("table", { name: "Manager leaderboard" });
  expect(within(table).getAllByRole("button").map(b => b.textContent)).toEqual(["Alpha", "Bravo"]);
  expect(screen.getByRole("heading", { name: "Alpha · waiver detail" })).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("Sort managers"), { target: { value: "pickups" } });
  expect(within(table).getAllByRole("button").map(b => b.textContent)).toEqual(["Bravo", "Alpha"]);
  expect(screen.getByRole("button", { name: "Alpha" })).toHaveAttribute("aria-pressed", "true");
  fireEvent.click(screen.getByRole("button", { name: "Bravo" }));
  expect(screen.getByRole("heading", { name: "Bravo · waiver detail" })).toBeInTheDocument();
});

test("defaults to latest recorded week and exposes bench pickups and chart quantity modes", () => {
  render(<WaiverImpactForSeason wrapped={fixture()} />);
  expect(screen.getByLabelText("Week breakdown")).toHaveValue("2");
  expect(screen.getByRole("table", { name: "Weekly waiver starters" })).toHaveTextContent("Player 3WR20.00");
  fireEvent.change(screen.getByLabelText("Week breakdown"), { target: { value: "1" } });
  expect(screen.getByRole("region", { name: "New pickups" })).toHaveTextContent("Player 3WRBench");
  expect(screen.getByRole("table", { name: "Weekly waiver starters" })).toHaveTextContent("No waiver players started.");
  fireEvent.change(screen.getByLabelText("Chart metric"), { target: { value: "pickups" } });
  expect(screen.getByTestId("waiver-chart")).toHaveTextContent('"manager":1,"league":1.5');
  fireEvent.change(screen.getByLabelText("Chart metric"), { target: { value: "starts" } });
  expect(screen.getByTestId("waiver-chart")).toHaveTextContent('"manager":0,"league":1');
});

test("position filtering updates actual totals and contributors", () => {
  render(<WaiverImpactForSeason wrapped={fixture()} />);
  fireEvent.click(screen.getByRole("button", { name: "Bravo" }));
  const table = screen.getByRole("table", { name: "Weekly waiver starters" });
  expect(table).toHaveTextContent("Player 4");
  fireEvent.click(screen.getByRole("checkbox", { name: "Exclude K/DST" }));
  expect(table).not.toHaveTextContent("Player 4");
  expect(table).toHaveTextContent("Player 5");
  expect(screen.getByTestId("waiver-chart")).toHaveTextContent('"manager":0');
});

test("shows unavailable weeks, partial scores, and missing identity without inventing points", () => {
  const w = fixture(); delete w.ffTeams.a.rosters["2"];
  delete w.nflPlayers["4"].scores["2"];
  delete w.nflPlayers["5"];
  render(<WaiverImpactForSeason wrapped={w} />);
  expect(screen.getByRole("status")).toHaveTextContent(/partial/i);
  expect(screen.getByRole("status")).toHaveTextContent(/missing player/i);
  fireEvent.click(screen.getByRole("button", { name: "Alpha" }));
  fireEvent.change(screen.getByLabelText("Week breakdown"), { target: { value: "2" } });
  expect(screen.getByText(/No roster recorded for this week/)).toBeInTheDocument();
  expect(screen.getByTestId("waiver-chart")).toHaveTextContent('"manager":null');
  fireEvent.click(screen.getByRole("button", { name: "Bravo" }));
  expect(screen.getByRole("table", { name: "Weekly waiver starters" })).toHaveTextContent("Player 4K—");
});

test("renders an empty state before any completed weeks", () => {
  render(<WaiverImpactForSeason wrapped={{ ...fixture(), latestScoringPeriod: 0 }} />);
  expect(screen.getByText(/No completed weeks/)).toBeInTheDocument();
  expect(screen.queryByRole("table")).not.toBeInTheDocument();
});
