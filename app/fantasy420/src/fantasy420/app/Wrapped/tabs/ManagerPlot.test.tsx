import { act, fireEvent, render, screen, within } from "@testing-library/react";
import type { WrappedType } from "../../FetchWrapped";
import { selectedWrapped } from "..";
import ManagerPlot from "./ManagerPlot";

vi.mock("..", () => ({
  selectedWrapped: vi.fn(),
  selectedYear: "2026",
  Helpers: { toFixed: (value: number, digits: number) => value.toFixed(digits) },
  mapDict: (data: Record<string, unknown>, map: (value: any) => unknown,
    filter = (_key: string) => true) => Object.fromEntries(
      Object.entries(data).filter(([key]) => filter(key)).map(([key, value]) => [key, map(value)])
    ),
}));

vi.mock("recharts", async () => {
  const React = await import("react");
  const Data = React.createContext<Record<string, number>[]>([]);
  return {
    ResponsiveContainer: ({ children }: any) => children,
    LineChart: ({ data, children }: any) => (
      <Data.Provider value={data}>
        <pre data-testid="series">{JSON.stringify(data)}</pre>{children}
      </Data.Provider>
    ),
    Line: ({ strokeWidth }: any) => <span data-testid="manager-line" data-width={strokeWidth} />,
    XAxis: () => null,
    YAxis: ({ domain }: any) => { domain([-1, 1]); return null; },
    ReferenceLine: () => null,
    Tooltip: ({ content }: any) => {
      const point = React.useContext(Data).find((point) => point.x === 1);
      if (!point) return null;
      return content({ label: 1, coordinate: { y: 50 }, viewBox: { y: 0, height: 100 },
        payload: Object.entries(point).filter(([key]) => key !== "x")
          .map(([key, value]) => ({ name: key, dataKey: key, value })) });
    },
  };
});

beforeEach(() => {
  vi.useFakeTimers();
  const team = (id: string, name: string) => ({
    id, name, draft: [], rosters: {
      "1": { weekNum: "1", starting: [id], rostered: [id], projections: {} },
    },
  });
  const player = (id: string, score: number) => ({
    id, name: id, nflTeamId: "1", position: "QB", scores: { "1": score },
    projection: 0, total: score, average: score,
  });
  const wrapped: WrappedType = {
    year: "2026", latestScoringPeriod: 1, nflTeams: {},
    nflPlayers: { a: player("a", 20), b: player("b", 10) },
    ffTeams: { a: team("a", "Alpha"), b: team("b", "Bravo") },
    ffMatchups: { "1": [["a", "b"]] },
  };
  vi.mocked(selectedWrapped).mockReturnValue(wrapped);
});

afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); });

test("click clears focus even when a tooltip update is pending; movement enables focus again", () => {
  vi.mocked(selectedWrapped).mockReturnValue({ ...selectedWrapped(), latestScoringPeriod: 0 });
  const { container, rerender } = render(<ManagerPlot />);
  const hasFocus = () => screen.getAllByTestId("manager-line")
    .some((line) => line.getAttribute("data-width") === "4");
  act(() => { vi.runOnlyPendingTimers(); });
  expect(hasFocus()).toBe(true);
  fireEvent.click(screen.getByRole("region", { name: "pointsFor 2" }));
  act(() => { vi.runOnlyPendingTimers(); });
  expect(hasFocus()).toBe(false);
  rerender(<ManagerPlot />);
  act(() => { vi.runOnlyPendingTimers(); });
  expect(hasFocus()).toBe(false);
  fireEvent.mouseMove(container.querySelector(".manager-plot-chart")!);
  rerender(<ManagerPlot />);
  act(() => { vi.runOnlyPendingTimers(); });
  expect(hasFocus()).toBe(true);
});

test("shows cumulative wins and league-relative wins for the selected season", () => {
  render(<ManagerPlot />);
  const totals = screen.getByRole("region", { name: "Total wins by week" });
  const relative = screen.getByRole("region", { name: "Wins above/below league average" });
  expect(JSON.parse(within(totals).getByTestId("series").textContent!)).toEqual([
    { x: 0, a: 0, b: 0 }, { x: 1, a: 1, b: 0 },
  ]);
  expect(JSON.parse(within(relative).getByTestId("series").textContent!)).toEqual([
    { x: 0, a: 0, b: 0 }, { x: 1, a: 0.5, b: -0.5 },
  ]);
  expect(within(totals).getByText("1 win Alpha")).toBeInTheDocument();
  expect(within(relative).getByText("1 win (+0.50 vs average) Alpha")).toBeInTheDocument();
  expect(within(relative).getByText("0 wins (-0.50 vs average) Bravo")).toBeInTheDocument();
  expect(screen.getByRole("region", { name: "pointsFor 2" })).toHaveTextContent("20.00: (1) Alpha");
  expect(screen.getByRole("region", { name: "pointsAgainst 2" })).toHaveTextContent("10.00: (1) Alpha");
});

test("recomputes wins when the selected season changes", () => {
  const { rerender } = render(<ManagerPlot />);
  const wrapped = selectedWrapped();
  vi.mocked(selectedWrapped).mockReturnValue({ ...wrapped, latestScoringPeriod: 0 });
  rerender(<ManagerPlot />);
  const totals = screen.getByRole("region", { name: "Total wins by week" });
  expect(JSON.parse(within(totals).getByTestId("series").textContent!)).toEqual([
    { x: 0, a: 0, b: 0 },
  ]);
});
