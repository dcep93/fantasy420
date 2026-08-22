import { DEFAULT_MOCK_DRAFT_SETTINGS } from "./mockDraft";
import {
  decodeMockDraftHash,
  encodeMockDraftHash,
  replaceMockDraftHash,
} from "./mockDraftHash";

const settings = {
  ...DEFAULT_MOCK_DRAFT_SETTINGS,
  seed: "abc 123/💗",
};

test("round trips versioned settings and ordered ESPN ids", () => {
  const hash = encodeMockDraftHash({
    settings,
    picks: ["4429795", "4374302"],
  });

  expect(hash).toMatch(/^#draft=[A-Za-z0-9_-]+$/);
  expect(decodeMockDraftHash(hash)).toEqual({
    settings,
    picks: ["4429795", "4374302"],
  });
});

test("returns null when no mock draft is present", () => {
  expect(decodeMockDraftHash("#other=value")).toBeNull();
  expect(decodeMockDraftHash("")).toBeNull();
});

test("rejects malformed, duplicate, and unsupported state", () => {
  expect(() => decodeMockDraftHash("#draft=broken")).toThrow(
    "Invalid mock draft URL"
  );

  const duplicate = encodePayload({
    v: 1,
    settings,
    picks: ["1", "1"],
  });
  expect(() => decodeMockDraftHash(`#draft=${duplicate}`)).toThrow(
    "duplicate player ids"
  );

  const future = encodePayload({ v: 99, settings, picks: [] });
  expect(() => decodeMockDraftHash(`#draft=${future}`)).toThrow(
    "Unsupported mock draft version"
  );
});

test("replaces only the hash portion of the current URL", () => {
  window.history.replaceState(null, "", "/draft?year=2026#old");
  replaceMockDraftHash({ settings, picks: ["4429795"] });

  expect(window.location.pathname).toBe("/draft");
  expect(window.location.search).toBe("?year=2026");
  expect(decodeMockDraftHash(window.location.hash)?.picks).toEqual([
    "4429795",
  ]);
});

function encodePayload(value: unknown): string {
  return btoa(unescape(encodeURIComponent(JSON.stringify(value))))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

