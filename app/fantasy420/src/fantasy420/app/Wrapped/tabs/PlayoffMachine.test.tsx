import { fireEvent, render, screen } from "@testing-library/react";
import { selectedWrapped } from "..";
import type { WrappedType } from "../../FetchWrapped";
import PlayoffMachine from "./PlayoffMachine";

vi.mock("..", () => ({
  selectedWrapped: vi.fn(),
  bubbleStyle: {},
  Helpers: { toFixed: (value: number) => String(value) },
}));

beforeEach(() => {
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

afterEach(() => { vi.restoreAllMocks(); });

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
