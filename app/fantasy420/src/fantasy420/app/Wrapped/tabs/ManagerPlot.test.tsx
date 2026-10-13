import { act, fireEvent, render, screen, within } from "@testing-library/react";
import type { WrappedType } from "../../FetchWrapped";
import { selectedWrapped } from "..";
import ManagerPlot from "./ManagerPlot";
import { useCoarsePointer } from "./PlayerPlot/useCoarsePointer";

vi.mock("./PlayerPlot/useCoarsePointer", () => ({ useCoarsePointer: vi.fn(() => false) }));

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
  const Active = React.createContext(false);
  return {
    ResponsiveContainer: ({ children }: any) => children,
    LineChart: ({ data, children }: any) => {
      const [active, setActive] = React.useState(false);
      const clickTrigger = React.Children.toArray(children).some((child: any) => child.props?.trigger === "click");
      return <div data-testid="manager-chart"
        onClick={() => { if (clickTrigger) setActive(true); }}
        onMouseLeave={() => { if (!clickTrigger) setActive(false); }}>
        <Active.Provider value={active}><Data.Provider value={data}>
          <pre data-testid="series">{JSON.stringify(data)}</pre>{children}
        </Data.Provider></Active.Provider>
      </div>;
    },
    Line: ({ strokeWidth }: any) => <span data-testid="manager-line" data-width={strokeWidth} />,
    XAxis: () => null,
    YAxis: ({ domain }: any) => { domain([-1, 1]); return null; },
    ReferenceLine: () => null,
    Tooltip: ({ content, trigger, active }: any) => {
      const chartActive = React.useContext(Active);
      const point = React.useContext(Data).find((point) => point.x === 1);
      if (!point || active === false || (trigger === "click" && !chartActive)) return null;
      return content({ label: 1, coordinate: { y: 50 }, viewBox: { y: 0, height: 100 },
        payload: Object.entries(point).filter(([key]) => key !== "x")
          .map(([key, value]) => ({ name: key, dataKey: key, value })) });
    },
  };
});

beforeEach(() => {
  vi.mocked(useCoarsePointer).mockReturnValue(false);
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

test("mobile taps keep the table open through compatibility mouse events and can switch charts or reopen after dismissal", () => {
  vi.mocked(useCoarsePointer).mockReturnValue(true);
  const { container } = render(<ManagerPlot />);
  const points = screen.getByRole("region", { name: "pointsFor 2" });
  const against = screen.getByRole("region", { name: "pointsAgainst 2" });
  const chart = within(points).getByTestId("manager-chart");
  const popup = () => within(points).queryByText("20.00: (1) Alpha");
  const tap = (target: HTMLElement) => {
    fireEvent.touchStart(target);
    fireEvent.touchEnd(target);
    fireEvent.mouseMove(target);
    fireEvent.click(target);
    fireEvent.mouseLeave(target);
    act(() => { vi.runOnlyPendingTimers(); });
  };
  expect(popup()).not.toBeInTheDocument();
  tap(chart);
  expect(popup()).toBeInTheDocument();
  tap(chart);
  expect(popup()).toBeInTheDocument();
  tap(within(against).getByTestId("manager-chart"));
  expect(popup()).not.toBeInTheDocument();
  expect(within(against).getByText("10.00: (1) Alpha")).toBeInTheDocument();
  fireEvent.click(container.firstElementChild!);
  expect(within(against).queryByText("10.00: (1) Alpha")).not.toBeInTheDocument();
  tap(chart);
  expect(popup()).toBeInTheDocument();
});

test.each(["mouseMove", "touchMove"] as const)("first click hides the popup, second clears focus, and %s resumes hover", (movement) => {
  vi.mocked(selectedWrapped).mockReturnValue({ ...selectedWrapped(), latestScoringPeriod: 0 });
  const { container, rerender } = render(<ManagerPlot />);
  const hasFocus = () => screen.getAllByTestId("manager-line")
    .some((line) => line.getAttribute("data-width") === "7");
  const chart = container.querySelector(".manager-plot-chart")!;
  const points = screen.getByRole("region", { name: "pointsFor 2" });
  const popup = () => within(points).queryByText("20.00: (0) Alpha");
  act(() => { vi.runOnlyPendingTimers(); });
  expect(hasFocus()).toBe(true);
  expect(popup()).toBeInTheDocument();
  fireEvent.click(chart);
  act(() => { vi.runOnlyPendingTimers(); });
  expect(hasFocus()).toBe(true);
  expect(popup()).not.toBeInTheDocument();
  fireEvent[movement](chart);
  rerender(<ManagerPlot />);
  act(() => { vi.runOnlyPendingTimers(); });
  expect(hasFocus()).toBe(true);
  expect(popup()).not.toBeInTheDocument();
  fireEvent.click(chart);
  act(() => { vi.runOnlyPendingTimers(); });
  expect(hasFocus()).toBe(false);
  expect(popup()).not.toBeInTheDocument();
  rerender(<ManagerPlot />);
  act(() => { vi.runOnlyPendingTimers(); });
  expect(hasFocus()).toBe(false);
  fireEvent[movement](chart);
  rerender(<ManagerPlot />);
  act(() => { vi.runOnlyPendingTimers(); });
  expect(hasFocus()).toBe(true);
  expect(popup()).toBeInTheDocument();
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
  expect(within(totals).getByText("1 win (20.00 PF) Alpha")).toBeInTheDocument();
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

test("orders tied teams by points for in both the line positions and tooltip, with actual wins shown", () => {
  const wrapped = selectedWrapped();
  wrapped.ffTeams.c = { ...wrapped.ffTeams.a, id: "c", name: "Charlie", rosters: {
    "1": { weekNum: "1", starting: ["c"], rostered: ["c"], projections: {} },
  } };
  wrapped.ffTeams.d = { ...wrapped.ffTeams.c, id: "d", name: "Delta", rosters: {
    "1": { weekNum: "1", starting: ["d"], rostered: ["d"], projections: {} },
  } };
  wrapped.nflPlayers.c = { ...wrapped.nflPlayers.a, id: "c", scores: { "1": 30 } };
  wrapped.nflPlayers.d = { ...wrapped.nflPlayers.b, id: "d", scores: { "1": 25 } };
  wrapped.ffMatchups["1"].push(["c", "d"]);
  render(<ManagerPlot />);
  const totals = screen.getByRole("region", { name: "Total wins by week" });
  const data = JSON.parse(within(totals).getByTestId("series").textContent!);
  expect(data[1].c).toBeGreaterThan(data[1].a);
  expect(data[1].a).toBeGreaterThan(data[1].d);
  expect(data[1].d).toBeGreaterThan(data[1].b);
  const top = within(totals).getByText("1 win (30.00 PF) Charlie");
  expect([...top.parentElement!.children].map(row => row.textContent)).toEqual([
    "1 win (30.00 PF) Charlie", "1 win (20.00 PF) Alpha", "0 wins (25.00 PF) Delta", "0 wins (10.00 PF) Bravo",
  ]);
  expect(within(totals).queryByText(/1\.35 wins/)).not.toBeInTheDocument();
});
