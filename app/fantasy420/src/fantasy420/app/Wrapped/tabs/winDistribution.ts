import type { ProbabilitySeason } from "./probabilityEngine";

/** Exact marginal win totals: coefficients of ∏ ((1-p) + p·x).
 * Teams' totals are correlated with each other, but each team's own remaining
 * games are independent under the matchup model. No season sampling is needed.
 */
export function getWinDistributions(season: ProbabilitySeason) {
  return season.teams.map((_, teamIndex) => {
    const mass = [1];
    for (const game of season.games) {
      if (game.a !== teamIndex && game.b !== teamIndex) continue;
      const p = game.a === teamIndex ? game.probability : 1 - game.probability;
      if (!Number.isFinite(p) || p < 0 || p > 1) throw new Error("Invalid win probability.");
      mass.push(0);
      for (let wins = mass.length - 1; wins >= 0; wins--) {
        mass[wins] = mass[wins] * (1 - p) + (wins > 0 ? mass[wins - 1] * p : 0);
      }
    }
    return mass.map((probability, additionalWins) => ({
      wins: season.wins[teamIndex] + additionalWins, probability,
    }));
  });
}
