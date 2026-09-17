import { useEffect, useMemo, useState } from "react";
import { currentYear } from "../..";
import allWrapped from "../../allWrapped";
import { fetchPlayerSeason, FIRST_YEAR, mergeSeasons, PlayerSeason, readCachedHistory } from "./nflquery";

export function usePlayerStats() {
  const year = Number(currentYear);
  const [seasons, setSeasons] = useState<PlayerSeason[]>([]);
  const [failedYears, setFailedYears] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setFailedYears([]);
    const loaded: PlayerSeason[] = [];
    const failed: number[] = [];
    const load = async (seasonYear: number) => {
      try {
        const data = await fetchPlayerSeason(seasonYear, year);
        loaded.push(data);
      } catch {
        failed.push(seasonYear);
      }
    };
    void (async () => {
      // Read all cached history while the current season refreshes.
      const current = load(year);
      const cached = await readCachedHistory(year);
      if (!active) return;
      loaded.push(...cached);
      // Show the complete cached set once, never one render per cached year.
      if (cached.length) setSeasons(cached);
      const cachedSet = new Set(cached.map((season) => season.year));
      const years = Array.from({ length: year - FIRST_YEAR }, (_, i) => year - i - 1)
        .filter((seasonYear) => !cachedSet.has(seasonYear));
      // Only missing seasons enter the network queue.
      await Promise.all([current, ...Array.from({ length: 3 }, async () => {
        while (active && years.length) await load(years.shift()!);
      })]);
      if (active) {
        // Publish all remote results together. Extension ownership updates do
        // not restart this effect or fetch NFL stats again.
        setSeasons(loaded);
        setFailedYears(failed);
        setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [year, attempt]);

  const currentWrapped = allWrapped[currentYear];
  const data = useMemo(() => {
    const positions = new Map<string, string>();
    Object.entries(allWrapped).sort(([a], [b]) => Number(a) - Number(b))
      .forEach(([, wrapped]) => Object.values(wrapped.nflPlayers)
        .forEach((player) => positions.set(player.name, player.position)));
    return mergeSeasons(seasons).map((player) => ({
      ...player, position: positions.get(player.name) ?? player.position,
    }));
  }, [seasons, currentWrapped]);
  return {
    data, loading, failedYears,
    retry: () => setAttempt((value) => value + 1),
  };
}
