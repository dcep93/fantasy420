export type DraftPosition = "QB" | "RB" | "WR" | "TE" | "DST" | "K";
export type RosterSlot =
  | DraftPosition
  | "FLEX"
  | "SUPERFLEX"
  | "BENCH";

export type RosterSettings = Record<RosterSlot, number>;

export type MockDraftSettings = {
  draftPosition: number;
  teamCount: number;
  positionRisk: number;
  byeRisk: number;
  craziness: number;
  seed: string;
  roster: RosterSettings;
};

export type MockDraftPlayer = {
  id: string;
  position: string;
  byeWeek: number;
};

export type MockDraftState = {
  settings: MockDraftSettings;
  picks: string[];
};

export type MockDraftPick = {
  playerId: string;
  pickIndex: number;
  round: number;
  draftPosition: number;
  roundIndex: number;
  label: string;
  rank: number;
  isUser: boolean;
};

export type MockDraftView = {
  picks: MockDraftPick[];
  currentOwner: ReturnType<typeof getPickOwner> | null;
  complete: boolean;
};

export const MOCK_DRAFT_POSITION_PENALTY = 28.421761;
export const MOCK_DRAFT_BYE_PENALTY = 0;
export const MOCK_DRAFT_BASE_TEMPERATURE = 2.254317;
export const MOCK_DRAFT_ROUND_GROWTH = 0.920315;

export const DEFAULT_MOCK_DRAFT_SETTINGS: MockDraftSettings = {
  draftPosition: 8,
  teamCount: 10,
  positionRisk: 1,
  byeRisk: 1,
  craziness: 1,
  seed: "",
  roster: {
    QB: 1,
    RB: 2,
    WR: 2,
    TE: 1,
    FLEX: 2,
    SUPERFLEX: 1,
    DST: 0,
    K: 0,
    BENCH: 5,
  },
};

export function createSeed(): string {
  if (globalThis.crypto?.getRandomValues) {
    const values = new Uint32Array(2);
    globalThis.crypto.getRandomValues(values);
    return Array.from(values, (value) => value.toString(36)).join("");
  }
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

export function validateMockDraftSettings(settings: MockDraftSettings): void {
  if (!Number.isInteger(settings.teamCount) || settings.teamCount < 2) {
    throw new Error("Team count must be an integer of at least 2");
  }
  if (
    !Number.isInteger(settings.draftPosition) ||
    settings.draftPosition < 1 ||
    settings.draftPosition > settings.teamCount
  ) {
    throw new Error("Draft position must be within the team count");
  }
  (["positionRisk", "byeRisk", "craziness"] as const).forEach((key) => {
    if (!Number.isFinite(settings[key]) || settings[key] <= 0) {
      throw new Error(`${key} must be a positive finite number`);
    }
  });
  if (typeof settings.seed !== "string" || settings.seed.length === 0) {
    throw new Error("Seed must not be empty");
  }
  (Object.keys(DEFAULT_MOCK_DRAFT_SETTINGS.roster) as RosterSlot[]).forEach(
    (slot) => {
      const value = settings.roster[slot];
      if (!Number.isInteger(value) || value < 0) {
        throw new Error(`${slot} roster count must be a nonnegative integer`);
      }
    }
  );
  if (settings.roster.K !== 0) {
    throw new Error("K roster count must be zero");
  }
  if (getRoundCount(settings) === 0) {
    throw new Error("Roster must contain at least one slot");
  }
}

export function getRoundCount(settings: MockDraftSettings): number {
  return Object.values(settings.roster).reduce((sum, value) => sum + value, 0);
}

export function getDraftLength(settings: MockDraftSettings): number {
  return settings.teamCount * getRoundCount(settings);
}

export function getMockDraftTemperature(
  round: number,
  craziness: number
): number {
  return (
    MOCK_DRAFT_BASE_TEMPERATURE *
    Math.pow(round, MOCK_DRAFT_ROUND_GROWTH) *
    Math.sqrt(craziness)
  );
}

export function getPickOwner(
  pickIndex: number,
  teamCount: number
): { round: number; draftPosition: number } {
  const round = Math.floor(pickIndex / teamCount) + 1;
  const roundIndex = pickIndex % teamCount;
  return {
    round,
    draftPosition:
      round % 2 === 1 ? roundIndex + 1 : teamCount - roundIndex,
  };
}

export function getPickLabel(pickIndex: number, teamCount: number): string {
  const round = Math.floor(pickIndex / teamCount) + 1;
  const roundIndex = (pickIndex % teamCount) + 1;
  return `${round}.${String(roundIndex).padStart(2, "0")}`;
}

export function getDraftView(
  state: MockDraftState,
  playersById: Record<string, MockDraftPlayer>,
  orderedRanking: string[]
): MockDraftView {
  const available = uniqueRankedPlayers(orderedRanking, playersById);
  const picks = state.picks.map((playerId, pickIndex) => {
    const rankIndex = available.indexOf(playerId);
    const rank = rankIndex === -1 ? available.length + 1 : rankIndex + 1;
    if (rankIndex !== -1) available.splice(rankIndex, 1);
    const owner = getPickOwner(pickIndex, state.settings.teamCount);
    return {
      playerId,
      pickIndex,
      ...owner,
      roundIndex: (pickIndex % state.settings.teamCount) + 1,
      label: getPickLabel(pickIndex, state.settings.teamCount),
      rank,
      isUser: owner.draftPosition === state.settings.draftPosition,
    };
  });
  const complete = state.picks.length >= getDraftLength(state.settings);
  return {
    picks,
    currentOwner: complete
      ? null
      : getPickOwner(state.picks.length, state.settings.teamCount),
    complete,
  };
}

export function advanceToUserTurn(
  state: MockDraftState,
  playersById: Record<string, MockDraftPlayer>,
  orderedRanking: string[]
): MockDraftState {
  let picks = state.picks.slice();
  const draftLength = getDraftLength(state.settings);
  while (picks.length < draftLength) {
    const owner = getPickOwner(picks.length, state.settings.teamCount);
    if (owner.draftPosition === state.settings.draftPosition) break;
    const opponentPick = chooseOpponentPlayer(
      { ...state, picks },
      owner.draftPosition,
      playersById,
      orderedRanking
    );
    if (!opponentPick) break;
    picks.push(opponentPick);
  }
  return { ...state, picks };
}

export function makeUserPick(
  state: MockDraftState,
  playerId: string,
  playersById: Record<string, MockDraftPlayer>,
  orderedRanking: string[]
): MockDraftState {
  const owner = getPickOwner(state.picks.length, state.settings.teamCount);
  if (owner.draftPosition !== state.settings.draftPosition) return state;
  if (
    !playersById[playerId] ||
    !isMockDraftPlayerEligible(playersById[playerId]) ||
    state.picks.includes(playerId) ||
    !orderedRanking.includes(playerId) ||
    state.picks.length >= getDraftLength(state.settings)
  ) {
    return state;
  }
  return advanceToUserTurn(
    { ...state, picks: state.picks.concat(playerId) },
    playersById,
    orderedRanking
  );
}

export function nudgeHistoricalPick(
  state: MockDraftState,
  pickIndex: number,
  direction: "better" | "worse",
  playersById: Record<string, MockDraftPlayer>,
  orderedRanking: string[]
): MockDraftState {
  if (pickIndex < 0 || pickIndex >= state.picks.length) return state;
  const prefix = state.picks.slice(0, pickIndex);
  const available = getAvailableBeforePick(
    state,
    pickIndex,
    playersById,
    orderedRanking
  );
  const currentIndex = available.indexOf(state.picks[pickIndex]);
  const targetIndex = currentIndex + (direction === "better" ? -1 : 1);
  if (
    currentIndex === -1 ||
    targetIndex < 0 ||
    targetIndex >= available.length
  ) {
    return state;
  }

  const originalPicks = state.picks;
  let picks = prefix.concat(available[targetIndex]);
  for (let index = pickIndex + 1; index < originalPicks.length; index += 1) {
    const owner = getPickOwner(index, state.settings.teamCount);
    if (owner.draftPosition === state.settings.draftPosition) {
      const savedUserPick = originalPicks[index];
      if (
        picks.includes(savedUserPick) ||
        !playersById[savedUserPick] ||
        !orderedRanking.includes(savedUserPick)
      ) {
        break;
      }
      picks.push(savedUserPick);
      continue;
    }
    const opponentPick = chooseOpponentPlayer(
      { ...state, picks },
      owner.draftPosition,
      playersById,
      orderedRanking
    );
    if (!opponentPick) break;
    picks.push(opponentPick);
  }
  return { ...state, picks };
}

export function getHistoricalNudgeAvailability(
  state: MockDraftState,
  pickIndex: number,
  playersById: Record<string, MockDraftPlayer>,
  orderedRanking: string[]
): { better: boolean; worse: boolean } {
  if (pickIndex < 0 || pickIndex >= state.picks.length) {
    return { better: false, worse: false };
  }
  const available = getAvailableBeforePick(
    state,
    pickIndex,
    playersById,
    orderedRanking
  );
  const currentIndex = available.indexOf(state.picks[pickIndex]);
  return {
    better: currentIndex > 0,
    worse: currentIndex >= 0 && currentIndex < available.length - 1,
  };
}

function getAvailableBeforePick(
  state: MockDraftState,
  pickIndex: number,
  playersById: Record<string, MockDraftPlayer>,
  orderedRanking: string[]
): string[] {
  const prefix = state.picks.slice(0, pickIndex);
  return uniqueRankedPlayers(orderedRanking, playersById).filter(
    (playerId) => !prefix.includes(playerId)
  );
}

function chooseOpponentPlayer(
  state: MockDraftState,
  draftPosition: number,
  playersById: Record<string, MockDraftPlayer>,
  orderedRanking: string[]
): string | undefined {
  const overallRanking = uniqueRankedPlayers(orderedRanking, playersById);
  const overallRankByPlayerId = Object.fromEntries(
    overallRanking.map((playerId, overallRankIndex) => [
      playerId,
      overallRankIndex,
    ])
  );
  const available = overallRanking.filter(
    (playerId) => !state.picks.includes(playerId)
  );
  if (available.length === 0) return undefined;
  const teamPlayerIds = state.picks.filter(
    (_, index) =>
      getPickOwner(index, state.settings.teamCount).draftPosition ===
      draftPosition
  );
  const candidatePool = getMockDraftOpponentCandidatePool(
    teamPlayerIds,
    available,
    playersById,
    state.settings.roster
  );
  if (candidatePool.length === 0) return undefined;
  const historyKey = state.picks.join(",");
  const round = getPickOwner(
    state.picks.length,
    state.settings.teamCount
  ).round;
  const temperature = getMockDraftTemperature(
    round,
    state.settings.craziness
  );

  return candidatePool
    .map((playerId) => {
      const { saturation, byeMatches } = getMockDraftChoiceFeatures(
        teamPlayerIds,
        playerId,
        playersById,
        state.settings.roster
      );
      const positionPenalty =
        state.settings.positionRisk * saturation * MOCK_DRAFT_POSITION_PENALTY;
      const byePenalty =
        state.settings.byeRisk * byeMatches * MOCK_DRAFT_BYE_PENALTY;
      const random = seededRandom(
        `${state.settings.seed}|${historyKey}|${draftPosition}|${playerId}`
      );
      const boundedRandom = Math.min(
        1 - Number.EPSILON,
        Math.max(Number.EPSILON, random)
      );
      const gumbel = -Math.log(-Math.log(boundedRandom));
      return {
        playerId,
        score:
          overallRankByPlayerId[playerId] +
          positionPenalty +
          byePenalty -
          temperature * gumbel,
      };
    })
    .sort((a, b) => a.score - b.score || a.playerId.localeCompare(b.playerId))[0]
    ?.playerId;
}

export function getMockDraftOpponentCandidatePool(
  teamPlayerIds: string[],
  availablePlayerIds: string[],
  playersById: Record<string, MockDraftPlayer>,
  roster: RosterSettings
): string[] {
  const nonTeStarterCount =
    roster.QB +
    roster.RB +
    roster.WR +
    roster.FLEX +
    roster.SUPERFLEX +
    roster.DST;
  const filledNonTeStarters = getMaximumFilledStarterSlots(
    teamPlayerIds,
    playersById,
    roster,
    false
  );
  if (filledNonTeStarters >= nonTeStarterCount) {
    return availablePlayerIds;
  }

  const filledStarters = getMaximumFilledStarterSlots(
    teamPlayerIds,
    playersById,
    roster
  );
  return availablePlayerIds.filter(
    (candidatePlayerId) =>
      getMaximumFilledStarterSlots(
        teamPlayerIds.concat(candidatePlayerId),
        playersById,
        roster
      ) > filledStarters
  );
}

export function getMaximumFilledStarterSlots(
  teamPlayerIds: string[],
  playersById: Record<string, MockDraftPlayer>,
  roster: RosterSettings,
  includeDedicatedTe = true
): number {
  const playerCounts: Record<DraftPosition, number> = {
    QB: 0,
    RB: 0,
    WR: 0,
    TE: 0,
    DST: 0,
    K: 0,
  };
  teamPlayerIds.forEach((playerId) => {
    const player = playersById[playerId];
    if (!isMockDraftPlayerEligible(player)) return;
    playerCounts[normalizePosition(player.position)] += 1;
  });

  const dedicatedSlots: Record<DraftPosition, number> = {
    QB: roster.QB,
    RB: roster.RB,
    WR: roster.WR,
    TE: includeDedicatedTe ? roster.TE : 0,
    DST: roster.DST,
    K: 0,
  };
  let filled = 0;
  (["QB", "RB", "WR", "TE", "DST"] as DraftPosition[]).forEach(
    (position) => {
      const dedicatedFilled = Math.min(
        playerCounts[position],
        dedicatedSlots[position]
      );
      playerCounts[position] -= dedicatedFilled;
      filled += dedicatedFilled;
    }
  );

  const superflexQbs = Math.min(playerCounts.QB, roster.SUPERFLEX);
  filled += superflexQbs;
  const openSuperflex = roster.SUPERFLEX - superflexQbs;
  const remainingFlexPlayers = playerCounts.RB + playerCounts.WR + playerCounts.TE;
  const flexFilled = Math.min(remainingFlexPlayers, roster.FLEX);
  filled += flexFilled;
  const remainingAfterFlex = remainingFlexPlayers - flexFilled;
  const superflexSkillPlayers = Math.min(remainingAfterFlex, openSuperflex);
  filled += superflexSkillPlayers;

  return filled;
}

export function getMockDraftChoiceFeatures(
  teamPlayerIds: string[],
  candidatePlayerId: string,
  playersById: Record<string, MockDraftPlayer>,
  roster: RosterSettings
): { saturation: number; byeMatches: number } {
  const player = playersById[candidatePlayerId];
  const position = normalizePosition(player.position);
  const samePositionPlayers = teamPlayerIds
    .map((id) => playersById[id])
    .filter(
      (teammate): teammate is MockDraftPlayer =>
        teammate !== undefined &&
        normalizePosition(teammate.position) === position
    );
  const capacity = getPositionCapacities(roster)[position] || 0;
  return {
    saturation:
      capacity === 0
        ? (samePositionPlayers.length + 1) *
          (100 / MOCK_DRAFT_POSITION_PENALTY)
        : samePositionPlayers.length / capacity,
    byeMatches: samePositionPlayers.filter(
      (teammate) => teammate.byeWeek === player.byeWeek
    ).length,
  };
}

function getPositionCapacities(
  roster: RosterSettings
): Record<DraftPosition, number> {
  return {
    QB: roster.QB + roster.SUPERFLEX,
    RB: roster.RB + roster.FLEX + roster.SUPERFLEX,
    WR: roster.WR + roster.FLEX + roster.SUPERFLEX,
    TE: roster.TE + roster.FLEX + roster.SUPERFLEX,
    DST: roster.DST,
    K: roster.K,
  };
}

export function normalizePosition(position: string): DraftPosition {
  return position === "D/ST" ? "DST" : (position as DraftPosition);
}

export function isMockDraftPlayerEligible(
  player: Pick<MockDraftPlayer, "position"> | undefined
): boolean {
  return player !== undefined && normalizePosition(player.position) !== "K";
}

function uniqueRankedPlayers(
  orderedRanking: string[],
  playersById: Record<string, MockDraftPlayer>
): string[] {
  return Array.from(
    new Set(
      orderedRanking.filter((playerId) =>
        isMockDraftPlayerEligible(playersById[playerId])
      )
    )
  );
}

function seededRandom(input: string): number {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  hash += 0x6d2b79f5;
  let value = hash;
  value = Math.imul(value ^ (value >>> 15), value | 1);
  value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
  return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
}
