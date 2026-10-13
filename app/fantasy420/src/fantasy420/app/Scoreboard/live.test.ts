import { currentScoringWeek, fetchLiveScoreboard, withPregameTotals } from "./live";
import { headToHead, parseScoreboard } from "./data";
const schedule = () => ({ settings: { proTeams: [{ id: 1, proGamesByScoringPeriod: Object.fromEntries(
  Array.from({ length: 7 }, (_, i) => [i + 1, [{ statsOfficial: i < 5, date: i < 5 ? 1 : Date.now() + 100000 }]])) }, { id: 2, proGamesByScoringPeriod: { 5: [] } }] } });
const entry = (id: number, projection: number, slot = 0): any => ({ playerId: id, lineupSlotId: slot,
  playerPoolEntry: { lineupLocked: false, appliedStatTotal: 0, player: { fullName: `Player ${id}`, eligibleSlots: [0],
    stats: [{ seasonId: 2026, scoringPeriodId: 6, statSourceId: 1, statSplitTypeId: 1, appliedTotal: projection }] } } });
const side = (id: number, starting: number, bench: number) => ({ teamId: id, totalPoints: 0, totalProjectedPoints: starting,
  rosterForCurrentScoringPeriod: { entries: [entry(id * 10, starting), entry(id * 10 + 1, bench, 20)] } });
function league(): any {
  return { id: 203836968, scoringPeriodId: 6, status: { currentMatchupPeriod: 5 },
    settings: { name: "League", rosterSettings: { lineupSlotCounts: { 0: 1, 20: 5 } }, scheduleSettings: { matchupPeriods: { 5: [5], 6: [6] } } },
    teams: [1, 2, 3, 4].map(id => ({ id, name: `Team ${id}` })),
    schedule: [{ matchupPeriodId: 5, home: side(1, 0, 0), away: side(2, 0, 0) },
      { matchupPeriodId: 6, home: side(1, 10, 40), away: side(2, 11, 15) },
      { matchupPeriodId: 6, home: side(3, 10, 20), away: side(4, 21, 19) }] };
}
const prepared = () => withPregameTotals(league(), schedule(), 6, Date.now());
it("advances past official Week 5 despite byes and caps at season end", () => {
  expect(currentScoringWeek(schedule())).toBe(6);
  const done = schedule(); Object.values(done.settings.proTeams[0].proGamesByScoringPeriod).flat().forEach(g => g.statsOfficial = true);
  expect(currentScoringWeek(done)).toBe(7);
  expect(() => currentScoringWeek({})).toThrow(/schedule/);
});
it("does not advance past an unfinished game", () => {
  const data = schedule(); data.settings.proTeams[0].proGamesByScoringPeriod[5][0].statsOfficial = false;
  expect(currentScoringWeek(data)).toBe(5);
});
it("requests Week 6 with fresh authenticated data, optimizes everyone, and ranks after optimization", async () => {
  const fetcher = vi.fn().mockResolvedValueOnce(schedule()).mockResolvedValueOnce(league());
  const result = await fetchLiveScoreboard(2026, fetcher);
  expect(result.week).toBe(6); expect(result.matchups).toHaveLength(2);
  expect(fetcher.mock.calls[1][0]).toMatchObject({ maxAgeMs: 0, options: { credentials: "include", cache: "no-store" } });
  expect(new URL(fetcher.mock.calls[1][0].url).searchParams.get("scoringPeriodId")).toBe("6");
  expect(result.matchups.flat().map(t => t.projected)).toEqual([40, 15, 20, 21]);
  expect(result.matchups.flat().every(t => t.projectedLineup?.players.length === 1)).toBe(true);
  const ranked = headToHead(result);
  expect(ranked[0].teams.map(t => t.id)).toEqual([4, 3]);
  expect(Math.abs(ranked[0].probability! - .5)).toBeLessThan(Math.abs(ranked[1].probability! - .5));
});
it("does not manufacture probability from missing stats data", () => {
  const data = prepared(); delete data.schedule[1].home.rosterForCurrentScoringPeriod.entries[1].playerPoolEntry.player.stats;
  const result = parseScoreboard(data, 2026, 1, { week: 6, optimizeAll: true });
  expect(result.matchups[0][0].projected).toBeNull();
  expect(result.matchups[0][0].projectedLineup?.warning).toMatch(/weekly projection/);
  expect(headToHead(result).at(-1)?.probability).toBeNull();
});
it("keeps live matchup odds available when Tyreek Hill has no weekly forecast", () => {
  const data = prepared();
  const hill = data.schedule[1].home.rosterForCurrentScoringPeriod.entries[1].playerPoolEntry.player;
  hill.fullName = "Tyreek Hill";
  hill.stats = [];
  const result = parseScoreboard(data, 2026, 1, { week: 6, optimizeAll: true });
  expect(result.matchups[0][0].projected).toBe(10);
  expect(result.matchups[0][0].projectedLineup?.warning).toBeUndefined();
  expect(headToHead(result).every(matchup => matchup.probability !== null)).toBe(true);
});
it("preserves locked starters and excludes locked bench players for non-target teams", () => {
  const data = prepared(); data.schedule[1].home.rosterForCurrentScoringPeriod.entries.forEach((p: any) => p.playerPoolEntry.lineupLocked = true);
  const result = parseScoreboard(data, 2026, 1, { week: 6, optimizeAll: true });
  expect(result.matchups[0][0].projected).toBe(10);
  expect(result.matchups[0][0].projectedLineup?.players[0].id).toBe(10);
});
it("rejects stale responses and maps scoring weeks to multiweek matchup periods", () => {
  const data = prepared(); data.scoringPeriodId = 5;
  expect(() => parseScoreboard(data, 2026, 1, { week: 6 })).toThrow(/Requested Week 6/);
  data.scoringPeriodId = 6; data.settings.scheduleSettings.matchupPeriods = { 5: [5, 6], 6: [7] };
  expect(parseScoreboard(data, 2026, 1, { week: 6 }).matchups).toHaveLength(1);
});
it("only uses pregame totals before all kickoffs, never overwriting live scores", () => {
  const data = league(), nfl = schedule();
  expect(withPregameTotals(data, nfl, 6, Date.now()).schedule[1].home.totalPointsLive).toBe(0);
  nfl.settings.proTeams[0].proGamesByScoringPeriod[6][0].date = 1;
  expect(withPregameTotals(data, nfl, 6, Date.now())).toBe(data);
});
