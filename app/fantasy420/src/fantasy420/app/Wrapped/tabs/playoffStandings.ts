/** Standings rules shared by PlayoffMachine and ProbabilityMachine. */
export function createRankingRules(names: string[], games: number[]) {
  const n = names.length;
  if (n > 16) throw new Error("Standings support at most 16 managers.");
  const useHeadToHead = new Uint8Array(1 << n);
  for (let mask = 1; mask < useHeadToHead.length; mask++) {
    let count = -1;
    let equal = true;
    for (let a = 0; a < n && equal; a++) {
      if (!(mask & (1 << a))) continue;
      for (let b = a + 1; b < n; b++) {
        if (!(mask & (1 << b))) continue;
        const played = games[a * n + b];
        if (count === -1) count = played;
        if (played !== count || played === 0) { equal = false; break; }
      }
    }
    useHeadToHead[mask] = Number(equal && count > 0);
  }
  const nameOrder = names.map((_, i) => i).sort((a, b) => names[a].localeCompare(names[b]));
  const nameRank = names.map((_, i) => nameOrder.indexOf(i));
  return { n, useHeadToHead, nameRank, tieWins: new Float64Array(n) };
}

/** Mutates only the scratch order/rules; no per-scenario allocations. */
export function rankPlayoffTeams(
  wins: ArrayLike<number>, headWins: ArrayLike<number>, points: ArrayLike<number>,
  rules: ReturnType<typeof createRankingRules>, order: number[]
) {
  const { n, useHeadToHead, nameRank, tieWins } = rules;
  for (let i = 0; i < n; i++) order[i] = i;
  order.sort((a, b) => wins[b] - wins[a]);
  for (let start = 0; start < n;) {
    let end = start + 1;
    let mask = 1 << order[start];
    while (end < n && wins[order[end]] === wins[order[start]]) {
      mask |= 1 << order[end++];
    }
    for (let seed = start; seed < end - 1; seed++) {
      const h2h = useHeadToHead[mask];
      for (let j = seed; j < end; j++) {
        const team = order[j];
        tieWins[team] = 0;
        if (h2h) {
          // Eligible remaining teams have equal H2H denominators.
          for (let k = seed; k < end; k++) tieWins[team] += headWins[team * n + order[k]];
        }
      }
      let best = seed;
      for (let j = seed + 1; j < end; j++) {
        const team = order[j], previous = order[best];
        const diff = (h2h ? tieWins[team] - tieWins[previous] : 0) ||
          points[team] - points[previous] || nameRank[previous] - nameRank[team];
        if (diff > 0) best = j;
      }
      // Remove only this winner, preserving the remaining teams' order.
      const winner = order[best];
      for (let j = best; j > seed; j--) order[j] = order[j - 1];
      order[seed] = winner;
      mask &= ~(1 << winner);
    }
    start = end;
  }
  return order;
}
