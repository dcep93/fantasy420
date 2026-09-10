import { createScoreboardController } from "./controller";
import { guillotine, headToHead, parseScoreboard } from "./data";
import { guillotineSigma, headToHeadProbability, probNormalMinAll } from "./probability";

export const league = () => ({
  id: 123, scoringPeriodId: 15, status: { currentMatchupPeriod: 14 }, settings: { name: "Sunday league" },
  teams: [{ id: 1, name: "Alpha" }, { id: 2, name: "Bravo" }, { id: 3, name: "Charlie" }],
  schedule: [
    { matchupPeriodId: 13, home: { teamId: 1, totalPointsLive: 999, totalProjectedPointsLive: 999 } },
    { matchupPeriodId: 14, home: { teamId: 1, totalPointsLive: 80, totalProjectedPointsLive: 120 }, away: { teamId: 2, totalPointsLive: 75, totalProjectedPointsLive: 110 } },
    { matchupPeriodId: 14, home: { teamId: 3, totalPointsLive: 0, totalProjectedPointsLive: 90 } },
  ],
});
const response = () => ({ data: league(), fetched: 1, year: 2026, fetchedAt: 1000 });

describe("recovered NFLStream probability models", () => {
  it("matches known head-to-head results and complementary odds", () => {
    const a = { score: 80, projected: 120 }, b = { score: 75, projected: 110 };
    // Independent high-precision CDF references; recovered erf is ~1e-7 accurate.
    expect(headToHeadProbability(a, b)).toBeCloseTo(0.680703961, 6);
    expect(headToHeadProbability(b, a)).toBeCloseTo(1 - 0.680703961, 6);
    expect(headToHeadProbability({ score: 110, projected: 120 }, { score: 105, projected: 110 })).toBeCloseTo(0.8067618846, 6);
  });
  it("handles ties, finished teams and projections below actual without NaN", () => {
    expect(headToHeadProbability({ score: 100, projected: 100 }, { score: 100, projected: 100 })).toBe(0.5);
    expect(headToHeadProbability({ score: 100, projected: 100 }, { score: 90, projected: 90 })).toBe(1);
    expect(headToHeadProbability({ score: 110, projected: 100 }, { score: 90, projected: 90 })).toBe(1);
    expect(guillotineSigma(100, 100)).toBe(0.01);
  });
  it("gives exchangeable teams equal elimination risk, including 18 teams", () => {
    expect(probNormalMinAll([], [])).toEqual([]);
    expect(probNormalMinAll([100], [10])).toEqual([1]);
    const probabilities = probNormalMinAll(Array(18).fill(110), Array(18).fill(12));
    probabilities.forEach(value => expect(value).toBeCloseTo(1 / 18, 7));
    expect(probabilities.reduce((a, b) => a + b)).toBeCloseTo(1, 12);
  });
  it("agrees with the two-normal closed form and resolves nearly finished teams", () => {
    expect(probNormalMinAll([100, 110], [10, 10])[0]).toBeCloseTo(0.76024994, 6);
    const risks = probNormalMinAll([90, 100, 110], [0.01, 0.01, 0.01]);
    expect(risks[0]).toBeCloseTo(1, 8);
    expect(risks[1]).toBeCloseTo(0, 8);
    const mixed = probNormalMinAll([100, 100, 100], [0.01, 10, 10]);
    expect(mixed[0]).toBeCloseTo(0.25, 5);
    expect(mixed[1]).toBeCloseTo(0.375, 5);
  });
  it("is invariant under shifting/scaling and permutation", () => {
    const means = [90, 105, 110, 140], sigmas = [0.01, 14, 20, 30];
    const base = probNormalMinAll(means, sigmas);
    const transformed = probNormalMinAll(means.map(x => 5 * x + 200), sigmas.map(x => 5 * x));
    base.forEach((p, i) => expect(transformed[i]).toBeCloseTo(p, 7));
    const reversed = probNormalMinAll([...means].reverse(), [...sigmas].reverse()).reverse();
    base.forEach((p, i) => expect(reversed[i]).toBeCloseTo(p, 12));
  });
});

describe("ESPN mapping", () => {
  it("supports ESPN's native Knockout teams array and excludes teams eliminated in earlier periods", () => {
    const data = { ...league(), scoringPeriodId: 2, status: { currentMatchupPeriod: 2 }, schedule: [{
      matchupPeriodId: 2, teams: [
        { teamId: 1, totalPointsLive: 2.2, totalProjectedPointsLive: 76.95, eliminationMatchupPeriod: 0 },
        { teamId: 2, totalPointsLive: 0, totalProjectedPointsLive: 87.75, eliminationMatchupPeriod: 0 },
        { teamId: 3, totalPointsLive: 0, totalProjectedPointsLive: 50, eliminationMatchupPeriod: 1 },
      ],
    }] };
    const snapshot = parseScoreboard(data, 2026, 1000);
    expect(snapshot.knockout).toBe(true);
    expect(snapshot.matchups[0].map(team => team.id)).toEqual([1, 2]);
    expect(guillotine(snapshot).teams).toHaveLength(2);
    expect(headToHead(snapshot)).toEqual([]);
  });
  it("uses current matchup period, live team totals, valid zero scores, and byes", () => {
    const snapshot = parseScoreboard(league(), 2026, 1000);
    expect(snapshot.matchups).toHaveLength(2);
    expect(snapshot.matchups[1][0].score).toBe(0);
    expect(headToHead(snapshot)[0].probability).toBeCloseTo(0.680703961, 6);
    expect(headToHead(snapshot)[1].probability).toBeNull();
  });
  it("falls back to scoring period and does not invent missing projections", () => {
    const data: any = league();
    delete data.status;
    data.scoringPeriodId = 14;
    delete data.schedule[1].home.totalProjectedPointsLive;
    const snapshot = parseScoreboard(data, 2026, 1000);
    expect(headToHead(snapshot)[0].probability).toBeNull();
    expect(guillotine(snapshot).incomplete).toBe(true);
    expect(guillotine(snapshot).teams.every(team => team.probability === null)).toBe(true);
  });
  it("deduplicates teams and applies the original zero-projection/THUNDERDOME rules", () => {
    const data = league();
    data.schedule.push(data.schedule[1]);
    const result = guillotine(parseScoreboard(data, 2026, 1000));
    expect(result.teams).toHaveLength(3);
    expect(result.thunderdome).toBe(true);
    expect(result.teams.reduce((sum, t) => sum + t.probability!, 0)).toBeCloseTo(1, 8);
    data.schedule[2].home.totalProjectedPointsLive = 0;
    expect(guillotine(parseScoreboard(data, 2026, 1000)).teams).toHaveLength(2);
  });
});

describe("refresh lifecycle", () => {
  it("coalesces refreshes and starts only once under effect replay", async () => {
    let resolve!: (result: any) => void;
    const transport = vi.fn(() => new Promise(r => { resolve = r; }));
    const controller = createScoreboardController({}, transport);
    controller.start(); controller.start();
    const a = controller.refresh(), b = controller.refresh();
    expect(a).toBe(b);
    await Promise.resolve();
    expect(transport).toHaveBeenCalledTimes(1);
    resolve(response());
    expect(await a).toEqual({ ok: true, fetchCount: 1 });
    expect(controller.getSnapshot().loading).toBe(false);
  });
  it("counts failed requests, retains stale data, and clears data if extension disappears", async () => {
    const transport = vi.fn().mockResolvedValueOnce(response())
      .mockResolvedValueOnce({ error: "ESPN returned HTTP 503", fetched: 1 })
      .mockResolvedValueOnce({ error: "Open your ESPN league", fetched: 0 })
      .mockRejectedValueOnce("extension unavailable");
    const controller = createScoreboardController({}, transport);
    await controller.refresh();
    await controller.refresh();
    expect(controller.getSnapshot().snapshot).not.toBeNull();
    expect(controller.getSnapshot().fetchCount).toBe(2);
    await controller.refresh();
    expect(controller.getSnapshot().fetchCount).toBe(2);
    await controller.refresh();
    expect(controller.getSnapshot().snapshot).toBeNull();
    expect(controller.getSnapshot().extensionAvailable).toBe(false);
  });
  it("bounds requests to older extensions which never reply", async () => {
    vi.useFakeTimers();
    try {
      const controller = createScoreboardController({}, () => new Promise(() => {}));
      const request = controller.refresh();
      await vi.advanceTimersByTimeAsync(22_000);
      expect(await request).toEqual({ ok: false, fetchCount: 0 });
      expect(controller.getSnapshot().loading).toBe(false);
      expect(controller.getSnapshot().error).toMatch(/extension/);
    } finally { vi.useRealTimers(); }
  });
});
