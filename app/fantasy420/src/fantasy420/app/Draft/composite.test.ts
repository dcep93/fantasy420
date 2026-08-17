import getFormatAwareRankings, {
  getSourceLabel,
  isSeparatorSource,
  isSuperflexSource,
  RankingSources,
} from "./composite";

const playerIds = ["q1", "q2", "a", "b", "c", "d"];
const positions = {
  q1: "QB",
  q2: "QB",
  a: "RB",
  b: "WR",
  c: "TE",
  d: "WR",
};

function getSources(nonSuperQbs: Record<string, number>): RankingSources {
  return {
    native_super: { q1: 1, a: 2, q2: 3, b: 4, c: 5, d: 6 },
    analyst_ppr: { c: 1, d: 2, b: 3, a: 4, ...nonSuperQbs },
  };
}

test("classifies superflex sources by name and keeps source labels implicit", () => {
  expect(isSuperflexSource("fantasypros_ppr_SUPER")).toBe(true);
  expect(isSuperflexSource("harrisfootball_ppr")).toBe(false);
  expect(isSeparatorSource("")).toBe(true);
  expect(isSeparatorSource("___")).toBe(true);
  expect(isSuperflexSource("___super___")).toBe(true);
  expect(getSourceLabel("analyst_ppr")).toBe("analyst_ppr");
  expect(getSourceLabel("___")).toBe("");
});

test("keeps the native superflex QB identities, order, and slots", () => {
  const result = getFormatAwareRankings(
    getSources({ q2: 1, q1: 99 }),
    playerIds,
    positions
  );

  expect(result.composite.q1).toBe(1);
  expect(result.composite.q2).toBe(3);
  expect(result.composite.c).toBe(2);
  expect(result.sources.native_super).toEqual(
    getSources({ q2: 1, q1: 99 }).native_super
  );
  expect(result.adjustedSources).toEqual(new Set(["analyst_ppr"]));
});

test("gives non-superflex QB rankings zero composite influence", () => {
  const reversedQbs = getFormatAwareRankings(
    getSources({ q2: 1, q1: 99 }),
    playerIds,
    positions
  );
  const omittedQbs = getFormatAwareRankings(
    getSources({}),
    playerIds,
    positions
  );

  expect(reversedQbs.composite).toEqual(omittedQbs.composite);
  expect(reversedQbs.sources.analyst_ppr).toEqual(
    omittedQbs.sources.analyst_ppr
  );
});

test("adds every scaffold QB to adjusted views and preserves non-QB order", () => {
  const result = getFormatAwareRankings(
    getSources({}),
    playerIds,
    positions
  );
  const adjusted = result.sources.analyst_ppr;

  expect(adjusted.q1).toBe(1);
  expect(adjusted.c).toBe(2);
  expect(adjusted.q2).toBe(3);
  expect(adjusted.d).toBe(4);
  expect(adjusted.b).toBe(5);
  expect(adjusted.a).toBe(6);
});

test("tied non-QB inputs do not depend on source insertion order", () => {
  const first = getFormatAwareRankings(
    {
      native_super: { q1: 1, a: 2, q2: 3, b: 4 },
      analyst: { a: 1, b: 1 },
    },
    playerIds,
    positions
  );
  const second = getFormatAwareRankings(
    {
      native_super: { q1: 1, a: 2, q2: 3, b: 4 },
      analyst: { b: 1, a: 1 },
    },
    playerIds,
    positions
  );

  expect(first.composite).toEqual(second.composite);
});

test("falls back to raw rankings when no superflex source exists", () => {
  const sources = { analyst: { q2: 1, a: 2, q1: 3 } };
  const result = getFormatAwareRankings(sources, playerIds, positions);

  expect(result.composite).toEqual({ q2: 1, a: 2, q1: 3 });
  expect(result.sources).toBe(sources);
  expect(result.adjustedSources.size).toBe(0);
});
