import { DEFAULT_MOCK_DRAFT_SETTINGS } from "./mockDraft";
import {
  getMockDraftSetupPreferences,
  MOCK_DRAFT_SETTINGS_STORAGE_KEY,
  readMockDraftSetupPreferences,
  saveMockDraftSetupPreferences,
} from "./mockDraftSettingsStorage";

beforeEach(() => {
  window.localStorage.clear();
});

test("round trips every setup preference without a seed", () => {
  const settings = {
    ...DEFAULT_MOCK_DRAFT_SETTINGS,
    draftPosition: 3,
    teamCount: 12,
    seed: "must-not-be-stored",
    roster: { ...DEFAULT_MOCK_DRAFT_SETTINGS.roster, BENCH: 7 },
  };
  const preferences = getMockDraftSetupPreferences(
    settings,
    { positionRisk: "", byeRisk: "2.5", craziness: "9" },
    { QB: "4", RB: "3", WR: "2", TE: "" }
  );

  saveMockDraftSetupPreferences(preferences);

  expect(readMockDraftSetupPreferences()).toEqual(preferences);
  expect(
    window.localStorage.getItem(MOCK_DRAFT_SETTINGS_STORAGE_KEY)
  ).not.toContain("seed");
});

test("falls back field by field for incomplete and invalid saved values", () => {
  window.localStorage.setItem(
    MOCK_DRAFT_SETTINGS_STORAGE_KEY,
    JSON.stringify({
      version: 1,
      draftPosition: 4,
      teamCount: "twelve",
      riskInputs: { positionRisk: 2, byeRisk: null },
      appetiteInputs: { QB: "", RB: 3 },
      roster: { QB: 2, RB: "bad", BENCH: 5 },
    })
  );

  expect(readMockDraftSetupPreferences()).toEqual({
    version: 1,
    draftPosition: 4,
    teamCount: 10,
    riskInputs: { positionRisk: "2", byeRisk: "1", craziness: "1" },
    appetiteInputs: { QB: "", RB: "3", WR: "1", TE: "1" },
    roster: {
      ...DEFAULT_MOCK_DRAFT_SETTINGS.roster,
      QB: 2,
      BENCH: 5,
    },
  });
});

test("returns defaults for malformed storage or an unsupported version", () => {
  const defaults = getMockDraftSetupPreferences(DEFAULT_MOCK_DRAFT_SETTINGS);
  window.localStorage.setItem(MOCK_DRAFT_SETTINGS_STORAGE_KEY, "{");
  expect(readMockDraftSetupPreferences()).toEqual(defaults);

  window.localStorage.setItem(
    MOCK_DRAFT_SETTINGS_STORAGE_KEY,
    JSON.stringify({ version: 2, draftPosition: 1 })
  );
  expect(readMockDraftSetupPreferences()).toEqual(defaults);
});

test("keeps working when storage throws", () => {
  const defaults = getMockDraftSetupPreferences(DEFAULT_MOCK_DRAFT_SETTINGS);
  const unavailable = {
    getItem: () => {
      throw new Error("unavailable");
    },
    setItem: () => {
      throw new Error("unavailable");
    },
  } as unknown as Storage;

  expect(readMockDraftSetupPreferences(unavailable)).toEqual(defaults);
  expect(() =>
    saveMockDraftSetupPreferences(defaults, unavailable)
  ).not.toThrow();
});
