import getMidranks from "./midrank";

export type RankMap = Record<string, number>;
export type RankingSources = Record<string, RankMap>;

export type FormatAwareRankings = {
  composite: RankMap;
  sources: RankingSources;
  adjustedSources: Set<string>;
};

export function isSeparatorSource(sourceName: string): boolean {
  return sourceName.replaceAll("_", "").length === 0;
}

export function isSuperflexSource(sourceName: string): boolean {
  return !isSeparatorSource(sourceName) && /super/i.test(sourceName);
}

export function getSourceLabel(sourceName: string): string {
  if (isSeparatorSource(sourceName)) return "";
  return sourceName;
}

function filterRankMap(
  values: RankMap,
  predicate: (playerId: string) => boolean
): RankMap {
  return Object.fromEntries(
    Object.entries(values).filter(([playerId]) => predicate(playerId))
  );
}

function averageRanks(playerIds: string[], rankMaps: RankMap[]): RankMap {
  return Object.fromEntries(
    playerIds.flatMap((playerId) => {
      const ranks = rankMaps
        .map((rankMap) => rankMap[playerId])
        .filter((rank) => rank !== undefined);
      return ranks.length === 0
        ? []
        : [[playerId, ranks.reduce((sum, rank) => sum + rank, 0) / ranks.length]];
    })
  );
}

function orderByRank(playerIds: string[], ranks: RankMap): string[] {
  const stableIndex = Object.fromEntries(
    playerIds.map((playerId, index) => [playerId, index])
  );
  return playerIds
    .filter((playerId) => ranks[playerId] !== undefined)
    .sort((left, right) => {
      const rankDifference = ranks[left] - ranks[right];
      return rankDifference || stableIndex[left] - stableIndex[right];
    });
}

function getCompositeOrder(
  playerIds: string[],
  rawRankMaps: RankMap[]
): string[] {
  return orderByRank(
    playerIds,
    averageRanks(playerIds, rawRankMaps.map(getMidranks))
  );
}

function getQbScaffold(
  superflexOrder: string[],
  positionByPlayerId: Record<string, string>
): Map<number, string> {
  return new Map(
    superflexOrder.flatMap((playerId, slot) =>
      positionByPlayerId[playerId] === "QB" ? [[slot, playerId]] : []
    )
  );
}

function mergeWithQbScaffold(
  nonQbOrder: string[],
  qbBySlot: Map<number, string>
): { order: string[]; rankByPlayerId: RankMap } {
  const order: string[] = [];
  const rankByPlayerId: RankMap = {};
  const finalQbSlot = Math.max(-1, ...qbBySlot.keys());
  let nonQbIndex = 0;

  for (
    let slot = 0;
    nonQbIndex < nonQbOrder.length || slot <= finalQbSlot;
    slot += 1
  ) {
    const qb = qbBySlot.get(slot);
    if (qb !== undefined) {
      order.push(qb);
      rankByPlayerId[qb] = slot + 1;
    } else if (nonQbIndex < nonQbOrder.length) {
      const nonQb = nonQbOrder[nonQbIndex];
      order.push(nonQb);
      rankByPlayerId[nonQb] = slot + 1;
      nonQbIndex += 1;
    }
  }

  return { order, rankByPlayerId };
}

function getRawFallback(
  sources: RankingSources,
  playerIds: string[]
): FormatAwareRankings {
  const order = getCompositeOrder(playerIds, Object.values(sources));
  return {
    composite: Object.fromEntries(
      order.map((playerId, index) => [playerId, index + 1])
    ),
    sources,
    adjustedSources: new Set(),
  };
}

export default function getFormatAwareRankings(
  sources: RankingSources,
  playerIds: string[],
  positionByPlayerId: Record<string, string>
): FormatAwareRankings {
  const sourceEntries = Object.entries(sources).filter(
    ([sourceName, values]) =>
      !isSeparatorSource(sourceName) && Object.keys(values).length > 0
  );
  const superflexSources = sourceEntries.filter(([sourceName]) =>
    isSuperflexSource(sourceName)
  );

  if (superflexSources.length === 0) {
    return getRawFallback(sources, playerIds);
  }

  const superflexOrder = getCompositeOrder(
    playerIds,
    superflexSources.map(([, values]) => values)
  );
  const qbBySlot = getQbScaffold(superflexOrder, positionByPlayerId);
  const nonQbPlayerIds = playerIds.filter(
    (playerId) => positionByPlayerId[playerId] !== "QB"
  );
  const nonQbOrder = getCompositeOrder(
    nonQbPlayerIds,
    sourceEntries.map(([, values]) =>
      filterRankMap(
        values,
        (playerId) => positionByPlayerId[playerId] !== "QB"
      )
    )
  );
  const finalOrder = mergeWithQbScaffold(nonQbOrder, qbBySlot).order;
  const adjustedSources = new Set(
    sourceEntries
      .filter(([sourceName]) => !isSuperflexSource(sourceName))
      .map(([sourceName]) => sourceName)
  );
  const adjustedRankingSources = Object.fromEntries(
    Object.entries(sources).map(([sourceName, values]) => {
      if (!adjustedSources.has(sourceName)) {
        return [sourceName, values];
      }
      const sourceNonQbOrder = Object.keys(
        filterRankMap(
          values,
          (playerId) => positionByPlayerId[playerId] !== "QB"
        )
      ).sort((left, right) => values[left] - values[right]);
      return [
        sourceName,
        mergeWithQbScaffold(sourceNonQbOrder, qbBySlot).rankByPlayerId,
      ];
    })
  );

  return {
    composite: Object.fromEntries(
      finalOrder.map((playerId, index) => [playerId, index + 1])
    ),
    sources: adjustedRankingSources,
    adjustedSources,
  };
}
