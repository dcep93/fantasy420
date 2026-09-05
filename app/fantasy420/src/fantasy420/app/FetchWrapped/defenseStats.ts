export type DefenseStats = {
  yardsAllowed: number;
  pointsAllowed: number;
};

export function defenseStatsForGame(
  statsOfficial: boolean,
  defense?: DefenseStats
): DefenseStats {
  if (!statsOfficial) {
    return { yardsAllowed: 0, pointsAllowed: 0 };
  }

  return {
    yardsAllowed: defense?.yardsAllowed ?? 0,
    pointsAllowed: defense?.pointsAllowed ?? 0,
  };
}
