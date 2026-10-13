type ProjectionEntry = {
  playerId: number;
  playerPoolEntry?: { player?: { stats?: {
    seasonId: number;
    scoringPeriodId: number;
    statSourceId: number;
    appliedTotal?: number | null;
    appliedStats?: Record<string, number>;
  }[] } };
};

/** Later entries (archived lineups) override fallback team-roster records. */
export function readWeeklyProjections(entries: ProjectionEntry[], season: number, week: number): Record<string, number> {
  const projections: Record<string, number> = {};
  for (const entry of entries) {
    const stat = entry.playerPoolEntry?.player?.stats?.find(stat =>
      stat.seasonId === season && stat.scoringPeriodId === week && stat.statSourceId === 1);
    const value = stat?.appliedTotal;
    // ESPN also returns explicit zeros with empty scoring inputs for incomplete
    // historical records. A numeric zero alone is not evidence of a projection.
    const contributions = Object.values(stat?.appliedStats ?? {});
    if (value === 0 && !(contributions.every(Number.isFinite) && contributions.some(value => value !== 0))) continue;
    if (typeof value === "number" && Number.isFinite(value)) {
      projections[String(entry.playerId)] = Number(value.toFixed(2));
    }
  }
  return projections;
}

export function isReliableWeeklyProjection(value: unknown, dataVersion?: number): value is number {
  // Legacy snapshots defaulted missing records to zero; version 1 also accepted
  // ESPN's empty zero records. Only version 2 validates their scoring inputs.
  return typeof value === "number" && Number.isFinite(value) && (value !== 0 || dataVersion === 2);
}
