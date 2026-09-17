import { useEffect, useMemo, useState } from "react";
import { currentYear } from "../..";
import allWrapped from "../../allWrapped";
import { fetchPlayerSeason, FIRST_YEAR, mergeSeasons, PlayerSeason } from "./nflquery";

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
    // Keep successfully fetched history on retries; refresh the current year.
    setSeasons((previous) => previous.filter((season) => season.year !== year));
    const load = async (seasonYear: number) => {
      try {
        const data = await fetchPlayerSeason(seasonYear, year);
        if (active) setSeasons((previous) => [
          ...previous.filter((season) => season.year !== seasonYear), data,
        ]);
      } catch {
        if (active) setFailedYears((previous) => [...previous, seasonYear]);
      }
    };
    void (async () => {
      await load(year);
      const years = Array.from({ length: year - FIRST_YEAR }, (_, i) => year - i - 1);
      // Bound downloads of the large play-by-play files on the first visit.
      await Promise.all(Array.from({ length: 3 }, async () => {
        while (active && years.length) await load(years.shift()!);
      }));
      if (active) setLoading(false);
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
    data, loading, failedYears, loadedYears: seasons.length,
    totalYears: year - FIRST_YEAR + 1,
    retry: () => setAttempt((value) => value + 1),
  };
}
