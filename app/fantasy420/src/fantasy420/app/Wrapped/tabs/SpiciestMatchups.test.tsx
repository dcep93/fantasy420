import { act, fireEvent, render, screen } from "@testing-library/react";
import type { WrappedType } from "../../FetchWrapped";
import { selectedWrapped } from "..";
import SpiciestMatchups, { loadMatchupSeasons, selectSpiciestMatchups } from "./SpiciestMatchups";
import { analyzeSpiciestMatchups, computeSpiciestMatchups, SeasonData } from "./spiciestMatchupsData";
import * as matchupData from "./spiciestMatchupsData";
import historical2023 from "../dataJson/2023.json";
import { summarizeSpiciness, TIMELINE_EVENT_EPSILON } from "./matchupSpiciness";
import { buildMatchupChunks, chunkMatchupPoints, GameWindow, MATCHUP_CHUNK_LABELS } from "./matchupTimelineChunks";

const scope = vi.hoisted(() => ({ year: "2026" }));
vi.mock("..", () => ({ selectedWrapped: vi.fn(), get selectedYear() { return scope.year; } }));
vi.mock("./MatchupLeadChart", () => ({
  default: ({ homeName, awayName }: { homeName: string; awayName: string }) => <div>{homeName} versus {awayName} chart</div>,
  formatMatchupTime: (timestamp: number) => new Date(timestamp).toISOString(),
}));

function fixture(): { wrapped: WrappedType; data: SeasonData } {
  const wrapped: WrappedType = {
    year: "2026", latestScoringPeriod: 1, weeklyProjectionDataVersion: 2,
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

afterEach(() => { vi.unstubAllGlobals(); scope.year = "2026"; });

test("week selection ranks across years before the top-ten cap and keeps the spice minimum", () => {
  const { wrapped, data } = fixture();
  const original = computeSpiciestMatchups(wrapped, data)[0];
  const candidates = [
    ...Array.from({ length: 10 }, (_, index) => ({ ...original, id: `top-${index}`, week: 1, score: 100 + index })),
    { ...original, id: "week2-new", year: "2026", week: 2, score: 30 },
    { ...original, id: "week2-old", year: "2025", week: 2, score: 40 },
    { ...original, id: "quiet", week: 3, score: 24 },
  ];
  expect(selectSpiciestMatchups(candidates).matchups).toHaveLength(10);
  expect(selectSpiciestMatchups(candidates, 2).matchups.map(matchup => matchup.id)).toEqual(["week2-old", "week2-new"]);
  expect(selectSpiciestMatchups(candidates, 3)).toMatchObject({ matchups: [], eligibleCount: 1, qualifyingCount: 0 });
  expect(selectSpiciestMatchups(candidates, 4)).toMatchObject({ matchups: [], eligibleCount: 0, qualifyingCount: 0 });
});

test("filters and clears weeks without refetching and resets on year changes", async () => {
  const { wrapped, data } = fixture();
  wrapped.ffMatchups[2] = wrapped.ffMatchups[1];
  wrapped.ffMatchups[3] = wrapped.ffMatchups[1];
  const original = computeSpiciestMatchups(wrapped, data)[0];
  const analysis = vi.spyOn(matchupData, "analyzeSpiciestMatchups").mockReturnValue({ omittedForProjections: 0, matchups: [
    ...Array.from({ length: 10 }, (_, index) => ({ ...original, id: `top-${index}`, score: 100 + index })),
    { ...original, id: "week2", week: 2, homeName: "Week two", score: 30 },
  ] });
  const fetchMock = vi.fn().mockImplementation(async () => new Response(JSON.stringify(data)));
  vi.stubGlobal("fetch", fetchMock);
  vi.mocked(selectedWrapped).mockReturnValue(wrapped);
  try {
    const { rerender } = render(<SpiciestMatchups />);
    await screen.findByText(/Showing 10 of 11 qualifying/);
    const filter = screen.getByRole("combobox", { name: "Week" });
    expect(filter).toHaveValue("all");
    fireEvent.change(filter, { target: { value: "2" } });
    expect(screen.getByText("Week two versus Bravo chart")).toBeVisible();
    expect(screen.getByRole("status")).toHaveTextContent("Showing 1 of 1 qualifying matchup in Week 2");
    expect(screen.getAllByRole("article")).toHaveLength(1);
    fireEvent.change(filter, { target: { value: "3" } });
    expect(screen.getByText(/No completed matchups with timeline data/)).toBeVisible();
    fireEvent.change(filter, { target: { value: "all" } });
    expect(screen.getAllByRole("article")).toHaveLength(10);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    fireEvent.change(filter, { target: { value: "2" } });
    scope.year = "2025";
    vi.mocked(selectedWrapped).mockReturnValue({ ...wrapped, year: "2025" });
    rerender(<SpiciestMatchups />);
    await screen.findByText(/Showing 10 of 11 qualifying/);
    expect(filter).toHaveValue("all");
  } finally {
    analysis.mockRestore();
  }
});

test("reconstructs projected swings and finishes at the exact starter totals", () => {
  const { wrapped, data } = fixture();
  const [matchup] = computeSpiciestMatchups(wrapped, data);
  expect(matchup).toMatchObject({ homeName: "Alpha", awayName: "Bravo", meaningfulLeadChanges: 1, lateLeadChanges: 1, reversalBonus: 10, finalScores: [12, 15] });
  expect(matchup.points[0]).toMatchObject({ scores: [0, 0], projectedScores: [10, 10] });
  expect(matchup.points.at(-1)).toMatchObject({ scores: [12, 15], projectedScores: [12, 15] });
  expect(matchup.lastReversalTimestamp).toBe(data.games[0].timestamp + 177 * 60_000);
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

test("excludes unavailable weekly projections without borrowing a generic projection, but accepts a verified zero", () => {
  const { wrapped, data } = fixture();
  delete wrapped.ffTeams.a.rosters[1].projections.a;
  expect(computeSpiciestMatchups(wrapped, data)).toEqual([]);
  wrapped.ffTeams.a.rosters[1].projections.a = NaN;
  expect(computeSpiciestMatchups(wrapped, data)).toEqual([]);
  wrapped.ffTeams.a.rosters[1].projections.a = 0;
  expect(computeSpiciestMatchups(wrapped, data)[0].points[0].projectedScores).toEqual([0, 10]);
});

test("rejects legacy and version 1 zeros while retaining nonzero historical projections", () => {
  const { wrapped, data } = fixture();
  delete wrapped.weeklyProjectionDataVersion;
  expect(computeSpiciestMatchups(wrapped, data)).toHaveLength(1);
  wrapped.ffTeams.a.rosters[1].projections.a = 0;
  expect(analyzeSpiciestMatchups(wrapped, data)).toEqual({ matchups: [], omittedForProjections: 1 });
  wrapped.weeklyProjectionDataVersion = 1;
  expect(analyzeSpiciestMatchups(wrapped, data)).toEqual({ matchups: [], omittedForProjections: 1 });
});

test("the reported 2023 Week 1 matchup cannot produce a false 100-to-0 probability graph", () => {
  const wrapped: WrappedType = { ...historical2023, ffMatchups: { "1": [["5", "9"]] } };
  expect(wrapped.ffTeams["5"].name).toBe("Monday Night Fucking");
  expect(wrapped.ffTeams["9"].name).toBe("Rains of justice");
  expect(analyzeSpiciestMatchups(wrapped, fixture().data)).toEqual({ matchups: [], omittedForProjections: 1 });
});

test("shows why a matchup was omitted instead of presenting a misleading graph", async () => {
  const { wrapped, data } = fixture();
  delete wrapped.weeklyProjectionDataVersion;
  wrapped.ffTeams.a.rosters[1].projections.a = 0;
  vi.mocked(selectedWrapped).mockReturnValue(wrapped);
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify(data))));
  render(<SpiciestMatchups />);
  expect(await screen.findByRole("note")).toHaveTextContent("1 matchup omitted because starter projections are missing or unverified (2026: 1)");
  expect(screen.queryByText("Alpha versus Bravo chart")).not.toBeInTheDocument();
});

test("all-years results report projection gaps without excluding healthy seasons", async () => {
  const { wrapped, data } = fixture();
  const legacy = structuredClone(wrapped);
  legacy.year = "2023";
  delete legacy.weeklyProjectionDataVersion;
  legacy.ffTeams.a.rosters[1].projections.a = 0;
  const result = await loadMatchupSeasons({ "2023": legacy, "2026": wrapped }, async () => data);
  expect(result.projectionOmissions).toEqual({ "2023": 1 });
  expect(result.excluded).toEqual([]);
  expect(result.matchups.map(matchup => matchup.year)).toEqual(["2026"]);
});

test("unrelated final NFL slots do not affect probability-based spice", () => {
  const { wrapped, data } = fixture();
  const original = computeSpiciestMatchups(wrapped, data)[0];
  data.games.push({ week: 1, timestamp: data.games[0].timestamp + 27 * 60 * 60_000,
    teams: [{ name: "KC" }, { name: "DAL" }], drives: [] });
  const extended = computeSpiciestMatchups(wrapped, data)[0];
  expect(extended.score).toBe(original.score);
  expect(extended.meaningfulLeadChanges).toBe(original.meaningfulLeadChanges);
  expect(extended.lastReversalTimestamp).toBe(original.lastReversalTimestamp);
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
  expect(matchup.swingScore).toBe(0);
  expect(matchup.reversalBonus).toBe(0);
  expect(matchup.score).toBeLessThan(25);
  expect(matchup.points.at(-1)).toMatchObject({ scores: [12, 15], projectedScores: [12, 15] });
});

test("shows a real empty state after loading instead of an endless loading message", async () => {
  const { wrapped } = fixture();
  vi.mocked(selectedWrapped).mockReturnValue(wrapped);
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ year: 2026, games: [] }))));
  render(<SpiciestMatchups />);
  expect(screen.getByRole("status")).toHaveTextContent("Loading");
  expect(await screen.findByText("No completed matchups with timeline data and verified weekly projections are available for this selection.")).toBeVisible();
  expect(screen.queryByRole("status")).not.toBeInTheDocument();
});

test("renders named chart, actual finals and transparent ranking formula", async () => {
  const { wrapped, data } = fixture();
  vi.mocked(selectedWrapped).mockReturnValue(wrapped);
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify(data))));
  render(<SpiciestMatchups />);
  expect(await screen.findByText("Alpha versus Bravo chart")).toBeVisible();
  const matchup = computeSpiciestMatchups(wrapped, data)[0];
  expect(screen.getByText(`${matchup.swingScore.toFixed(2)} probability swing percentage points + 10.00 reversal bonus + ${matchup.suspenseBonus.toFixed(2)} late suspense = ${matchup.score.toFixed(2)} spice`)).toBeVisible();
  expect(screen.getByText(/1 decisive favorite reversal, including 1 late/)).toBeVisible();
  expect(screen.getByText(/Showing 1 of 1 qualifying matchup/)).toBeVisible();
  expect(screen.getByText(/at least 25 spice/, { selector: 'p[role="status"]' })).toBeVisible();
  expect(screen.getByText(/first team’s estimated chance to win/i)).toBeVisible();
  expect(screen.getByText(/Alpha 12.00 · Bravo 15.00/)).toBeVisible();
});

test("shows a distinct no-qualifying state when completed, eligible matchups fall below 25", async () => {
  const { wrapped, data } = fixture();
  data.games[0].drives = [];
  const analysis = analyzeSpiciestMatchups(wrapped, data);
  expect(analysis.matchups).toHaveLength(1);
  expect(analysis.matchups[0].score).toBeLessThan(25);
  const loaded = await loadMatchupSeasons({ 2026: wrapped }, async () => data);
  expect(loaded).toMatchObject({ eligibleCount: 1, qualifyingCount: 0, matchups: [] });
  vi.mocked(selectedWrapped).mockReturnValue(wrapped);
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify(data))));
  render(<SpiciestMatchups />);
  expect(await screen.findByText("No completed matchups reached the 25-spice minimum for this selection.")).toBeVisible();
  expect(screen.queryByText("Alpha versus Bravo chart")).not.toBeInTheDocument();
});

test("the loader includes exactly 25 spice, excludes lower scores and caps display at ten", async () => {
  const { wrapped, data } = fixture();
  const original = computeSpiciestMatchups(wrapped, data)[0];
  const matchups = [24.99, 25, 25.01].map((score, index) => ({ ...original, id: `boundary-${index}`, score }));
  const analysis = vi.spyOn(matchupData, "analyzeSpiciestMatchups").mockReturnValue({ omittedForProjections: 0, matchups });
  try {
    const loaded = await loadMatchupSeasons({ 2026: wrapped }, async () => data);
    expect(loaded.matchups.map(matchup => matchup.score)).toEqual([25.01, 25]);
    expect(loaded).toMatchObject({ eligibleCount: 3, qualifyingCount: 2 });
    analysis.mockReturnValue({ omittedForProjections: 0,
      matchups: Array.from({ length: 12 }, (_, index) => ({ ...original, id: `matchup-${index}`, score: 25 + index })) });
    const capped = await loadMatchupSeasons({ 2026: wrapped }, async () => data);
    expect(capped).toMatchObject({ eligibleCount: 12, qualifyingCount: 12 });
    expect(capped.matchups.map(matchup => matchup.score)).toEqual([36, 35, 34, 33, 32, 31, 30, 29, 28, 27]);
  } finally {
    analysis.mockRestore();
  }
});

test("ties sort by last decisive reversal, then year, week and stable matchup ID", () => {
  const { wrapped, data } = fixture();
  const original = computeSpiciestMatchups(wrapped, data)[0];
  const candidates = [
    { id: "id-b", year: "2025", week: 1, lastReversalTimestamp: null },
    { id: "id-a", year: "2025", week: 1, lastReversalTimestamp: null },
    { id: "week", year: "2025", week: 2, lastReversalTimestamp: null },
    { id: "year", year: "2026", week: 1, lastReversalTimestamp: null },
    { id: "reversal", year: "2024", week: 1, lastReversalTimestamp: 100 },
    { id: "later", year: "2024", week: 1, lastReversalTimestamp: 200 },
  ].map(candidate => ({ ...original, ...candidate }));
  expect(candidates.sort(matchupData.compareMatchupSpiciness).map(matchup => matchup.id))
    .toEqual(["later", "reversal", "year", "week", "id-a", "id-b"]);
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
  await screen.findByText("No completed matchups with timeline data and verified weekly projections are available for this selection.");
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
  expect(summarizeSpiciness(data)).toEqual(summarizeSpiciness(original));
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


test.each(["III", "Jr.", "Sr.", "II", "IV"])("matches the actual surname before suffix %s", suffix => {
  const {wrapped,data}=fixture();
  wrapped.nflPlayers.a.name=`Kenneth Walker ${suffix}`;
  wrapped.nflPlayers.a.scores[1]=23.8;
  data.games[0].drives[0].plays=[
    {clock:"Q1 10:00",text:"K.Walker rushes for 19 yards."},
    {clock:"Q2 8:55",text:`Penalty Kenneth Walker ${suffix} 3 Yd Rush`},
    {clock:"Q3 10:00",text:"K.Walker catches a pass."},
  ];
  const [matchup]=computeSpiciestMatchups(wrapped,data);
  expect(matchup.points.find(p=>p.minute===15)?.scores[0]).toBeCloseTo(23.8/3);
  expect(matchup.points.find(p=>p.minute===63.25)?.scores[0]).toBeCloseTo(23.8*2/3);
  expect(matchup.points.at(-1)?.scores[0]).toBe(23.8);
});

test("all-years ranking pools seasons, keeps distinct IDs and names failed years", async () => {
  const {wrapped,data}=fixture();
  const older={...wrapped,year:"2025"};
  const result=await loadMatchupSeasons({2026:wrapped,2025:older,2024:{...wrapped,year:"2024"}},async year=>{
    if(year===2024)throw new Error("offline");
    return {...data,year};
  });
  expect(result.excluded).toEqual(["2024"]);
  expect(result.matchups.map(m=>m.year)).toEqual(["2026","2025"]);
  expect(new Set(result.matchups.map(m=>m.id)).size).toBe(2);
  const quiet={...data,games:data.games.map(g=>({...g,drives:[]}))};
  expect((await loadMatchupSeasons({2026:wrapped},async()=>quiet)).matchups).toEqual([]);
});

test("a Wednesday opener precedes Sunday, while the following Wednesday is post Sunday", () => {
  const opener=gameWindow("2026-09-10T00:20:00Z");
  const thursday=gameWindow("2026-09-11T00:35:00Z");
  const sunday=gameWindow("2026-09-13T17:00:00Z");
  const sundayNight=gameWindow("2026-09-14T00:20:00Z");
  const monday=gameWindow("2026-09-15T00:15:00Z");
  const followingWednesday=gameWindow("2026-09-17T00:20:00Z");
  const chunks=buildMatchupChunks([monday,sunday,followingWednesday,opener,sundayNight,thursday]);
  expect(chunks.map(chunk=>chunk.windows)).toEqual([[opener,thursday],[sunday],[sundayNight],[monday,followingWednesday]]);
  expect(chunks.flatMap(chunk=>chunk.windows).every(window=>window.end>=window.start)).toBe(true);
});

test("Wednesday Week 1 opener does not push Sunday scoring into the Monday section", () => {
  const {wrapped,data}=fixture();
  const sunday=data.games[0].timestamp;
  data.games.push(
    {week:1,timestamp:Date.parse("2026-09-10T00:20:00Z"),teams:[{name:"NE"},{name:"SEA"}],drives:[]},
    {week:1,timestamp:Date.parse("2026-09-14T00:20:00Z"),teams:[{name:"DAL"},{name:"NYG"}],drives:[]},
    {week:1,timestamp:Date.parse("2026-09-15T00:15:00Z"),teams:[{name:"DEN"},{name:"KC"}],drives:[]},
  );
  const [matchup]=computeSpiciestMatchups(wrapped,data);
  const chart=chunkMatchupPoints(matchup.points,matchup.chunks);
  for(const point of matchup.points.filter(p=>p.timestamp>=sunday&&p.timestamp<sunday+180*60_000)) {
    const plotted=chart.find(p=>p.timestamp===point.timestamp&&p.scores[0]===point.scores[0]&&p.scores[1]===point.scores[1]);
    expect(plotted?.position).toBeGreaterThanOrEqual(1);
    expect(plotted?.position).toBeLessThan(2);
  }
  expect(new Set(chart.filter(p=>p.position>1&&p.position<2).map(p=>p.lead)).size).toBeGreaterThan(2);
  expect(chart.every((point,index)=>!index||point.position>=chart[index-1].position)).toBe(true);
});

test("carries only the latest past contribution through projection decay and chunk boundaries", () => {
  const { wrapped, data } = fixture();
  const [matchup] = computeSpiciestMatchups(wrapped, data);
  const firstPlay = { clock: "Q1 10:00", text: "A.Runner rushes.", matchup: "BUF vs NYJ",
    timestamp: data.games[0].timestamp + 15 * 60_000 };
  expect(matchup.points[0].lastContributingPlays).toEqual([]);
  expect(matchup.points.find(point => point.minute === 15)?.lastContributingPlays).toEqual([expect.objectContaining(firstPlay)]);
  expect(matchup.points.find(point => point.minute === 60 - TIMELINE_EVENT_EPSILON)?.lastContributingPlays)
    .toEqual([expect.objectContaining(firstPlay)]);
  expect(matchup.points.find(point => point.minute === 60)?.lastContributingPlays)
    .toEqual([expect.objectContaining({ clock: "Q2 10:00", text: "B.Catcher catches." })]);
  expect(chunkMatchupPoints(matchup.points, matchup.chunks).at(-1)?.lastContributingPlays)
    .toEqual([expect.objectContaining({ clock: "Q4 1:00" })]);
});

test("does not invent contributions for zero points or score interpolation without plays", () => {
  const { wrapped, data } = fixture();
  wrapped.nflPlayers.b.scores[1] = 0;
  const [matchup] = computeSpiciestMatchups(wrapped, data);
  expect(matchup.points.at(-1)?.lastContributingPlays).toEqual([expect.objectContaining({ text: "A.Runner rushes." })]);
  data.games[0].drives = [];
  expect(computeSpiciestMatchups(wrapped, data)[0].points.every(point => !point.lastContributingPlays?.length)).toBe(true);
});

test("deduplicates a play contributing to both starters and retains co-timed games", () => {
  const { wrapped, data } = fixture();
  data.games[0].drives[0].plays = [{ clock: "Q1 10:00", text: "A.Runner passes to B.Catcher." }];
  expect(computeSpiciestMatchups(wrapped, data)[0].points.at(-1)?.lastContributingPlays).toHaveLength(1);
  const game = data.games[0];
  data.games = [
    { ...game, teams: [{ name: "BUF" }], drives: [{ plays: [{ clock: "Q1 10:00", text: "A.Runner rushes." }] }] },
    { ...game, teams: [{ name: "NYJ" }], drives: [{ plays: [{ clock: "Q1 10:00", text: "B.Catcher catches." }] }] },
  ];
  const plays = computeSpiciestMatchups(wrapped, data)[0].points.at(-1)?.lastContributingPlays;
  expect(plays?.map(play => play.text)).toEqual(["A.Runner rushes.", "B.Catcher catches."]);
});

test("keeps overtime game clocks and negative contributions", () => {
  const { wrapped, data } = fixture();
  wrapped.nflPlayers.b.scores[1] = -2;
  data.games[0].drives[0].plays.push({ clock: "Q5 1:00", text: "B.Catcher loses a fumble." });
  expect(computeSpiciestMatchups(wrapped, data)[0].points.at(-1)?.lastContributingPlays)
    .toEqual([expect.objectContaining({ clock: "Q5 1:00", text: "B.Catcher loses a fumble." })]);
});
