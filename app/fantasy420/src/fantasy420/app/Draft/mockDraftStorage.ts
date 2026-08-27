import {
  MockDraftState,
  validateMockDraftSettings,
} from "./mockDraft";

export const ACTIVE_MOCK_DRAFT_STORAGE_KEY =
  "fantasy420:draft:active-mock-draft";

const ACTIVE_MOCK_DRAFT_STORAGE_VERSION = 1;

type StoredMockDraft = {
  version: typeof ACTIVE_MOCK_DRAFT_STORAGE_VERSION;
  settings: MockDraftState["settings"];
  picks: string[];
};

export function readMockDraftState(storage?: Storage): MockDraftState | null {
  try {
    const saved = (storage ?? window.localStorage).getItem(
      ACTIVE_MOCK_DRAFT_STORAGE_KEY
    );
    if (saved === null) return null;
    const parsed = JSON.parse(saved) as Partial<StoredMockDraft>;
    if (
      parsed.version !== ACTIVE_MOCK_DRAFT_STORAGE_VERSION ||
      !parsed.settings ||
      !Array.isArray(parsed.picks)
    ) {
      return null;
    }
    validateMockDraftSettings(parsed.settings);
    if (!validPicks(parsed.picks)) return null;
    return {
      settings: {
        ...parsed.settings,
        appetites: { ...parsed.settings.appetites },
        roster: { ...parsed.settings.roster },
      },
      picks: parsed.picks.slice(),
    };
  } catch {
    return null;
  }
}

export function saveMockDraftState(
  state: MockDraftState,
  storage?: Storage
): void {
  try {
    validateMockDraftSettings(state.settings);
    if (!validPicks(state.picks)) return;
    const stored: StoredMockDraft = {
      version: ACTIVE_MOCK_DRAFT_STORAGE_VERSION,
      settings: state.settings,
      picks: state.picks,
    };
    (storage ?? window.localStorage).setItem(
      ACTIVE_MOCK_DRAFT_STORAGE_KEY,
      JSON.stringify(stored)
    );
  } catch {
    // The in-memory draft remains usable when browser storage is unavailable.
  }
}

export function clearMockDraftState(storage?: Storage): void {
  try {
    (storage ?? window.localStorage).removeItem(
      ACTIVE_MOCK_DRAFT_STORAGE_KEY
    );
  } catch {
    // Storage cleanup is best effort.
  }
}

function validPicks(picks: unknown[]): picks is string[] {
  return (
    picks.every((pick) => typeof pick === "string" && pick.length > 0) &&
    new Set(picks).size === picks.length
  );
}
