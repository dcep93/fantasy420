type ProjectionEntry = {
  playerId: number;
  playerPoolEntry?: { player?: { stats?: {
    seasonId: number;
    scoringPeriodId: number;
    statSourceId: number;
    appliedTotal?: number | null;
  }[] } };
};

/** Later entries (archived lineups) override fallback team-roster records. */
export function readWeeklyProjections(entries: ProjectionEntry[], season: number, week: number): Record<string, number> {
  const projections: Record<string, number> = {};
  for (const entry of entries) {
    const value = entry.playerPoolEntry?.player?.stats?.find(stat =>
      stat.seasonId === season && stat.scoringPeriodId === week && stat.statSourceId === 1)?.appliedTotal;
    if (typeof value === "number" && Number.isFinite(value)) {
      projections[String(entry.playerId)] = Number(value.toFixed(2));
    }
  }
  return projections;
}

export function isReliableWeeklyProjection(value: unknown, dataVersion?: number): value is number {
  // Legacy snapshots encoded missing records as zero, losing their provenance.
  return typeof value === "number" && Number.isFinite(value) && (value !== 0 || dataVersion === 1);
}
