import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import WinDistributionChart from "./WinDistributionChart";
import type { ProbabilitySeason } from "./probabilityEngine";

vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: any) => children,
  LineChart: ({ data, children }: any) => <div><pre data-testid="distribution-data">{JSON.stringify(data)}</pre>{children}</div>,
  Line: ({ name, stroke, strokeOpacity, onMouseEnter, onMouseLeave, onClick }: any) =>
    <span data-testid="distribution-line" data-name={name} data-color={stroke} data-opacity={strokeOpacity}
      onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} onClick={onClick} />,
  CartesianGrid: () => null, XAxis: () => null, YAxis: () => null, Tooltip: () => null,
}));

function fixture(): ProbabilitySeason {
  return { teams: [{ id: "a", name: "Alpha" }, { id: "b", name: "Bravo" }],
    wins: [3, 4], points: [200, 100], headWins: [0, 0, 0, 0], headGames: [0, 1, 1, 0],
    games: [{ key: "1:0", week: 1, matchupIndex: 0, a: 0, b: 1, strengthA: 100, strengthB: 100, probability: 0.8 }] };
}
afterEach(cleanup);
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
