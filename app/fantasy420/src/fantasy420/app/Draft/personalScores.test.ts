import { beforeEach, expect, test } from "vitest";

import {
  applyPersonalScores,
  getPersonalScoresStorageKey,
  readPersonalScores,
  savePersonalScores,
  sortByPersonalScoreMagnitude,
} from "./personalScores";

beforeEach(() => {
  window.localStorage.clear();
});

test("applies positive and negative scores as composite rank offsets", () => {
  expect(
    applyPersonalScores(
      { a: 1, b: 2, c: 3, d: 4 },
      { c: 2, a: -2 }
    )
  ).toEqual({ c: 1, b: 2, a: 3, d: 4 });
});

test("keeps base order for adjusted ties and returns contiguous ranks", () => {
  expect(
    applyPersonalScores({ a: 1, b: 2, c: 3 }, { c: 2 })
  ).toEqual({ a: 1, c: 2, b: 3 });
});

test("sorts scored players by absolute magnitude before unscored players", () => {
  expect(
    sortByPersonalScoreMagnitude(
      ["a", "b", "c", "d"],
      { a: 5, b: -10 },
      { b: 1, a: 2, d: 3, c: 4 }
    )
  ).toEqual(["b", "a", "d", "c"]);
});

test("reads only valid integer scores from the requested season", () => {
  window.localStorage.setItem(
    getPersonalScoresStorageKey("2025"),
    JSON.stringify({ old: 9 })
  );
  window.localStorage.setItem(
    getPersonalScoresStorageKey("2026"),
    JSON.stringify({ valid: -4, decimal: 1.5, text: "2", empty: null })
  );

  expect(readPersonalScores("2026")).toEqual({ valid: -4 });
});

test("treats malformed and non-object stored payloads as empty", () => {
  window.localStorage.setItem(getPersonalScoresStorageKey("2026"), "{");
  expect(readPersonalScores("2026")).toEqual({});

  window.localStorage.setItem(
    getPersonalScoresStorageKey("2026"),
    JSON.stringify([1, 2])
  );
  expect(readPersonalScores("2026")).toEqual({});
});

test("saves valid scores and removes an empty season", () => {
  savePersonalScores("2026", {
    positive: 3,
    negative: -7,
    decimal: 1.5,
    infinite: Number.POSITIVE_INFINITY,
  });

  expect(
    JSON.parse(
      window.localStorage.getItem(getPersonalScoresStorageKey("2026"))!
    )
  ).toEqual({ positive: 3, negative: -7 });

  savePersonalScores("2026", {});
  expect(
    window.localStorage.getItem(getPersonalScoresStorageKey("2026"))
  ).toBeNull();
});
