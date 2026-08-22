import { getRookiePlayerIds, normalizeDraftPlayerName } from "./rookies";

test("normalizes equivalent player names consistently", () => {
  expect(normalizeDraftPlayerName("Gabriel Davis")).toBe(
    normalizeDraftPlayerName("Gabe Davis")
  );
  expect(normalizeDraftPlayerName("Veteran Player Jr.")).toBe(
    normalizeDraftPlayerName("Veteran Player")
  );
});

test("identifies players missing from every previous-year draft source", () => {
  const players = {
    veteran: { name: "Veteran Player" },
    alias: { name: "Gabe Davis" },
    rookie: { name: "Rookie Prospect" },
  };
  const previousYearDraft = {
    sourceOne: { "Veteran Player Jr.": 1 },
    sourceTwo: { "Gabriel Davis": 2 },
  };

  expect(getRookiePlayerIds(players, previousYearDraft)).toEqual(
    new Set(["rookie"])
  );
});

test("does not infer rookies when the previous year's draft is unavailable", () => {
  expect(
    getRookiePlayerIds({ rookie: { name: "Rookie Prospect" } }, undefined)
  ).toEqual(new Set());
});
