import { DEFAULT_MOCK_DRAFT_SETTINGS } from "./mockDraft";
import {
  ACTIVE_MOCK_DRAFT_STORAGE_KEY,
  clearMockDraftState,
  readMockDraftState,
  saveMockDraftState,
} from "./mockDraftStorage";

const state = {
  settings: {
    ...DEFAULT_MOCK_DRAFT_SETTINGS,
    seed: "abc 123/💗",
  },
  picks: ["4429795", "4374302"],
};

beforeEach(() => {
  window.localStorage.clear();
});

test("round trips versioned settings and ordered ESPN ids", () => {
  saveMockDraftState(state);

  expect(readMockDraftState()).toEqual(state);
  expect(
    JSON.parse(
      window.localStorage.getItem(ACTIVE_MOCK_DRAFT_STORAGE_KEY)!
    )
  ).toMatchObject({ version: 1, picks: state.picks });
});

test("returns no active draft for malformed, invalid, or unsupported state", () => {
  const invalidValues = [
    "{",
    JSON.stringify({ version: 99, settings: state.settings, picks: [] }),
    JSON.stringify({ version: 1, settings: state.settings, picks: ["1", "1"] }),
    JSON.stringify({
      version: 1,
      settings: { ...state.settings, teamCount: 1 },
      picks: [],
    }),
  ];

  invalidValues.forEach((value) => {
    window.localStorage.setItem(ACTIVE_MOCK_DRAFT_STORAGE_KEY, value);
    expect(readMockDraftState()).toBeNull();
  });
});

test("clears the active draft", () => {
  saveMockDraftState(state);
  clearMockDraftState();

  expect(readMockDraftState()).toBeNull();
  expect(
    window.localStorage.getItem(ACTIVE_MOCK_DRAFT_STORAGE_KEY)
  ).toBeNull();
});

test("keeps working when storage is unavailable", () => {
  const unavailable = {
    getItem: () => {
      throw new Error("unavailable");
    },
    setItem: () => {
      throw new Error("unavailable");
    },
    removeItem: () => {
      throw new Error("unavailable");
    },
  } as unknown as Storage;

  expect(readMockDraftState(unavailable)).toBeNull();
  expect(() => saveMockDraftState(state, unavailable)).not.toThrow();
  expect(() => clearMockDraftState(unavailable)).not.toThrow();
});
