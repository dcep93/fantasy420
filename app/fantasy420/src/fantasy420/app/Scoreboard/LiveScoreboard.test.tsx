import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import LiveScoreboard from "./LiveScoreboard";
import { Snapshot } from "./data";
vi.mock("../Wrapped", () => ({ currentYear: "2026" }));
const team = (id: number, projected: number) => ({ id, name: `Team ${id}`, score: 0, projected,
  projectedLineup: { projected, emptySlots: [], players: [{ id, name: `Player ${id}`, slotId: 0, slot: "QB", projection: projected, actual: 0, locked: false }] } });
const snapshot: Snapshot = { leagueId: "203836968", leagueName: "League", year: 2026, week: 6, fetchedAt: 1000, knockout: false,
  matchups: [[team(1, 150), team(2, 100)], [team(3, 125), team(4, 124)]] };
it("renders closest matchups first, reveals lineups, refreshes and retains data on failure", async () => {
  const load = vi.fn().mockResolvedValueOnce(snapshot).mockRejectedValueOnce(new Error("ESPN unavailable"));
  render(<LiveScoreboard load={load} />);
  expect(await screen.findByText("Week 6 · Live scoreboard")).toBeVisible();
  expect(within(screen.getAllByRole("article")[0]).getByText("Team 3")).toBeVisible();
  fireEvent.click(screen.getAllByText(/Optimized lineup/)[0]);
  expect(screen.getByText("Player 3")).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Refresh" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("results may be stale");
  expect(screen.getByText("Team 3")).toBeVisible();
  expect(load).toHaveBeenCalledTimes(2);
});
it("automatically refreshes and cleans up on unmount", async () => {
  vi.useFakeTimers();
  try {
    const load = vi.fn().mockResolvedValue(snapshot);
    const view = render(<LiveScoreboard load={load} />);
    await act(async () => {});
    await act(async () => { vi.advanceTimersByTime(60000); });
    expect(load).toHaveBeenCalledTimes(2);
    view.unmount();
    await act(async () => { vi.advanceTimersByTime(60000); });
    expect(load).toHaveBeenCalledTimes(2);
  } finally { vi.useRealTimers(); }
});
it("shows an actionable error when no live data is available", async () => {
  const load = vi.fn().mockRejectedValue("extension unavailable");
  render(<LiveScoreboard load={load} />);
  expect(await screen.findByRole("alert")).toHaveTextContent("Fantasy420 Chrome extension");
  expect(screen.queryByRole("article")).toBeNull();
  await waitFor(() => expect(screen.getByRole("button", { name: "Refresh" })).toBeEnabled());
});
