import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { selectedWrapped } from "..";
import type { WrappedType } from "../../FetchWrapped";
import ProbabilityMachine from "./ProbabilityMachine";
import { calculateProbabilities, type ProbabilitySeason } from "./probabilityEngine";
import { wrappedCategories } from "../WrappedNavigation";

vi.mock("..", () => ({ selectedWrapped: vi.fn(), currentYear: "2026", bubbleStyle: {} }));

class TestWorker {
  static instances: TestWorker[] = [];
  onmessage?: (event: { data: unknown }) => void;
  onerror?: () => void;
  season!: ProbabilitySeason;
  terminate = vi.fn();
  constructor() { TestWorker.instances.push(this); }
  postMessage(season: ProbabilitySeason) { this.season = season; }
  finish() { this.onmessage?.({ data: { result: calculateProbabilities(this.season) } }); }
}

beforeEach(() => {
  vi.useFakeTimers();
  TestWorker.instances = [];
  vi.stubGlobal("Worker", TestWorker);
  const ids = Array.from({ length: 10 }, (_, i) => String(i));
  const games = [["0", "1"], ["2", "3"], ["4", "5"], ["6", "7"], ["8", "9"]];
  const wrapped: WrappedType = { year: "2026", latestScoringPeriod: 1, nflTeams: {},
    ffMatchups: { "1": games, "2": games },
    ffTeams: Object.fromEntries(ids.map(id => [id, { id, name: `Manager ${id}`, draft: [],
      rosters: Object.fromEntries(["0", "1"].map(weekNum => [weekNum, {
        weekNum, starting: [id], rostered: [id], projections: {},
      }])) }])),
    nflPlayers: Object.fromEntries(ids.map(id => [id, { id, name: id, nflTeamId: "1", position: "WR",
      projection: 0, average: 0, total: 0, scores: { "1": 10 + Number(id) } }])),
    fantasyCalc: { timestamp: 0, history: [], players: Object.fromEntries(ids.map(id => [id, 100])) },
  };
  vi.mocked(selectedWrapped).mockReturnValue(wrapped);
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.useRealTimers(); });
const latest = () => TestWorker.instances[TestWorker.instances.length - 1];
const start = () => act(() => vi.advanceTimersByTime(100));
const finish = () => act(() => latest().finish());

test("first in Beta, matches strengths and shows manager probability cards after matchups", () => {
  expect(wrappedCategories.find(category => category.name === "Beta")?.tabs[0]).toBe("ProbabilityMachine");
  render(<ProbabilityMachine />);
  expect(screen.getAllByText("100", { selector: ".playoff-strength" })).toHaveLength(10);
  expect(screen.getByRole("status")).toHaveTextContent("Calculating");
  start(); finish();
  expect(screen.getByRole("status")).toHaveTextContent("Exact · 32 possible outcomes");
  expect(screen.getAllByText("Top 4")).toHaveLength(10);
  const matchups = screen.getByRole("region", { name: "Remaining weekly matchups" });
  const results = screen.getByRole("region", { name: "Season finish probabilities" });
  expect(matchups.compareDocumentPosition(results) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  const distribution = screen.getByRole("region", { name: "Win total probabilities" });
  expect(results.compareDocumentPosition(distribution) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
});

test("editing either probability complements its opponent and supports forced winners and reset", () => {
  render(<ProbabilityMachine />); start(); finish();
  const a = screen.getByRole("spinbutton", { name: "Manager 0 win probability (%)" });
  const b = screen.getByRole("spinbutton", { name: "Manager 1 win probability (%)" });
  fireEvent.focus(b); fireEvent.change(b, { target: { value: "73.2" } }); fireEvent.blur(b);
  expect(a).toHaveValue(26.8); expect(b).toHaveValue(73.2);
  expect(screen.getByRole("status")).toHaveTextContent("Calculating");
  start(); expect(latest().season.games[0].probability).toBeCloseTo(0.268);
  fireEvent.click(screen.getByRole("button", { name: "Set Manager 0 to 100%" }));
  expect(a).toHaveValue(100); expect(b).toHaveValue(0);
  start(); finish();
  expect(screen.getByRole("status")).toHaveTextContent("16 possible outcomes");
  const group = screen.getByRole("group", { name: "Week 2: Manager 0 versus Manager 1" });
  fireEvent.click(within(group).getByRole("button", { name: "Reset" }));
  expect(a).toHaveValue(50); expect(b).toHaveValue(50);
});

test("invalid or empty probability input cannot corrupt calculations", () => {
  render(<ProbabilityMachine />); start();
  const a = screen.getByRole("spinbutton", { name: "Manager 0 win probability (%)" });
  for (const value of ["", "-10", "101"]) {
    fireEvent.focus(a); fireEvent.change(a, { target: { value } }); fireEvent.blur(a);
    expect(a).toHaveValue(50);
  }
  expect(latest().season.games[0].probability).toBe(0.5);
});

test("PF buttons recompute tiebreakers without changing matchup probabilities; reset clears both", () => {
  render(<ProbabilityMachine />); start(); finish();
  const card = screen.getByRole("article", { name: "Manager 0" });
  const original = latest().season.games.map(g => g.probability);
  fireEvent.click(within(card).getByRole("button", { name: "+1000 PF" }));
  expect(card).toHaveTextContent("1010.00"); start(); finish();
  expect(latest().season.games.map(g => g.probability)).toEqual(original);
  expect(latest().season.points[0]).toBe(1010);
  fireEvent.click(within(card).getByRole("button", { name: "-1000 PF" })); start();
  expect(latest().season.points[0]).toBe(10);
  fireEvent.click(screen.getByRole("button", { name: "Set Manager 0 to 100%" }));
  fireEvent.click(within(card).getByRole("button", { name: "+1000 PF" }));
  fireEvent.click(screen.getByRole("button", { name: "Reset all" })); start();
  expect(latest().season.points[0]).toBe(10);
  expect(latest().season.games[0].probability).toBe(0.5);
});

test("superseded workers are terminated and late results cannot replace a newer scenario", () => {
  render(<ProbabilityMachine />); start();
  const old = latest();
  fireEvent.click(screen.getByRole("button", { name: "Set Manager 0 to 100%" }));
  expect(old.terminate).toHaveBeenCalled();
  act(() => old.finish());
  expect(screen.getByRole("status")).toHaveTextContent("Calculating");
  start(); finish();
  expect(screen.getByRole("status")).toHaveTextContent("16 possible outcomes");
});

test("a worker failure has a working retry and changing years discards old adjustments", () => {
  const view = render(<ProbabilityMachine />); start();
  act(() => latest().onerror?.());
  fireEvent.click(screen.getByRole("button", { name: "Retry" })); start(); finish();
  expect(screen.getByRole("status")).toHaveTextContent("Exact");
  fireEvent.click(screen.getAllByRole("button", { name: "+1000 PF" })[0]);
  vi.mocked(selectedWrapped).mockReturnValue({ ...selectedWrapped(), year: "2025" });
  view.rerender(<ProbabilityMachine />); start();
  expect(latest().season.points[0]).toBe(10);
});
