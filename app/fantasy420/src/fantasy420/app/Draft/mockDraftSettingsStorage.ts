import {
  AppetitePosition,
  DEFAULT_MOCK_DRAFT_SETTINGS,
  MockDraftSettings,
  RosterSlot,
} from "./mockDraft";

export const MOCK_DRAFT_SETTINGS_STORAGE_KEY =
  "fantasy420:draft:mock-draft-settings";

export const MOCK_DRAFT_SETTINGS_STORAGE_VERSION = 1;

export type MockDraftRiskInputs = Record<
  "positionRisk" | "byeRisk" | "craziness",
  string
>;

export type MockDraftAppetiteInputs = Record<AppetitePosition, string>;

export type MockDraftSetupPreferences = {
  version: typeof MOCK_DRAFT_SETTINGS_STORAGE_VERSION;
  draftPosition: number;
  teamCount: number;
  riskInputs: MockDraftRiskInputs;
  appetiteInputs: MockDraftAppetiteInputs;
  roster: MockDraftSettings["roster"];
};

const RISK_FACTORS: (keyof MockDraftRiskInputs)[] = [
  "positionRisk",
  "byeRisk",
  "craziness",
];
const APPETITE_POSITIONS: AppetitePosition[] = ["QB", "RB", "WR", "TE"];
const ROSTER_SLOTS = Object.keys(
  DEFAULT_MOCK_DRAFT_SETTINGS.roster
) as RosterSlot[];

export function getMockDraftSetupPreferences(
  settings: MockDraftSettings,
  riskInputs: MockDraftRiskInputs = {
    positionRisk: String(settings.positionRisk),
    byeRisk: String(settings.byeRisk),
    craziness: String(settings.craziness),
  },
  appetiteInputs: MockDraftAppetiteInputs = Object.fromEntries(
    APPETITE_POSITIONS.map((position) => [
      position,
      String(settings.appetites[position]),
    ])
  ) as MockDraftAppetiteInputs
): MockDraftSetupPreferences {
  return {
    version: MOCK_DRAFT_SETTINGS_STORAGE_VERSION,
    draftPosition: settings.draftPosition,
    teamCount: settings.teamCount,
    riskInputs: { ...riskInputs },
    appetiteInputs: { ...appetiteInputs },
    roster: { ...settings.roster },
  };
}

export function readMockDraftSetupPreferences(
  storage?: Storage
): MockDraftSetupPreferences {
  const defaults = getMockDraftSetupPreferences(DEFAULT_MOCK_DRAFT_SETTINGS);
  try {
    const saved = (storage ?? window.localStorage).getItem(
      MOCK_DRAFT_SETTINGS_STORAGE_KEY
    );
    if (saved === null) return defaults;
    return sanitizePreferences(JSON.parse(saved), defaults);
  } catch {
    return defaults;
  }
}

export function saveMockDraftSetupPreferences(
  preferences: MockDraftSetupPreferences,
  storage?: Storage
): void {
  try {
    (storage ?? window.localStorage).setItem(
      MOCK_DRAFT_SETTINGS_STORAGE_KEY,
      JSON.stringify(preferences)
    );
  } catch {
    // The in-memory form remains usable when browser storage is unavailable.
  }
}

function sanitizePreferences(
  value: unknown,
  defaults: MockDraftSetupPreferences
): MockDraftSetupPreferences {
  if (!isRecord(value) || value.version !== MOCK_DRAFT_SETTINGS_STORAGE_VERSION) {
    return defaults;
  }

  return {
    version: MOCK_DRAFT_SETTINGS_STORAGE_VERSION,
    draftPosition: finiteNumber(value.draftPosition, defaults.draftPosition),
    teamCount: finiteNumber(value.teamCount, defaults.teamCount),
    riskInputs: sanitizeTextRecord(
      value.riskInputs,
      defaults.riskInputs,
      RISK_FACTORS
    ),
    appetiteInputs: sanitizeTextRecord(
      value.appetiteInputs,
      defaults.appetiteInputs,
      APPETITE_POSITIONS
    ),
    roster: sanitizeNumberRecord(value.roster, defaults.roster, ROSTER_SLOTS),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function finiteNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function textValue(value: unknown, fallback: string): string {
  if (typeof value === "string") return value;
  return typeof value === "number" && Number.isFinite(value)
    ? String(value)
    : fallback;
}

function sanitizeTextRecord<Key extends string>(
  value: unknown,
  defaults: Record<Key, string>,
  keys: Key[]
): Record<Key, string> {
  const record = isRecord(value) ? value : {};
  return Object.fromEntries(
    keys.map((key) => [key, textValue(record[key], defaults[key])])
  ) as Record<Key, string>;
}

function sanitizeNumberRecord<Key extends string>(
  value: unknown,
  defaults: Record<Key, number>,
  keys: Key[]
): Record<Key, number> {
  const record = isRecord(value) ? value : {};
  return Object.fromEntries(
    keys.map((key) => [key, finiteNumber(record[key], defaults[key])])
  ) as Record<Key, number>;
}
