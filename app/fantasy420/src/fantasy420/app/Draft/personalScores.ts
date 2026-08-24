export type PersonalScores = Record<string, number>;

export const PERSONAL_SCORES_STORAGE_PREFIX =
  "fantasy420:draft:personal-scores:";

export function getPersonalScoresStorageKey(year: string): string {
  return `${PERSONAL_SCORES_STORAGE_PREFIX}${year}`;
}

function sanitizePersonalScores(value: unknown): PersonalScores {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value).filter(
      ([, score]) => Number.isFinite(score) && Number.isInteger(score)
    )
  ) as PersonalScores;
}

export function readPersonalScores(
  year: string,
  storage?: Storage
): PersonalScores {
  try {
    const saved = (storage ?? window.localStorage).getItem(
      getPersonalScoresStorageKey(year)
    );
    return saved === null ? {} : sanitizePersonalScores(JSON.parse(saved));
  } catch {
    return {};
  }
}

export function savePersonalScores(
  year: string,
  scores: PersonalScores,
  storage?: Storage
): void {
  try {
    const target = storage ?? window.localStorage;
    const clean = sanitizePersonalScores(scores);
    if (Object.keys(clean).length === 0) {
      target.removeItem(getPersonalScoresStorageKey(year));
    } else {
      target.setItem(
        getPersonalScoresStorageKey(year),
        JSON.stringify(clean)
      );
    }
  } catch {
    // The in-memory UI remains usable when browser storage is unavailable.
  }
}

export function applyPersonalScores(
  composite: Record<string, number>,
  scores: PersonalScores
): Record<string, number> {
  return Object.fromEntries(
    Object.entries(composite)
      .sort(
        ([leftId, leftRank], [rightId, rightRank]) =>
          leftRank -
            (scores[leftId] ?? 0) -
            (rightRank - (scores[rightId] ?? 0)) ||
          leftRank - rightRank ||
          leftId.localeCompare(rightId)
      )
      .map(([playerId], index) => [playerId, index + 1])
  );
}

export function sortByPersonalScoreMagnitude(
  playerIds: string[],
  scores: PersonalScores,
  composite: Record<string, number>
): string[] {
  return [...playerIds].sort((left, right) => {
    const leftScored = scores[left] !== undefined;
    const rightScored = scores[right] !== undefined;
    if (leftScored !== rightScored) return leftScored ? -1 : 1;
    if (leftScored && rightScored) {
      const magnitude = Math.abs(scores[right]) - Math.abs(scores[left]);
      if (magnitude) return magnitude;
    }
    return composite[left] - composite[right] || left.localeCompare(right);
  });
}
