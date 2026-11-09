import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { selectedWrapped } from "..";
import type { WrappedType } from "../../FetchWrapped";
import PlayoffMachine from "./PlayoffMachine";
import { calculateProbabilities, prepareProbabilitySeason } from "./probabilityEngine";
import { latestCompletedWeek } from "../../FetchWrapped/completedWeek";
import { parseWrappedHash, useWrappedTab } from "../hashRoute";
import historical2022 from "../dataJson/2022.json";

vi.mock("..", () => ({
  selectedWrapped: vi.fn(),
  currentYear: "2026",
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

function completedSeason(
  names: Record<string, string>,
  games: [string, string, number, number][]
) {
  const wrapped = selectedWrapped();
  wrapped.latestScoringPeriod = games.length;
  wrapped.ffMatchups = {};
  wrapped.ffTeams = Object.fromEntries(Object.entries(names).map(([id, name]) => [
    id, { id, name, draft: [], rosters: {} },
  ]));
  wrapped.nflPlayers = Object.fromEntries(Object.keys(names).map((id) => [id, {
    id, name: id, nflTeamId: "1", position: "WR", projection: 0, average: 0, total: 0,
    scores: {},
  }]));
  games.forEach(([a, b, scoreA, scoreB], index) => {
    const week = String(index + 1);
    wrapped.ffMatchups[week] = [[a, b]];
    for (const [id, score] of [[a, scoreA], [b, scoreB]] as const) {
      wrapped.ffTeams[id].rosters[week] = {
        weekNum: week, starting: [id], rostered: [id], projections: {},
      };
      wrapped.nflPlayers[id].scores[week] = score;
    }
  });
}

function standingNames() {
  return screen.getAllByText(/./, { selector: ".playoff-team-heading strong" })
    .map((name) => name.textContent);
}

function tiebreakNotes() {
  return Array.from(document.querySelectorAll(".playoff-tiebreaks li"));
}

test("restarts head-to-head after an uneven three-team points decision and recalculates adjusted points", () => {
  completedSeason({ d: "Monday Night Ducking", m: "Malik Makai Bells", b: "Buckyball", x: "Other" }, [
    ["d", "b", 200, 10],
    ["b", "m", 20, 10],
    ["m", "x", 100, 0],
  ]);
  render(<PlayoffMachine />);

  expect(standingNames()).toEqual(["Monday Night Ducking", "Buckyball", "Malik Makai Bells", "Other"]);
  const season = prepareProbabilitySeason(selectedWrapped(), "2026");
  const result = calculateProbabilities(season);
  const probabilityOrder = Array.from({ length: season.teams.length }, (_, rank) =>
    season.teams[result.ranks.findIndex(probabilities => probabilities[rank] === 1)].name);
  expect(probabilityOrder).toEqual(standingNames());
  const notes = tiebreakNotes();
  expect(notes).toHaveLength(2);
  expect(notes[0]).toHaveTextContent("Monday Night Ducking and Malik Makai Bells and Buckyball");
  expect(notes[0]).toHaveTextContent("have not played an equal number of times");
  expect(notes[0]).toHaveTextContent("Monday Night Ducking takes the next seed on points for");
  expect(notes[1]).toHaveTextContent("Malik Makai Bells and Buckyball");
  expect(notes[1]).not.toHaveTextContent("Monday Night Ducking");
  expect(notes[1]).toHaveTextContent("Buckyball takes the next seed on head-to-head record");
  for (const name of document.querySelectorAll<HTMLElement>(".playoff-tiebreaks .playoff-team-name")) {
    expect(name.style.getPropertyValue("--playoff-team-color")).not.toBe("");
  }

  const malikCard = screen.getByText("Malik Makai Bells", { selector: ".playoff-team-heading strong" })
    .closest(".playoff-team")!;
  fireEvent.click(within(malikCard as HTMLElement).getByRole("button", { name: "+1000 PF" }));
  expect(standingNames()).toEqual(["Malik Makai Bells", "Monday Night Ducking", "Buckyball", "Other"]);
  expect(tiebreakNotes()[0]).toHaveTextContent("Malik Makai Bells takes the next seed on points for");
  expect(tiebreakNotes()[1]).toHaveTextContent("Monday Night Ducking takes the next seed on head-to-head record");
  fireEvent.click(within(malikCard as HTMLElement).getByRole("button", { name: "-1000 PF" }));
  expect(standingNames()).toEqual(["Monday Night Ducking", "Buckyball", "Malik Makai Bells", "Other"]);
});

test("recalculates a balanced group's head-to-head records after selecting its first winner", () => {
  completedSeason({ a: "Alpha", c: "Charlie", b: "Bravo", x: "Other" }, [
    ["a", "b", 10, 1], ["a", "b", 10, 1], ["a", "b", 10, 1],
    ["a", "c", 10, 1], ["a", "c", 10, 1], ["a", "c", 1, 100],
    ["b", "c", 10, 1], ["b", "c", 10, 1], ["b", "c", 1, 100],
    ["b", "x", 10, 0], ["b", "x", 10, 0], ["b", "x", 10, 0],
    ["c", "x", 100, 0], ["c", "x", 100, 0], ["c", "x", 100, 0],
  ]);
  render(<PlayoffMachine />);

  // Each tied team has five season wins. Alpha's 5/6 group record wins
  // despite the lowest PF; Bravo and Charlie are initially tied at 2/6.
  // After Alpha is removed, Bravo's 2/3 beats Charlie's 1/3 despite lower PF.
  expect(standingNames()).toEqual(["Alpha", "Bravo", "Charlie", "Other"]);
  const notes = tiebreakNotes();
  expect(notes).toHaveLength(2);
  expect(notes[0]).toHaveTextContent("Alpha and Charlie and Bravo each have 5 wins");
  expect(notes[0]).toHaveTextContent("have played each other an equal number of times");
  expect(notes[0]).toHaveTextContent("Alpha takes the next seed on head-to-head record");
  expect(notes[1]).toHaveTextContent("Charlie and Bravo each have 5 wins");
  expect(notes[1]).not.toHaveTextContent("Alpha");
  expect(notes[1]).toHaveTextContent("Bravo takes the next seed on head-to-head record");
});

test.each(["split", "absent"])("uses points for when the remaining pair's head-to-head is %s", (meeting) => {
  completedSeason({ d: "Ducking", b: "Buckyball", m: "Malik", x: "Other" }, meeting === "split" ? [
    ["d", "b", 200, 10], ["b", "m", 20, 10], ["m", "b", 100, 10],
    ["d", "x", 200, 0], ["b", "x", 20, 0], ["m", "x", 100, 0],
  ] : [
    ["d", "b", 200, 10], ["d", "m", 200, 10],
    ["b", "x", 20, 0], ["b", "x", 20, 0],
    ["m", "x", 100, 0], ["m", "x", 100, 0],
  ]);
  render(<PlayoffMachine />);

  expect(standingNames()).toEqual(["Ducking", "Malik", "Buckyball", "Other"]);
  const notes = tiebreakNotes();
  expect(notes).toHaveLength(2);
  expect(notes[0]).toHaveTextContent("Ducking takes the next seed on points for");
  expect(notes[1]).toHaveTextContent("Buckyball and Malik each have 2 wins");
  expect(notes[1]).not.toHaveTextContent("Ducking");
  expect(notes[1]).toHaveTextContent("Malik takes the next seed on points for");
  expect(notes[1]).toHaveTextContent(meeting === "split"
    ? "because the best head-to-head records are tied"
    : "have not played each other");
});

test.each(["split", "absent"])("uses team name when points are equal and head-to-head is %s", (meeting) => {
  completedSeason({ b: "Bravo", a: "Alpha" }, meeting === "split" ? [
    ["a", "b", 10, 0], ["a", "b", 0, 10],
  ] : []);
  render(<PlayoffMachine />);

  expect(standingNames()).toEqual(["Alpha", "Bravo"]);
  const notes = tiebreakNotes();
  expect(notes).toHaveLength(1);
  expect(notes[0]).toHaveTextContent("Bravo and Alpha");
  expect(notes[0]).toHaveTextContent("Alpha takes the next seed on team name");
  expect(notes[0]).toHaveTextContent(meeting === "split"
    ? "because the best head-to-head records and points for are tied"
    : "because points for are tied");
});

test("2022 archived standings count regular-season wins and exclude postseason points", () => {
  vi.mocked(selectedWrapped).mockReturnValue(historical2022);
  render(<PlayoffMachine />);
  const expected: Record<string, [number, number]> = {
    "Team Morgan": [9, 1664.4],
    "🇺🇲🇺🇲🇺🇲 MCMCGAGA": [9, 1960.3],
    "IfYouAintFirst YoureLast": [8, 1901.38],
    "Forswearious Toney": [8, 1713.6],
    "SHOW ME YO TDs": [8, 1820.74],
    "Bass Pro Shops": [7, 1853.8],
    "Jahan The Man": [7, 1621.48],
    "Monday Night Fucking": [4, 1613.74],
    "Team Silver Finger": [3, 1473.56],
    "STL Cookies": [2, 1421.7],
  };
  for (const [name, [wins, points]] of Object.entries(expected)) {
    const card = screen.getByText(name, { selector: ".playoff-team-heading strong" }).closest(".playoff-team")!;
    const stats = card.querySelectorAll(".playoff-stats strong");
    expect(Number(stats[0].textContent)).toBe(wins);
    expect(Number(stats[1].textContent)).toBeCloseTo(points, 2);
  }
  expect(screen.queryAllByRole("radio")).toHaveLength(0);
  expect(screen.getByText("All weeks have finalized scoring.")).toBeInTheDocument();
  expect(screen.queryByText(/have not played each other/)).not.toBeInTheDocument();
});

test("an explicit zero cutoff is honored even for an archived year", () => {
  const wrapped = selectedWrapped();
  wrapped.year = "2022";
  wrapped.latestScoringPeriod = 0;
  render(<PlayoffMachine />);
  expect(screen.getByRole("heading", { name: "Week 1" })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Week 2" })).toBeInTheDocument();
  expect(screen.getAllByText("0", { selector: ".playoff-stats span:nth-child(2) strong" })).toHaveLength(2);
});

test("a missing current-season cutoff does not certify existing scores as final", () => {
  delete selectedWrapped().latestScoringPeriod;
  render(<PlayoffMachine />);
  expect(screen.getByRole("heading", { name: "Week 1" })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Week 2" })).toBeInTheDocument();
});

test("in-progress points cannot change the tiebreaker for finalized results", () => {
  const wrapped = selectedWrapped();
  wrapped.ffTeams.a.rosters["2"] = { ...wrapped.ffTeams.a.rosters["1"], weekNum: "2" };
  wrapped.nflPlayers.a.scores["2"] = 100;
  render(<PlayoffMachine />);
  expect(screen.getByText("Alpha", { selector: ".playoff-team-heading strong" }).closest(".playoff-team"))
    .toHaveTextContent("Points For: 20");
});

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

test("a completed week with NFL byes uses actual results instead of saved predictions", () => {
  const wrapped = selectedWrapped();
  const official = { statsOfficial: true };
  wrapped.latestScoringPeriod = latestCompletedWeek([
    { id: 1, proGamesByScoringPeriod: { "1": [official], "2": [official], "3": [{ statsOfficial: false }] } },
    { id: 2, proGamesByScoringPeriod: { "1": [official], "3": [{ statsOfficial: false }] } },
  ]);
  for (const id of ["a", "b"]) {
    wrapped.ffTeams[id].rosters["2"] = { ...wrapped.ffTeams[id].rosters["1"], weekNum: "2" };
    wrapped.nflPlayers[id].scores["2"] = id === "b" ? 30 : 10;
  }
  wrapped.ffMatchups["3"] = [["a", "b"]];
  openPicks({ "2": { "0": "a" } });
  render(<PlayoffMachine />);
  expect(screen.queryByRole("heading", { name: "Week 2" })).not.toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Week 3" })).toBeInTheDocument();
  expect(screen.getByText("Bravo", { selector: ".playoff-team-heading strong" })
    .closest(".playoff-team")).toHaveTextContent("1 wins");
});
