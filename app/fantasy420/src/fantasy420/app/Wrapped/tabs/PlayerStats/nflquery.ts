import type { PlayerStatsRecord } from "./refreshSnapshot";

export const FIRST_YEAR = 2005;
const CACHE_NAME = "nflquery-player-scores-v1";
const scoring: Record<string, Record<string, number>> = {
  passing: { YDS: 0.04, TD: 4, INT: -2 },
  rushing: { YDS: 0.1, TD: 6 },
  receiving: { REC: 1, YDS: 0.1, TD: 6 },
  fumbles: { LOST: -2 },
};

export type NFLQuerySeason = {
  year: number;
  games: {
    week: number;
    teams: {
      boxScore: {
        category: string;
        labels: string[];
        players: { name: string; stats: string[] }[];
      }[];
    }[];
  }[];
};

export type PlayerSeason = { year: number; players: PlayerStatsRecord[] };
const round = (n: number) => Number(n.toFixed(2));

// NFLQuery's fantasy scoring: full PPR, 4-point passing TDs, -2 INT/lost fumble.
export function seasonToPlayers(data: NFLQuerySeason): PlayerSeason {
  const games = data.games.filter((game) => game.week > 0);
  const weeks = Math.max(0, ...games.map((game) => game.week));
  const players = new Map<string, {
    scores: (number | null)[];
    categories: Record<string, number>;
  }>();
  for (const game of games) {
    for (const team of game.teams) {
      for (const category of team.boxScore) {
        const rules = scoring[category.category];
        if (!rules) continue;
        for (const player of category.players) {
          let entry = players.get(player.name);
          if (!entry) {
            entry = { scores: Array(weeks).fill(null), categories: {} };
            players.set(player.name, entry);
          }
          entry.categories[category.category] = (entry.categories[category.category] ?? 0) + 1;
          const points = Object.entries(rules).reduce((sum, [label, multiplier]) => {
            const value = Number.parseFloat(player.stats[category.labels.indexOf(label)]);
            return sum + (Number.isFinite(value) ? value * multiplier : 0);
          }, 0);
          entry.scores[game.week - 1] = (entry.scores[game.week - 1] ?? 0) + points;
        }
      }
    }
  }
  return {
    year: data.year,
    players: Array.from(players, ([name, { scores, categories }]) => {
      const count = Object.values(categories).reduce((a, b) => a + b, 0);
      const position = [["passing", "QB"], ["rushing", "RB"], ["receiving", "WR"], ["fumbles", "FUMBLE"]]
        .find(([category]) => (categories[category] ?? 0) / count >= 0.3)?.[1] ?? "X";
      const rounded = scores.map((score) => score === null ? null : round(score));
      const total = round(rounded.reduce<number>((sum, score) => sum + (score ?? 0), 0));
      return { name, position, total, years: [{ year: data.year, total, scores: rounded }] };
    }),
  };
}

export function mergeSeasons(seasons: PlayerSeason[]): PlayerStatsRecord[] {
  const players = new Map<string, PlayerStatsRecord>();
  for (const season of [...seasons].sort((a, b) => a.year - b.year)) {
    for (const player of season.players) {
      const previous = players.get(player.name);
      const years = [...(previous?.years ?? []), ...player.years];
      players.set(player.name, {
        ...player, years,
        total: round(years.reduce((total, year) => total + year.total, 0)),
      });
    }
  }
  return [...players.values()].sort((a, b) => b.total - a.total);
}

const history = new Map<number, PlayerSeason>();
const pending = new Map<string, Promise<PlayerSeason>>();

export async function fetchPlayerSeason(year: number, currentYear: number): Promise<PlayerSeason> {
  if (year < currentYear && history.has(year)) return history.get(year)!;
  const key = `${year}:${currentYear}`;
  const existing = pending.get(key);
  if (existing) return existing;
  const request = fetchSeason(year, currentYear);
  pending.set(key, request);
  try {
    const data = await request;
    if (year < currentYear) history.set(year, data);
    return data;
  } finally {
    pending.delete(key);
  }
}

async function fetchSeason(year: number, currentYear: number): Promise<PlayerSeason> {
  const url = `https://dcep93.github.io/nflquery/data_v6/${year}.json`;
  let cache: Cache | undefined;
  // Storage restrictions/quota must not prevent loading scores from the network.
  if (year < currentYear) {
    try {
      cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(url);
      if (cached) {
        const data = await cached.json() as PlayerSeason;
        if (data.year === year && Array.isArray(data.players)) return data;
      }
    } catch { /* Fetch normally when browser caching is unavailable. */ }
  }
  const response = await fetch(url, { cache: "no-cache" });
  if (!response.ok) throw new Error(`${year}: HTTP ${response.status}`);
  const raw = await response.json() as NFLQuerySeason;
  if (raw.year !== year || !Array.isArray(raw.games)) throw new Error(`${year}: invalid NFLQuery season`);
  const data = seasonToPlayers(raw);
  if (cache) {
    try {
      await cache.put(url, new Response(JSON.stringify(data), {
        headers: { "Content-Type": "application/json" },
      }));
    } catch { /* Scores remain usable if the cache is full. */ }
  }
  return data;
}
