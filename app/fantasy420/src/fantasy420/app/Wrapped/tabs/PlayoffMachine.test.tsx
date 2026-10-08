import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { selectedWrapped } from "..";
import type { WrappedType } from "../../FetchWrapped";
import PlayoffMachine from "./PlayoffMachine";
import { parseWrappedHash, useWrappedTab } from "../hashRoute";

vi.mock("..", () => ({
  selectedWrapped: vi.fn(),
  bubbleStyle: {},
  Helpers: { toFixed: (value: number) => String(value) },
}));

beforeEach(() => {
  window.history.replaceState(null, "", "/Wrapped?year=2026#PlayoffMachine");
  const wrapped: WrappedType = {
    year: "2026", latestScoringPeriod: 1, nflTeams: {},
    ffMatchups: { "1": [["a", "b"]], "2": [["a", "b"]] },
    ffTeams: Object.fromEntries(["a", "b"].map((id) => [id, {
      id, name: id === "a" ? "Alpha" : "Bravo", draft: [],
      rosters: Object.fromEntries(["0", "1"].map((weekNum) => [weekNum, {
        weekNum, starting: [id], rostered: [id], projections: {},
      }])),
    }])),
    nflPlayers: Object.fromEntries(["a", "b"].map((id) => [id, {
      id, name: id, nflTeamId: "1", position: "WR", projection: 0, average: 0, total: 0,
      scores: { "1": id === "a" ? 20 : 10 },
    }])),
    fantasyCalc: { timestamp: 0, history: [], players: { a: 300, b: 100 } },
  };
  vi.mocked(selectedWrapped).mockReturnValue(wrapped);
  vi.spyOn(window, "scrollBy").mockImplementation(() => {});
});

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

test.each([120, -80, 0])("preserves the clicked matchup's screen position for a %s px layout shift", (shift) => {
  render(<PlayoffMachine />);
  const underdog = screen.getByRole("radio", { name: "Bravo 50" });
  const rect = (top: number) => ({ top } as DOMRect);
  vi.spyOn(underdog, "getBoundingClientRect")
    .mockReturnValueOnce(rect(300))
    .mockReturnValue(rect(300 + shift));

  fireEvent.click(underdog);

  expect(underdog).toBeChecked();
  expect(screen.getByRole("radio", { name: "Alpha 150" })).not.toBeChecked();
  if (shift === 0) expect(window.scrollBy).not.toHaveBeenCalled();
  else {
    expect(window.scrollBy).toHaveBeenCalledTimes(1);
    expect(window.scrollBy).toHaveBeenCalledWith(0, shift);
  }

  // A points adjustment must not reuse the previous winner-change anchor.
  fireEvent.click(screen.getAllByRole("button", { name: "+1000 PF" })[0]);
  expect(window.scrollBy).toHaveBeenCalledTimes(shift === 0 ? 0 : 1);
});

function readPicks() {
  const value = parseWrappedHash(window.location.hash).params.get("picks");
  return value === null ? null : JSON.parse(value);
}

function openPicks(picks: unknown) {
  const url = new URL(window.location.href);
  url.hash = `PlayoffMachine?${new URLSearchParams({ picks: JSON.stringify(picks) })}`;
  window.history.replaceState(null, "", url);
}

test("syncs every non-chalk winner by schedule index across weeks and restores the shared URL", () => {
  const wrapped = selectedWrapped();
  for (const [id, name, value] of [["c", "Charlie", 220], ["d", "Delta", 180]] as const) {
    wrapped.ffTeams[id] = { ...wrapped.ffTeams.a, id, name, rosters: {
      "0": { weekNum: "0", starting: [id], rostered: [id], projections: {} },
    } };
    wrapped.nflPlayers[id] = { ...wrapped.nflPlayers.a, id, name };
    wrapped.fantasyCalc!.players[id] = value;
  }
  wrapped.ffMatchups["2"].push(["c", "d"]);
  wrapped.ffMatchups["3"] = [["a", "b"], ["c", "d"]];
  window.history.replaceState({ preserved: true }, "", "/Wrapped?year=2026&other=keep#PlayoffMachine?view=keep");
  const view = render(<PlayoffMachine />);
  const week = (number: number) => within(screen.getByRole("heading", { name: `Week ${number}` }).parentElement!);
  // The closer matchup is displayed first, but its original schedule index is 1.
  expect(week(2).getAllByRole("radio")[0]).toHaveAccessibleName("Charlie 110");
  fireEvent.click(week(2).getByRole("radio", { name: "Delta 90" }));
  fireEvent.click(week(2).getByRole("radio", { name: "Bravo 50" }));
  fireEvent.click(week(3).getByRole("radio", { name: "Bravo 50" }));
  expect(readPicks()).toEqual({ "2": { "0": "b", "1": "d" }, "3": { "0": "b" } });
  expect(window.location.search).toBe("?year=2026&other=keep");
  expect(parseWrappedHash(window.location.hash).params.get("view")).toBe("keep");
  expect(window.history.state).toEqual({ preserved: true });

  const standings = document.querySelector(".playoff-standings-grid")!.textContent;
  view.unmount();
  render(<PlayoffMachine />);
  expect(week(2).getByRole("radio", { name: "Bravo 50" })).toBeChecked();
  expect(week(2).getByRole("radio", { name: "Delta 90" })).toBeChecked();
  expect(week(3).getByRole("radio", { name: "Bravo 50" })).toBeChecked();
  expect(document.querySelector(".playoff-standings-grid")!.textContent).toBe(standings);

  fireEvent.click(week(2).getByRole("radio", { name: "Alpha 150" }));
  expect(readPicks()).toEqual({ "2": { "1": "d" }, "3": { "0": "b" } });
  fireEvent.click(week(2).getByRole("radio", { name: "Charlie 110" }));
  fireEvent.click(week(3).getByRole("radio", { name: "Alpha 150" }));
  expect(readPicks()).toBeNull();
  expect(window.location.hash).toBe("#PlayoffMachine?view=keep");
});

test.each([null, [], "bad", 42, { "2": [] }, { "2": { "0": 2 } }, { "2": { "0": "outsider" } }])(
  "falls back to chalk for invalid picks: %j", (picks) => {
    openPicks(picks);
    render(<PlayoffMachine />);
    expect(screen.getByRole("radio", { name: "Alpha 150" })).toBeChecked();
  }
);

test("ignores malformed JSON", () => {
  window.history.replaceState(null, "", "/#PlayoffMachine?picks=%7Bbad");
  render(<PlayoffMachine />);
  expect(screen.getByRole("radio", { name: "Alpha 150" })).toBeChecked();
  fireEvent.click(screen.getByRole("radio", { name: "Bravo 50" }));
  expect(readPicks()).toEqual({ "2": { "0": "b" } });
});

test("ignores completed and unknown matchups and removes stale entries on the next pick", () => {
  openPicks({ "1": { "0": "b" }, "2": { "0": "b", "9": "b" }, "99": { "0": "b" } });
  render(<PlayoffMachine />);
  expect(screen.getByRole("radio", { name: "Bravo 50" })).toBeChecked();
  expect(screen.getByText("Alpha", { selector: ".playoff-team-heading strong" })
    .closest(".playoff-team")).toHaveTextContent("1 wins");
  fireEvent.click(screen.getByRole("radio", { name: "Alpha 150" }));
  expect(readPicks()).toBeNull();
  expect(window.location.hash).toBe("#PlayoffMachine");
});

test("restores selections through browser back and forward", async () => {
  render(<PlayoffMachine />);
  fireEvent.click(screen.getByRole("radio", { name: "Bravo 50" }));
  fireEvent.click(screen.getByRole("radio", { name: "Alpha 150" }));
  act(() => window.history.back());
  await waitFor(() => expect(screen.getByRole("radio", { name: "Bravo 50" })).toBeChecked());
  act(() => window.history.forward());
  await waitFor(() => expect(screen.getByRole("radio", { name: "Alpha 150" })).toBeChecked());
});

test("query changes preserve local state and the scroll anchor inside the Wrapped tab host", () => {
  function WrappedHost() {
    const tab = useWrappedTab();
    // Wrapped declares its content component inside the host render.
    function Content() { return tab === "PlayoffMachine" ? <PlayoffMachine /> : <div>Another tab</div>; }
    return <Content />;
  }
  render(<WrappedHost />);
  const alphaCard = screen.getByText("Alpha", { selector: ".playoff-team-heading strong" }).closest(".playoff-team")!;
  fireEvent.click(within(alphaCard as HTMLElement).getByRole("button", { name: "+1000 PF" }));
  expect(alphaCard).toHaveTextContent("Points For: 1020");
  const underdog = screen.getByRole("radio", { name: "Bravo 50" });
  vi.spyOn(underdog, "getBoundingClientRect")
    .mockReturnValueOnce({ top: 300 } as DOMRect)
    .mockReturnValue({ top: 380 } as DOMRect);
  fireEvent.click(underdog);
  expect(screen.getByRole("radio", { name: "Bravo 50" })).toBe(underdog);
  expect(alphaCard).toHaveTextContent("Points For: 1020");
  expect(window.scrollBy).toHaveBeenCalledWith(0, 80);
  act(() => {
    window.history.replaceState(null, "", "/#Standings");
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  });
  expect(screen.getByText("Another tab")).toBeInTheDocument();
});
