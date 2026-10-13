import { act, render, screen } from "@testing-library/react";
import type { WrappedType } from "../../FetchWrapped";
import { selectedWrapped } from "..";
import SpiciestMatchups from "./SpiciestMatchups";
import { computeSpiciestMatchups, SeasonData, TimelinePoint } from "./spiciestMatchupsData";
import { summarizeSpiciness, TIMELINE_EVENT_EPSILON } from "./matchupSpiciness";
import { buildMatchupChunks, chunkMatchupPoints, GameWindow, MATCHUP_CHUNK_LABELS } from "./matchupTimelineChunks";

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
      rosters: { 1: { weekNum: "1", starting: [id], rostered: [id], projections: { [id]: 10 } } } }])),
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
  return entries.map(([minute, home, away]) => ({ minute, scores: [home, away], projectedScores: [home, away] }));
}

afterEach(() => { vi.unstubAllGlobals(); });

const lateSlot = { start: 100, end: 200 };

function leads(entries: [number, number][]): TimelinePoint[] {
  return points(entries.map(([minute, lead]) => [minute, lead, 0]));
}

test("big swings outrank early wiggles and do not require a lead change", () => {
  const wiggles = leads(Array.from({ length: 50 }, (_, minute) => [minute, minute % 2 ? 0.5 : -0.5]));
  expect(summarizeSpiciness(wiggles, lateSlot).score).toBe(0);
  expect(summarizeSpiciness(leads([[0, -40], [50, -10]]), lateSlot)).toMatchObject({
    biggestSwings: [30], swingScore: 30, finalSlotBonus: 0, score: 30,
  });
});

test("filters small reversals while keeping sustained swings and the terminal swing", () => {
  expect(summarizeSpiciness(leads([[0, 0], [10, 12], [20, 10], [30, 20], [40, 16], [50, 25], [60, 18]]), lateSlot))
    .toMatchObject({ biggestSwings: [25, 7], swingScore: 32, score: 32 });
  expect(summarizeSpiciness(leads([[0, 0], [10, 3], [20, -3]]), lateSlot).biggestSwings).toEqual([6]);
});

test("counts only the three largest swings and includes the five-point threshold", () => {
  expect(summarizeSpiciness(leads([[0, 0], [10, 10], [20, -10], [30, 20], [40, -20], [50, 0]]), lateSlot))
    .toMatchObject({ biggestSwings: [40, 30, 20], swingScore: 90 });
  expect(summarizeSpiciness(leads([[0, 0], [1, 5]]), lateSlot).score).toBe(5);
  expect(summarizeSpiciness(leads([[0, 0], [1, 4.99]]), lateSlot).score).toBe(0);
});

test("rewards tiny flips only in the final slot and caps the bonus", () => {
  const wiggles = leads(Array.from({ length: 21 }, (_, i) => [100 + i, i % 2 ? 0.5 : -0.5]));
  expect(summarizeSpiciness(wiggles, lateSlot)).toMatchObject({
    biggestSwings: [], finalSlotLeadChanges: 20, finalSlotBonus: 10, score: 10,
  });
  expect(summarizeSpiciness(wiggles, { start: 0, end: 99 }).score).toBe(0);
  expect(summarizeSpiciness(leads([[0, -40], [50, -10]]), lateSlot).score)
    .toBeGreaterThan(summarizeSpiciness(wiggles, lateSlot).score);
});

test("ties preserve the leader, first acquisition is not a flip, and floating-point ties remain tied", () => {
  expect(summarizeSpiciness(leads([[0, -1], [100, 0], [110, 1], [120, 0], [130, -1]]), lateSlot))
    .toMatchObject({ finalSlotLeadChanges: 2, finalSlotBonus: 4, lastFinalSlotLeadChangeMinute: 120 });
  for (const timeline of [[], leads([[100, 0], [110, 1]]), leads([[100, 1], [110, 0], [120, 1]]),
    points([[100, 0.3, 0.1], [120, 0.3, 0.1 + 0.2]])]) {
    expect(summarizeSpiciness(timeline, lateSlot)).toMatchObject({ score: 0, finalSlotLeadChanges: 0 });
  }
});

test("uses interpolated crossing times and exact event boundaries for final-slot bonuses", () => {
  const slot = { start: 50, end: 90 };
  expect(summarizeSpiciness(leads([[0, 1], [100, -9]]), slot).finalSlotLeadChanges).toBe(0);
  expect(summarizeSpiciness(leads([[0, 9], [100, -1]]), slot))
    .toMatchObject({ finalSlotLeadChanges: 1, lastFinalSlotLeadChangeMinute: 90 });
  expect(summarizeSpiciness(leads([[0, 1], [100, -1]]), slot))
    .toMatchObject({ finalSlotLeadChanges: 1, lastFinalSlotLeadChangeMinute: 50 });
  expect(summarizeSpiciness(leads([[0, 1], [50 - TIMELINE_EVENT_EPSILON, 1], [50, -1]]), slot))
    .toMatchObject({ finalSlotLeadChanges: 1, lastFinalSlotLeadChangeMinute: 50 });
});

test("reconstructs projected swings and finishes at the exact starter totals", () => {
  const { wrapped, data } = fixture();
  const [matchup] = computeSpiciestMatchups(wrapped, data);
  expect(matchup).toMatchObject({ homeName: "Alpha", awayName: "Bravo", biggestSwings: [15, 12],
    swingScore: 27, finalSlotLeadChanges: 1, finalSlotBonus: 2, score: 29, finalScores: [12, 15] });
  expect(matchup.points[0]).toMatchObject({ scores: [0, 0], projectedScores: [10, 10] });
  expect(matchup.points.at(-1)).toMatchObject({ scores: [12, 15], projectedScores: [12, 15] });
  expect(matchup.lastFinalSlotLeadChangeTimestamp).toBe(data.games[0].timestamp + 177 * 60_000);
});

test("uses week-specific projections and game progress independently of points earned", () => {
  const { wrapped, data } = fixture();
  wrapped.ffTeams.a.rosters[1].projections.a = 20;
  wrapped.ffTeams.b.rosters[1].projections.b = 18;
  data.games[0].drives[0].plays = [
    { clock: "Q3 15:00", text: "A.Runner rushes." },
    { clock: "Q4 10:00", text: "A.Runner rushes." },
    { clock: "Q4 0:00", text: "B.Catcher catches." },
  ];
  const [matchup] = computeSpiciestMatchups(wrapped, data);
  expect(matchup.points[0].projectedScores).toEqual([20, 18]);
  expect(matchup.points.find(point => point.minute === 90)).toMatchObject({
    scores: [6, 0], projectedScores: [16, 9],
  });
  expect(matchup.points.at(-1)?.projectedScores).toEqual([12, 15]);
});

test("keeps unstarted players fully projected after an earlier game finishes", () => {
  const { wrapped, data } = fixture();
  const sunday = data.games[0];
  const mondayStart = sunday.timestamp + 27 * 60 * 60_000;
  data.games = [
    { ...sunday, teams: [{ name: "BUF" }] },
    { ...sunday, timestamp: mondayStart, teams: [{ name: "NYJ" }] },
  ];
  wrapped.ffTeams.a.rosters[1].projections.a = 20;
  wrapped.ffTeams.b.rosters[1].projections.b = 30;
  const [matchup] = computeSpiciestMatchups(wrapped, data);
  expect(matchup.points.find(point => point.minute === 180)).toMatchObject({
    scores: [12, 0], projectedScores: [12, 30],
  });
  expect(matchup.points.find(point => point.timestamp === mondayStart)).toMatchObject({
    scores: [12, 0], projectedScores: [12, 30],
  });
  expect(matchup.points.at(-1)?.projectedScores).toEqual([12, 15]);
});

test("negative totals remain gradual and finish exactly even in overtime", () => {
  const { wrapped, data } = fixture();
  wrapped.nflPlayers.b.scores[1] = -4;
  data.games[0].drives[0].plays.push({ clock: "Q5 1:00", text: "B.Catcher fumbles." });
  const [matchup] = computeSpiciestMatchups(wrapped, data);
  expect(matchup.points.at(-1)?.scores).toEqual([12, -4]);
  expect(matchup.points.at(-1)?.projectedScores).toEqual([12, -4]);
  expect(matchup.finalScores).toEqual([12, -4]);
  expect(matchup.points.find(point => point.minute === 60)?.scores[1]).toBeCloseTo(-4 / 3);
  expect(matchup.points.at(-1)?.minute).toBeGreaterThan(180);
  expect(matchup.points.every(point => point.scores.every(Number.isFinite))).toBe(true);
  expect(matchup.points.every(point => point.projectedScores.every(Number.isFinite))).toBe(true);
});

test("excludes unavailable weekly projections without borrowing a generic projection, but accepts zero", () => {
  const { wrapped, data } = fixture();
  delete wrapped.ffTeams.a.rosters[1].projections.a;
  expect(computeSpiciestMatchups(wrapped, data)).toEqual([]);
  wrapped.ffTeams.a.rosters[1].projections.a = NaN;
  expect(computeSpiciestMatchups(wrapped, data)).toEqual([]);
  wrapped.ffTeams.a.rosters[1].projections.a = 0;
  expect(computeSpiciestMatchups(wrapped, data)[0].points[0].projectedScores).toEqual([0, 10]);
});

test("Sunday flips earn no bonus when Monday is the week's final NFL slot", () => {
  const { wrapped, data } = fixture();
  data.games.push({ week: 1, timestamp: data.games[0].timestamp + 27 * 60 * 60_000,
    teams: [{ name: "KC" }, { name: "DAL" }], drives: [] });
  expect(computeSpiciestMatchups(wrapped, data)[0]).toMatchObject({
    biggestSwings: [15, 12], finalSlotLeadChanges: 0, finalSlotBonus: 0,
    lastFinalSlotLeadChangeTimestamp: null, score: 27,
  });
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

test("missing plays use gradual scoring rather than an artificial projection crash at game end", () => {
  const { wrapped, data } = fixture();
  data.games[0].drives = [];
  wrapped.ffTeams.a.rosters[1].projections.a = 12;
  wrapped.ffTeams.b.rosters[1].projections.b = 15;
  data.games.push({ week: 1, timestamp: data.games[0].timestamp + 90 * 60_000,
    teams: [{ name: "KC" }, { name: "DAL" }], drives: [] });
  const [matchup] = computeSpiciestMatchups(wrapped, data);
  expect(matchup.points.find(point => point.minute === 90)).toMatchObject({
    scores: [6, 7.5], projectedScores: [12, 15],
  });
  expect(matchup.score).toBe(0);
  expect(matchup.points.at(-1)).toMatchObject({ scores: [12, 15], projectedScores: [12, 15] });
});

test("shows a real empty state after loading instead of an endless loading message", async () => {
  const { wrapped } = fixture();
  vi.mocked(selectedWrapped).mockReturnValue(wrapped);
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ year: 2026, games: [] }))));
  render(<SpiciestMatchups />);
  expect(screen.getByRole("status")).toHaveTextContent("Loading");
  expect(await screen.findByText("No completed matchups with timeline data and weekly projections are available for this season.")).toBeVisible();
  expect(screen.queryByRole("status")).not.toBeInTheDocument();
});

test("renders named chart, actual finals and transparent ranking formula", async () => {
  const { wrapped, data } = fixture();
  vi.mocked(selectedWrapped).mockReturnValue(wrapped);
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify(data))));
  render(<SpiciestMatchups />);
  expect(await screen.findByText("Alpha versus Bravo chart")).toBeVisible();
  expect(screen.getByText("27.00 swing pts + 2 final-slot bonus = 29.00 spice")).toBeVisible();
  expect(screen.getByText(/Biggest swings: 15.00 \+ 12.00/)).toBeVisible();
  expect(screen.getByText(/estimated projected finish differential/i)).toBeVisible();
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
  await screen.findByText("No completed matchups with timeline data and weekly projections are available for this season.");
  await act(async () => { resolveOld(new Response(JSON.stringify(data))); });
  expect(screen.queryByText("Alpha versus Bravo chart")).not.toBeInTheDocument();
});

function gameWindow(iso: string, minutes = 180): GameWindow {
  const start = Date.parse(iso);
  return { start, end: start + minutes * 60_000 };
}

test("groups by Eastern kickoff day, including Saturday/Sunday games on the following UTC day", () => {
  const games = [
    gameWindow("2026-09-11T00:20:00Z"), // Thursday night
    gameWindow("2026-09-13T00:20:00Z"), // Saturday night
    gameWindow("2026-09-13T13:30:00Z"), // Sunday international game
    gameWindow("2026-09-13T17:00:00Z"),
    gameWindow("2026-09-13T20:25:00Z"),
    gameWindow("2026-09-14T00:20:00Z", 240), // Sunday night ending Monday ET
    gameWindow("2026-09-14T23:15:00Z"),
  ];
  const chunks = buildMatchupChunks(games);
  expect(chunks.map(chunk => chunk.label)).toEqual(MATCHUP_CHUNK_LABELS);
  expect(chunks.map(chunk => chunk.windows.length)).toEqual([2, 3, 1, 1]);
  expect(chunks[2].windows).toEqual([games[5]]);
  expect(chunks[3].windows).toEqual([games[6]]);
});

test("uses Eastern standard time and the actual last Sunday slot, including simultaneous kickoffs", () => {
  const saturday = gameWindow("2026-12-27T04:30:00Z");
  const early = gameWindow("2026-12-27T18:00:00Z");
  const late = gameWindow("2026-12-27T21:25:00Z");
  const chunks = buildMatchupChunks([late, early, saturday, late]);
  expect(chunks.map(chunk => chunk.windows)).toEqual([[saturday], [early], [late], []]);
});

test("merges overlapping games and clips an earlier slot at the next slot's kickoff", () => {
  const first = gameWindow("2026-09-13T17:00:00Z", 300);
  const second = gameWindow("2026-09-13T18:00:00Z", 300);
  const final = gameWindow("2026-09-13T21:00:00Z");
  expect(buildMatchupChunks([first, second, final])[1].windows).toEqual([
    { start: first.start, end: final.start },
  ]);
});

test("retains all four chunks when Sunday or the entire schedule is empty", () => {
  const monday = gameWindow("2026-09-14T23:15:00Z");
  expect(buildMatchupChunks([monday]).map(chunk => chunk.windows)).toEqual([[], [], [], [monday]]);
  expect(buildMatchupChunks([]).map(chunk => chunk.windows)).toEqual([[], [], [], []]);
  expect(chunkMatchupPoints([], buildMatchupChunks([]))).toEqual([]);
});

test("compresses idle gaps, preserves every original score point, and carries scores across chunks", () => {
  const thursday = gameWindow("2026-09-11T00:20:00Z");
  const saturday = gameWindow("2026-09-12T17:00:00Z");
  const sunday = gameWindow("2026-09-14T00:20:00Z");
  const monday = gameWindow("2026-09-14T23:15:00Z");
  const entries = [
    [thursday.start, 0, 0], [thursday.end, 10, 0],
    [saturday.start, 10, 0], [saturday.end, 10, 12],
    [sunday.start, 10, 12], [sunday.end, 20, 12],
    [monday.start, 20, 12], [monday.end, 20, 25],
  ];
  const original = entries.map(([timestamp, home, away]) => ({
    timestamp, minute: (timestamp - thursday.start) / 60_000, scores: [home, away] as [number, number],
    projectedScores: [home, away] as [number, number],
  }));
  const data = chunkMatchupPoints(original, buildMatchupChunks([monday, sunday, saturday, thursday]));
  for (const point of original) expect(data).toContainEqual(expect.objectContaining(point));
  const firstEnd = data.find(point => point.timestamp === thursday.end)!;
  const secondStart = data.find(point => point.timestamp === saturday.start)!;
  expect(firstEnd.position).toBeCloseTo(0.5);
  expect(secondStart.position).toBeCloseTo(firstEnd.position);
  expect(data.filter(point => point.position >= 1 && point.position <= 2)
    .every(point => point.lead === -2)).toBe(true);
  expect(data.at(-1)).toMatchObject({ position: 4, scores: [20, 25], lead: -5 });
  expect(data.every((point, index) => !index || point.position >= data[index - 1].position)).toBe(true);
  const slot = { start: (monday.start - thursday.start) / 60_000, end: (monday.end - thursday.start) / 60_000 };
  expect(summarizeSpiciness(data, slot)).toEqual(summarizeSpiciness(original, slot));
});

test("Sunday final slot comes from the full schedule even when no fantasy starter plays in it", () => {
  const { wrapped, data } = fixture();
  const final = gameWindow("2026-09-14T00:20:00Z");
  data.games.push({ week: 1, timestamp: final.start, teams: [{ name: "KC" }, { name: "DAL" }], drives: [] });
  const [matchup] = computeSpiciestMatchups(wrapped, data);
  expect(matchup.chunks[1].windows[0].start).toBe(data.games[0].timestamp);
  expect(matchup.chunks[2].windows).toEqual([final]);
  const chartPoints = chunkMatchupPoints(matchup.points, matchup.chunks);
  expect(chartPoints.filter(point => point.position >= 2).every(point =>
    point.scores[0] === 12 && point.scores[1] === 15 &&
    point.projectedScores[0] === 12 && point.projectedScores[1] === 15)).toBe(true);
});
