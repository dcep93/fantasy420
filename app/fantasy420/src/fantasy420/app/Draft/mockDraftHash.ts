import {
  MockDraftSettings,
  MockDraftState,
  validateMockDraftSettings,
} from "./mockDraft";

const HASH_PREFIX = "#draft=";
const VERSION = 1;

type StoredMockDraft = {
  v: typeof VERSION;
  settings: MockDraftSettings;
  picks: string[];
};

export function encodeMockDraftHash(state: MockDraftState): string {
  validateMockDraftSettings(state.settings);
  validatePicks(state.picks);
  return `${HASH_PREFIX}${encodeBase64Url(
    JSON.stringify({ v: VERSION, settings: state.settings, picks: state.picks })
  )}`;
}

export function decodeMockDraftHash(hash: string): MockDraftState | null {
  if (!hash.startsWith(HASH_PREFIX)) return null;
  try {
    const parsed = JSON.parse(
      decodeBase64Url(hash.slice(HASH_PREFIX.length))
    ) as Partial<StoredMockDraft>;
    if (parsed.v !== VERSION) {
      throw new Error(`Unsupported mock draft version: ${String(parsed.v)}`);
    }
    if (!parsed.settings || !Array.isArray(parsed.picks)) {
      throw new Error("Invalid mock draft URL");
    }
    validateMockDraftSettings(parsed.settings);
    validatePicks(parsed.picks);
    return {
      settings: parsed.settings,
      picks: parsed.picks.slice(),
    };
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.startsWith("Unsupported mock draft version") ||
        error.message.includes("duplicate player ids") ||
        error.message.includes("must be"))
    ) {
      throw error;
    }
    throw new Error("Invalid mock draft URL");
  }
}

export function readMockDraftHash(): MockDraftState | null {
  return decodeMockDraftHash(window.location.hash);
}

export function replaceMockDraftHash(state: MockDraftState): void {
  window.history.replaceState(
    null,
    "",
    `${window.location.pathname}${window.location.search}${encodeMockDraftHash(
      state
    )}`
  );
}

function validatePicks(picks: unknown[]): asserts picks is string[] {
  if (!picks.every((pick) => typeof pick === "string" && pick.length > 0)) {
    throw new Error("Invalid mock draft URL");
  }
  if (new Set(picks).size !== picks.length) {
    throw new Error("Mock draft URL contains duplicate player ids");
  }
}

function encodeBase64Url(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

function decodeBase64Url(value: string): string {
  const standard = value.replaceAll("-", "+").replaceAll("_", "/");
  const padded = standard.padEnd(
    standard.length + ((4 - (standard.length % 4)) % 4),
    "="
  );
  const binary = atob(padded);
  return new TextDecoder().decode(
    Uint8Array.from(binary, (character) => character.charCodeAt(0))
  );
}

