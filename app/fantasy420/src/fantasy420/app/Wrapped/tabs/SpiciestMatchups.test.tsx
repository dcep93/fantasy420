import { act, render, screen } from "@testing-library/react";
import type { WrappedType } from "../../FetchWrapped";
import { selectedWrapped } from "..";
import SpiciestMatchups from "./SpiciestMatchups";
import { computeSpiciestMatchups, SeasonData, summarizeLeadChanges, TimelinePoint } from "./spiciestMatchupsData";

vi.mock("..", () => ({ selectedWrapped: vi.fn(), selectedYear: "2026" }));
vi.mock("./MatchupLeadChart", () => ({
  default: ({ homeName, awayName }: { homeName: string; awayName: string }) => <div>{homeName} versus {awayName} chart</div>,
  formatMatchupTime: (timestamp: number) => new Date(timestamp).toISOString(),
}));

function fixture(): { wrapped: WrappedType; data: SeasonData } {
  const wrapped: WrappedType = {
    year: "2026", latestScoringPeriod: 1,
    nflTeams: { a: { id: "a", name: "Bills", byeWeek: 0, nflGamesByScoringPeriod: {} },
      b: { id: "b", name: "Jets", byeWeek: 0, nflGamesByScoringPeriod: {} } },
    nflPlayers: {
      a: { id: "a", name: "Alpha Runner", nflTeamId: "a", position: "RB", scores: { 1: 12 }, projection: 10, total: 12, average: 12 },
      b: { id: "b", name: "Bravo Catcher", nflTeamId: "b", position: "WR", scores: { 1: 15 }, projection: 10, total: 15, average: 15 },
    },
    ffTeams: Object.fromEntries(["a", "b"].map(id => [id, { id, name: id === "a" ? "Alpha" : "Bravo", draft: [],
      rosters: { 1: { weekNum: "1", starting: [id], rostered: [id], projections: {} } } }])),
    ffMatchups: { 1: [["a", "b"]] },
  };
  const data: SeasonData = { year: 2026, games: [{ week: 1, timestamp: Date.UTC(2026, 8, 13, 17),
    teams: [{ name: "BUF" }, { name: "NYJ" }],
    drives: [{ plays: [
      { clock: "Q1 10:00", text: "A.Runner rushes." },
      { clock: "Q2 10:00", text: "B.Catcher catches." },
      { clock: "Q4 1:00", text: "B.Catcher catches." },
    ] }],
  }] };
  return { wrapped, data };
}

function points(entries: [number, number, number][]): TimelinePoint[] {
  return entries.map(([minute, home, away]) => ({ minute, scores: [home, away] }));
}

afterEach(() => { vi.unstubAllGlobals(); });

test("only counts changes between team leaders, including a change through a tie", () => {
  expect(summarizeLeadChanges(points([
    [0, 0, 0], [10, 10, 0], [20, 10, 10], [30, 10, 20],
    [40, 20, 20], [50, 20, 21], [60, 30, 21], [180, 30, 21],
  ]))).toEqual({ leadChanges: 2, lateLeadChanges: 0, lastLeadChangeMinute: 60, score: 2 });
});

test("weights changes in the last 45 minutes, including the boundary", () => {
  expect(summarizeLeadChanges(points([
    [0, 0, 0], [10, 10, 0], [134, 10, 20], [135, 30, 20], [170, 30, 40], [180, 30, 40],
  ]))).toEqual({ leadChanges: 3, lateLeadChanges: 2, lastLeadChangeMinute: 170, score: 4 });
});

test("empty, tied, and one-sided timelines have no changes; floating-point ties do not flip", () => {
  for (const timeline of [[], points([[0, 0, 0], [180, 20, 20]]),
    points([[0, 0, 0], [20, 10, 0], [180, 10, 0]]),
    points([[0, 0, 0], [20, 0.3, 0.1], [180, 0.3, 0.1 + 0.2]])]) {
    expect(summarizeLeadChanges(timeline)).toEqual({
      leadChanges: 0, lateLeadChanges: 0, lastLeadChangeMinute: null, score: 0,
    });
  }
});

test("reconstructs a late lead change and ends at the exact starter totals", () => {
  const { wrapped, data } = fixture();
  const [matchup] = computeSpiciestMatchups(wrapped, data);
  expect(matchup).toMatchObject({ homeName: "Alpha", awayName: "Bravo", leadChanges: 1, lateLeadChanges: 1, score: 1.5, finalScores: [12, 15] });
  expect(matchup.points.at(-1)?.scores).toEqual([12, 15]);
  expect(matchup.lastLeadChangeTimestamp).toBe(data.games[0].timestamp + 177 * 60_000);
});

test("negative totals remain gradual and finish exactly even in overtime", () => {
  const { wrapped, data } = fixture();
  wrapped.nflPlayers.b.scores[1] = -4;
  data.games[0].drives[0].plays.push({ clock: "Q5 1:00", text: "B.Catcher fumbles." });
  const [matchup] = computeSpiciestMatchups(wrapped, data);
  expect(matchup.points.at(-1)?.scores).toEqual([12, -4]);
  expect(matchup.finalScores).toEqual([12, -4]);
  expect(matchup.points.find(point => point.minute === 60)?.scores[1]).toBeCloseTo(-4 / 3);
  expect(matchup.points.at(-1)?.minute).toBeGreaterThan(180);
  expect(matchup.points.every(point => point.scores.every(Number.isFinite))).toBe(true);
});

test("ignores future and preseason matchups, and handles missing schedule or rosters", () => {
  const { wrapped, data } = fixture();
  wrapped.ffMatchups[0] = [["a", "b"]];
  wrapped.ffMatchups[2] = [["a", "b"]];
  wrapped.ffMatchups[1].push(["a", "missing"]);
  for (const week of [0, 2]) {
    data.games.push({ ...data.games[0], week });
    for (const team of Object.values(wrapped.ffTeams)) team.rosters[week] = team.rosters[1];
  }
  expect(computeSpiciestMatchups(wrapped, data).map(matchup => matchup.week)).toEqual([1]);
  expect(computeSpiciestMatchups({ ...wrapped, latestScoringPeriod: 0 }, data)).toEqual([]);
  expect(computeSpiciestMatchups(wrapped, { year: 2026, games: [] })).toEqual([]);
});

test("missing play data still ends at recorded totals", () => {
  const { wrapped, data } = fixture();
  data.games[0].drives = [];
  expect(computeSpiciestMatchups(wrapped, data)[0].points.at(-1)?.scores).toEqual([12, 15]);
});

test("shows a real empty state after loading instead of an endless loading message", async () => {
  const { wrapped } = fixture();
  vi.mocked(selectedWrapped).mockReturnValue(wrapped);
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ year: 2026, games: [] }))));
  render(<SpiciestMatchups />);
  expect(screen.getByRole("status")).toHaveTextContent("Loading");
  expect(await screen.findByText("No completed matchups with timeline data are available for this season.")).toBeVisible();
  expect(screen.queryByRole("status")).not.toBeInTheDocument();
});

test("renders named chart, actual finals and transparent ranking formula", async () => {
  const { wrapped, data } = fixture();
  vi.mocked(selectedWrapped).mockReturnValue(wrapped);
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify(data))));
  render(<SpiciestMatchups />);
  expect(await screen.findByText("Alpha versus Bravo chart")).toBeVisible();
  expect(screen.getByText("1 lead change + 1 late × 0.5 = 1.5 spice")).toBeVisible();
  expect(screen.getByText(/Alpha 12.00 · Bravo 15.00/)).toBeVisible();
});

test("reports fetch failures", async () => {
  vi.mocked(selectedWrapped).mockReturnValue(fixture().wrapped);
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("", { status: 503 })));
  render(<SpiciestMatchups />);
  expect(await screen.findByRole("alert")).toHaveTextContent("HTTP 503");
});

test("ignores a stale response after the season data changes", async () => {
  const { wrapped, data } = fixture();
  let resolveOld!: (response: Response) => void;
  const oldRequest = new Promise<Response>(resolve => { resolveOld = resolve; });
  vi.stubGlobal("fetch", vi.fn().mockReturnValueOnce(oldRequest)
    .mockResolvedValueOnce(new Response(JSON.stringify({ year: 2026, games: [] }))));
  vi.mocked(selectedWrapped).mockReturnValue(wrapped);
  const { rerender } = render(<SpiciestMatchups />);
  vi.mocked(selectedWrapped).mockReturnValue({ ...wrapped, latestScoringPeriod: 0 });
  rerender(<SpiciestMatchups />);
  await screen.findByText("No completed matchups with timeline data are available for this season.");
  await act(async () => { resolveOld(new Response(JSON.stringify(data))); });
  expect(screen.queryByText("Alpha versus Bravo chart")).not.toBeInTheDocument();
});
