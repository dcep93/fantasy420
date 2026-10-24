import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import WinDistributionChart from "./WinDistributionChart";
import type { ProbabilitySeason } from "./probabilityEngine";

vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: any) => children,
  LineChart: ({ data, children, onClick }: any) => <div data-testid="distribution-chart" onClick={() => onClick?.({ activeLabel: 4 })}>
    <pre data-testid="distribution-data">{JSON.stringify(data)}</pre>{children}</div>,
  Line: ({ name, stroke, strokeOpacity, onMouseEnter, onMouseLeave, onClick }: any) =>
    <span data-testid="distribution-line" data-name={name} data-color={stroke} data-opacity={strokeOpacity}
      onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} onClick={onClick} />,
  CartesianGrid: () => null, XAxis: () => null, YAxis: () => null,
  Tooltip: ({ active }: any) => active === false ? null : <div data-testid="overlay-tooltip" />,
}));

function fixture(): ProbabilitySeason {
  return { teams: [{ id: "a", name: "Alpha" }, { id: "b", name: "Bravo" }],
    wins: [3, 4], points: [200, 100], headWins: [0, 0, 0, 0], headGames: [0, 1, 1, 0],
    games: [{ key: "1:0", week: 1, matchupIndex: 0, a: 0, b: 1, strengthA: 100, strengthB: 100, probability: 0.8 }] };
}
beforeEach(() => { vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }))); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
const lines = () => screen.getAllByTestId("distribution-line");
const data = () => JSON.parse(screen.getByTestId("distribution-data").textContent!);

test("all managers share one chart; selection isolates, switches, and restores lines without recoloring", () => {
  render(<WinDistributionChart season={fixture()} />);
  const bravoColor = lines()[1].getAttribute("data-color");
  expect(screen.getAllByTestId("distribution-data")).toHaveLength(1);
  expect(lines()).toHaveLength(2);
  fireEvent.click(screen.getByRole("button", { name: "Isolate Bravo" }));
  expect(lines()).toHaveLength(1);
  expect(lines()[0]).toHaveAttribute("data-name", "Bravo");
  expect(lines()[0]).toHaveAttribute("data-color", bravoColor);
  expect(screen.getByRole("button", { name: "Isolate Bravo" })).toHaveAttribute("aria-pressed", "true");
  fireEvent.click(screen.getByRole("button", { name: "Isolate Alpha" }));
  expect(lines()[0]).toHaveAttribute("data-name", "Alpha");
  fireEvent.click(screen.getByRole("button", { name: "Isolate Alpha" }));
  expect(lines()).toHaveLength(2);
  fireEvent.click(lines()[1]);
  expect(lines()).toHaveLength(1);
  fireEvent.click(screen.getByRole("button", { name: "Show all" }));
  expect(lines()).toHaveLength(2);
});

test("hover and keyboard focus highlight a manager without removing the comparison", () => {
  render(<WinDistributionChart season={fixture()} />);
  const alpha = screen.getByRole("button", { name: "Isolate Alpha" });
  fireEvent.mouseEnter(alpha);
  expect(lines()).toHaveLength(2);
  expect(lines()[0]).toHaveAttribute("data-opacity", "1");
  expect(lines()[1]).toHaveAttribute("data-opacity", "0.2");
  fireEvent.mouseLeave(alpha);
  expect(lines()[1]).toHaveAttribute("data-opacity", "1");
  fireEvent.focus(alpha);
  expect(lines()[1]).toHaveAttribute("data-opacity", "0.2");
  fireEvent.blur(alpha);
  expect(lines()[1]).toHaveAttribute("data-opacity", "1");
});

test("overrides update the exact curve immediately and retain manager selection", () => {
  const season = fixture();
  const view = render(<WinDistributionChart season={season} />);
  expect(data().find((row: any) => row.wins === 4).team_a).toBeCloseTo(0.8);
  fireEvent.click(screen.getByRole("button", { name: "Isolate Alpha" }));
  view.rerender(<WinDistributionChart season={{ ...season, games: [{ ...season.games[0], probability: 0 }] }} />);
  expect(data().find((row: any) => row.wins === 3).team_a).toBe(1);
  expect(data().find((row: any) => row.wins === 5).team_b).toBe(1);
  expect(lines()).toHaveLength(1);
  expect(lines()[0]).toHaveAttribute("data-name", "Alpha");
});

test("completed half-wins keep their own support without artificial zero spikes", () => {
  const season = fixture(); season.wins[1] = 4.5;
  render(<WinDistributionChart season={season} />);
  expect(data().find((row: any) => row.wins === 4.5).team_a).toBeNull();
  expect(data().find((row: any) => row.wins === 4).team_b).toBeNull();
  expect(data().find((row: any) => row.wins === 5.5).team_b).toBeCloseTo(0.2);
  expect(screen.getByText(/Completed ties count as half a win/)).toBeInTheDocument();
});

test("mobile taps show current probabilities below the graph, with no overlay or accidental isolation", () => {
  vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
  const season = fixture();
  const view = render(<WinDistributionChart season={season} />);
  expect(screen.queryByTestId("overlay-tooltip")).not.toBeInTheDocument();
  fireEvent.click(lines()[0]);
  expect(lines()).toHaveLength(2);
  const panel = screen.getByRole("region", { name: "Selected win total probabilities" });
  const chart = screen.getByTestId("distribution-chart");
  expect(chart.contains(panel)).toBe(false);
  expect(chart.compareDocumentPosition(panel) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(panel).toHaveTextContent("4 final wins");
  expect(within(panel).getAllByText("80.0%")).toHaveLength(2);
  fireEvent.click(screen.getByRole("button", { name: "Isolate Alpha" }));
  expect(within(panel).queryByText("Bravo")).not.toBeInTheDocument();
  view.rerender(<WinDistributionChart season={{ ...season, games: [{ ...season.games[0], probability: 0 }] }} />);
  expect(within(panel).getByText("0.0%")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Dismiss win total details" }));
  expect(panel).not.toBeInTheDocument();
  fireEvent.click(chart);
  expect(screen.getByRole("region", { name: "Selected win total probabilities" })).toBeInTheDocument();
});

test("desktop keeps the hover tooltip without opening the below-chart panel", () => {
  render(<WinDistributionChart season={fixture()} />);
  expect(screen.getByTestId("overlay-tooltip")).toBeInTheDocument();
  fireEvent.click(screen.getByTestId("distribution-chart"));
  expect(screen.queryByRole("region", { name: "Selected win total probabilities" })).not.toBeInTheDocument();
});
