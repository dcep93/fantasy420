import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import PlayerStats from ".";
import { parseWrappedHash } from "../../hashRoute";

vi.mock("../..", () => ({ currentYear: "2026" }));
vi.mock("./Chart", () => ({ default: () => <div>Chart</div> }));
vi.mock("./usePlayerStats", () => ({ usePlayerStats: () => ({ loading: false, failedYears: [], retry: () => {}, data: [
  { name: "Tom Brady", position: "QB", total: 30, years: [{ year: 2022, scores: [30], total: 30 }] },
  { name: "Ja’Marr Chase", position: "WR", total: 20, years: [{ year: 2025, scores: [20], total: 20 }] },
  { name: "Steelers D/ST", position: "D/ST", total: 10, years: [{ year: 2025, scores: [10], total: 10 }] },
  { name: "Carnell Tate", position: "WR", total: 12, years: [{ year: 2026, scores: [12], total: 12 }] },
] }) }));
vi.mock("../../allWrapped", () => ({ default: { 2026: { nflPlayers: {
  rookie: { name: "Carnell Tate", position: "WR", scores: { 0: 99, 1: 12 }, id: "rookie" },
}, ffTeams: {} } } }));

afterEach(() => { cleanup(); window.history.replaceState(null, "", "/"); });

test("opens the requested tab and filters the user's Tom_Brady deep link", () => {
  window.history.replaceState(null, "", "/#PlayerStats?nameFilter=Tom_Brady");
  expect(parseWrappedHash(window.location.hash).tab).toBe("PlayerStats");
  render(<PlayerStats />);
  expect(screen.getByRole("textbox", { name: "Player name" })).toHaveValue("Tom Brady");
  expect(screen.getByText(/"name": "Tom Brady"/)).toBeInTheDocument();
  expect(screen.queryByText(/"name": "Ja’Marr Chase"/)).not.toBeInTheDocument();
  fireEvent.change(screen.getByRole("textbox"), { target: { value: "JA'MARR" } });
  expect(screen.getByText(/"name": "Ja’Marr Chase"/)).toBeInTheDocument();
  expect(screen.queryByText(/"name": "Tom Brady"/)).not.toBeInTheDocument();
});

test("handles hash navigation, encoded defense names, rookies, and empty results", () => {
  window.history.replaceState(null, "", "/#PlayerStats?nameFilter=Steelers_D%2FST");
  render(<PlayerStats />);
  expect(screen.getByText(/"name": "Steelers D\/ST"/)).toBeInTheDocument();
  act(() => {
    window.history.replaceState(null, "", "/#PlayerStats?nameFilter=Carnell_Tate");
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  });
  expect(screen.getByRole("textbox")).toHaveValue("Carnell Tate");
  expect(screen.getByText(/"name": "Carnell Tate"/)).toBeInTheDocument();
  expect(screen.getByText(/"year": 2026/)).toHaveTextContent('"total": 12');
  fireEvent.change(screen.getByRole("textbox"), { target: { value: "Missing Person" } });
  expect(screen.getByText(/No player stats found/)).toBeInTheDocument();
});
