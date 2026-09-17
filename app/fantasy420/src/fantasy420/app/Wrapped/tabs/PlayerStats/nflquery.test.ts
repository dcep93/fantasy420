import { afterEach, expect, test, vi } from "vitest";
import { mergeSeasons, NFLQuerySeason, seasonToPlayers } from "./nflquery";

afterEach(() => { vi.unstubAllGlobals(); });

const fixture: NFLQuerySeason = {
  year: 2026,
  games: [
    { week: 1, teams: [{ boxScore: [
      { category: "receiving", labels: ["REC", "YDS", "TD"], players: [{ name: "Tyler Warren", stats: ["5", "53", "0"] }] },
      { category: "fumbles", labels: ["LOST"], players: [{ name: "Tyler Warren", stats: ["1"] }] },
      { category: "passing", labels: ["YDS", "TD", "INT"], players: [{ name: "Quarterback", stats: ["250", "2", "1"] }] },
    ] }] },
    { week: 3, teams: [{ boxScore: [
      { category: "receiving", labels: ["REC", "YDS", "TD"], players: [{ name: "Tyler Warren", stats: ["0", "0", "0"] }] },
      { category: "rushing", labels: ["YDS", "TD"], players: [{ name: "Runner", stats: ["-10", "0"] }] },
    ] }] },
    { week: -1, teams: [{ boxScore: [
      { category: "receiving", labels: ["REC", "YDS", "TD"], players: [{ name: "Tyler Warren", stats: ["10", "200", "3"] }] },
    ] }] },
  ],
};

test("scores NFLQuery box scores with PPR, missing weeks, zeroes, negatives, and no playoffs", () => {
  const players = seasonToPlayers(fixture).players;
  expect(players.find((p) => p.name === "Tyler Warren")?.years[0]).toEqual({ year: 2026, scores: [8.3, null, 0], total: 8.3 });
  expect(players.find((p) => p.name === "Quarterback")?.total).toBe(16);
  expect(players.find((p) => p.name === "Runner")?.years[0].scores).toEqual([null, null, -1]);
  const merged = mergeSeasons([seasonToPlayers(fixture), seasonToPlayers({ ...fixture, year: 2025 })]);
  expect(merged.find((p) => p.name === "Tyler Warren")).toMatchObject({ total: 16.6, years: [{ year: 2025 }, { year: 2026 }] });
  expect(seasonToPlayers({ year: 2026, games: [] }).players).toEqual([]);
});

test("persists compact past seasons, bypasses current-year cache, and revalidates on every new load", async () => {
  vi.resetModules();
  const stored = new Map<string, Response>();
  const cache = {
    match: vi.fn(async (key: string) => stored.get(key)?.clone()),
    put: vi.fn(async (key: string, response: Response) => { stored.set(key, response); }),
  };
  vi.stubGlobal("caches", { open: vi.fn(async () => cache) });
  const fetchMock = vi.fn(async (url: string) => new Response(JSON.stringify({ ...fixture, year: Number(url.match(/(\d+)\.json$/)![1]) })));
  vi.stubGlobal("fetch", fetchMock);
  let api = await import("./nflquery");
  await api.fetchPlayerSeason(2025, 2026);
  expect(cache.put).toHaveBeenCalledTimes(1);
  expect(await stored.values().next().value!.clone().json()).not.toHaveProperty("games");
  vi.resetModules(); // Simulate a new page visit, retaining browser storage.
  api = await import("./nflquery");
  await api.fetchPlayerSeason(2025, 2026);
  expect(fetchMock).toHaveBeenCalledTimes(1);
  await api.fetchPlayerSeason(2026, 2026);
  await api.fetchPlayerSeason(2026, 2026);
  expect(fetchMock).toHaveBeenCalledTimes(3);
  expect(cache.put).toHaveBeenCalledTimes(1);
  expect(fetchMock).toHaveBeenLastCalledWith(expect.stringContaining("2026.json"), { cache: "no-cache" });
});

test("works without cache access and retries failed network requests", async () => {
  vi.resetModules();
  vi.stubGlobal("caches", { open: vi.fn().mockRejectedValue(new Error("Storage denied")) });
  const fetchMock = vi.fn().mockResolvedValueOnce(new Response("Unavailable", { status: 503 }))
    .mockResolvedValueOnce(new Response(JSON.stringify({ ...fixture, year: 2025 })));
  vi.stubGlobal("fetch", fetchMock);
  const { fetchPlayerSeason } = await import("./nflquery");
  await expect(fetchPlayerSeason(2025, 2026)).rejects.toThrow("2025: HTTP 503");
  expect((await fetchPlayerSeason(2025, 2026)).year).toBe(2025);
});
