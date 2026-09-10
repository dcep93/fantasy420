import { StrictMode } from "react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import Scoreboard from ".";
import { extensionHelper } from "../Draft/Extension";

vi.mock("../Draft/Extension", () => ({ extensionHelper: vi.fn() }));
const send = vi.mocked(extensionHelper);
const originalParent = window.parent;
const response = () => ({ fetched: 1, year: 2026, fetchedAt: Date.now(), data: {
  id: 367176096, scoringPeriodId: 1, teams: [{ id: 1, name: "Alpha" }, { id: 2, name: "Bravo" }],
  schedule: [{ matchupPeriodId: 1, home: { teamId: 1, totalPointsLive: 80, totalProjectedPointsLive: 120 }, away: { teamId: 2, totalPointsLive: 75, totalProjectedPointsLive: 110 } }],
} });
beforeEach(() => { send.mockReset(); send.mockResolvedValue(response()); window.history.replaceState({}, "", "/scoreboard"); });
afterEach(() => { cleanup(); Object.defineProperty(window, "parent", { configurable: true, value: originalParent }); });

it("fetches once in StrictMode and switches modes without fetching", async () => {
  render(<StrictMode><Scoreboard /></StrictMode>);
  await screen.findByText("Fetches: 1");
  expect(send).toHaveBeenCalledTimes(1);
  expect(screen.getByText("THUNDERDOME")).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("Mode"), { target: { value: "head-to-head" } });
  expect(screen.getByText("68.07% win")).toBeInTheDocument();
  expect(send).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole("button", { name: "Refresh" }));
  await screen.findByText("Fetches: 2");
});

it("accepts only parent refresh messages and echoes completion to that origin", async () => {
  const parent = { postMessage: vi.fn() };
  Object.defineProperty(window, "parent", { configurable: true, value: parent });
  render(<Scoreboard />);
  await screen.findByText("Fetches: 1");
  expect(parent.postMessage).toHaveBeenCalledWith({ type: "fantasy420:scoreboard:ready" }, expect.any(String));
  await act(async () => { window.dispatchEvent(new MessageEvent("message", {
    source: window, origin: "https://unrelated.example", data: { type: "fantasy420:scoreboard:refresh" },
  })); });
  expect(send).toHaveBeenCalledTimes(1);
  await act(async () => { window.dispatchEvent(new MessageEvent("message", {
    source: parent as unknown as Window, origin: "https://multisport420.web.app", data: { type: "fantasy420:scoreboard:refresh", requestId: "panel-2" },
  })); });
  await waitFor(() => expect(parent.postMessage).toHaveBeenCalledWith({
    type: "fantasy420:scoreboard:refreshed", requestId: "panel-2", ok: true, fetchCount: 2,
  }, "https://multisport420.web.app"));
});

it("honors URL options and displays actionable extension failures with zero fetches", async () => {
  window.history.replaceState({}, "", "/scoreboard?leagueId=123&year=2025&mode=head-to-head");
  send.mockRejectedValue("no chrome runtime");
  render(<Scoreboard />);
  expect(await screen.findByRole("alert")).toHaveTextContent("Install or reload the Fantasy420 Chrome extension");
  expect(screen.getByText("Fetches: 0")).toBeInTheDocument();
  expect(send).toHaveBeenCalledWith({ scoreboard: { action: "fetch", leagueId: "123", year: 2025 } });
  expect(screen.queryByText("Alpha")).not.toBeInTheDocument();
});
