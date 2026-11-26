import type { WrappedType } from "../../FetchWrapped";
import { buildWaiverImpact, sortWaiverManagers } from "./waiverImpactData";

function fixture(): WrappedType {
  const roster = (week: number, rostered: string[], starting = rostered) => ({ weekNum: String(week), rostered, starting, projections: {} });
  return { year: "2026", latestScoringPeriod: 3, ffMatchups: {}, nflTeams: {},
    ffTeams: {
      a: { id: "a", name: "Alpha", draft: [{ playerId: 1, pickIndex: 0 }], rosters: {
        "1": roster(1, ["1", "3"], ["1"]), "2": roster(2, ["1", "3"]), "3": roster(3, ["1", "3"]),
      } },
      b: { id: "b", name: "Bravo", draft: [{ playerId: 2, pickIndex: 1 }], rosters: {
        "1": roster(1, ["2"]), "2": roster(2, ["2"]), "3": roster(3, ["2"]),
      } },
    },
    nflPlayers: Object.fromEntries(["1", "2", "3", "4", "5"].map(id => [id, { id, name: `Player ${id}`, position: id === "4" ? "K" : id === "5" ? "DST" : "WR", nflTeamId: "1", projection: 0, total: 0, average: 0, scores: { "1": 8, "2": 10, "3": 15 } }])),
  };
}
const alpha = (w: WrappedType, exclude = false) => buildWaiverImpact(w, exclude).managers.find(m => m.id === "a")!;
const setRoster = (w: WrappedType, team: string, week: string, ids: string[], starting = ids) => {
  w.ffTeams[team].rosters[week] = { weekNum: week, rostered: ids, starting, projections: {} };
};

test("bench acquisition carries into two starts; zero weeks count in averages", () => {
  const report = buildWaiverImpact(fixture());
  expect(report.weeks).toEqual(["1", "2", "3"]);
  expect(report.managers[0]).toMatchObject({ pickups: 1, uniqueStarters: 1, starts: 2, totalPoints: 25, coveredWeeks: 3, pointsPerStart: 12.5, bestWeek: 15, bestWeekNumber: "3", missingScores: 0 });
  expect(report.managers[0].pointsPerWeek).toBeCloseTo(25 / 3);
  expect(report.managers[0].share).toBeCloseTo(100 * 25 / 58);
  expect(report.managers[0].weeks[0]).toMatchObject({ points: 0, starters: [], pickups: [{ id: "3" }] });
  expect(report.managers[1]).toMatchObject({ pointsPerWeek: 0, totalPoints: 0, pickups: 0, starts: 0, pointsPerStart: null, bestWeekNumber: "1" });
  expect(report.averages[1]).toMatchObject({ week: "2", points: 5, starts: 0.5, pickups: 0 });
});

test("excludes direct transfers, including a transfer from a different draft owner", () => {
  const w = fixture();
  setRoster(w, "a", "1", ["1", "2"]); setRoster(w, "b", "1", []);
  setRoster(w, "a", "2", ["1", "2", "3"]); setRoster(w, "b", "2", []);
  setRoster(w, "a", "3", ["1", "2"]); setRoster(w, "b", "3", ["3"]);
  expect(alpha(w)).toMatchObject({ totalPoints: 10, pickups: 1, starts: 1 });
  expect(buildWaiverImpact(w).managers[1].totalPoints).toBe(0);
});

test("counts reacquired drafted players and repeat adds, deduplicating unique starters", () => {
  const w = fixture(); w.latestScoringPeriod = 5;
  setRoster(w, "a", "1", ["3"]);
  setRoster(w, "a", "2", []);
  setRoster(w, "a", "3", ["1", "3"]);
  setRoster(w, "a", "4", []); setRoster(w, "b", "4", ["2"]);
  setRoster(w, "a", "5", ["3"]); setRoster(w, "b", "5", ["2"]);
  w.nflPlayers["3"].scores["5"] = 7;
  expect(alpha(w)).toMatchObject({ pickups: 4, uniqueStarters: 2, starts: 4, totalPoints: 45 });
});

test("uses the union of rostered and starting players without counting duplicates", () => {
  const w = fixture(); setRoster(w, "a", "1", ["1"], ["1", "3", "3"]);
  expect(alpha(w)).toMatchObject({ pickups: 1, starts: 3, totalPoints: 33 });
});

test("preserves negative and zero points and chooses earliest tied best week", () => {
  const w = fixture(); w.nflPlayers["3"].scores = { "2": -4, "3": 0 };
  expect(alpha(w)).toMatchObject({ totalPoints: -4, bestWeek: 0, bestWeekNumber: "1", starts: 2, pointsPerStart: -2 });
  for (const player of Object.values(w.nflPlayers)) player.scores = { "1": 0, "2": 0, "3": 0 };
  expect(alpha(w).share).toBeNull();
});

test("ignores roster zero and future weeks and respects a zero completed-week cutoff", () => {
  const w = fixture(); setRoster(w, "a", "0", ["4"]); setRoster(w, "a", "4", ["4"]);
  expect(alpha(w).pickups).toBe(1);
  w.latestScoringPeriod = 0;
  expect(buildWaiverImpact(w)).toMatchObject({ weeks: [], averages: [], incompleteWeeks: [] });
  expect(alpha(w)).toMatchObject({ coveredWeeks: 0, pointsPerWeek: null, bestWeek: null });
});

test("missing own snapshot breaks continuity and is excluded from the denominator", () => {
  const w = fixture(); delete w.ffTeams.a.rosters["2"];
  expect(alpha(w)).toMatchObject({ coveredWeeks: 2, totalPoints: 0, starts: 0, pointsPerWeek: 0 });
  expect(alpha(w).weeks[1].available).toBe(false);
  expect(buildWaiverImpact(w).incompleteWeeks).toEqual(["2"]);
});

test("missing other snapshot allows existing stints but blocks new absence-based pickups", () => {
  const w = fixture(); delete w.ffTeams.b.rosters["2"];
  setRoster(w, "a", "3", ["1", "3", "4"]);
  expect(alpha(w)).toMatchObject({ totalPoints: 25, pickups: 1, starts: 2 });
});

test("entire missing weeks and missing draft baselines never bridge ownership", () => {
  const w = fixture(); delete w.ffTeams.a.rosters["2"]; delete w.ffTeams.b.rosters["2"];
  expect(buildWaiverImpact(w).averages[1]).toMatchObject({ points: null, starts: null, pickups: null });
  expect(alpha(w).starts).toBe(0);
  w.ffTeams.b.draft = [];
  expect(alpha(w).pickups).toBe(0);
});

test("duplicate ownership is ambiguous and breaks the waiver stint", () => {
  const w = fixture(); setRoster(w, "b", "2", ["2", "3"]);
  expect(alpha(w)).toMatchObject({ pickups: 1, starts: 0, totalPoints: 0 });
});

test("missing and nonfinite scores remain null; quantity and known totals survive", () => {
  const w = fixture(); delete w.nflPlayers["3"].scores["2"]; w.nflPlayers["3"].scores["3"] = NaN;
  expect(alpha(w)).toMatchObject({ pickups: 1, starts: 2, totalPoints: 0, missingScores: 2, topPickup: { id: "3", points: null } });
  expect(alpha(w).weeks[1].starters[0].points).toBeNull();
  w.nflPlayers["3"].scores["3"] = 15;
  expect(alpha(w)).toMatchObject({ totalPoints: 15, missingScores: 1, topPickup: { points: 15 } });
});

test("filters special teams from every metric and denominator and flags unknown identity", () => {
  const w = fixture();
  for (const week of ["1", "2", "3"]) setRoster(w, "a", week, ["1", "3", "4", "5", "unknown"]);
  expect(alpha(w)).toMatchObject({ pickups: 4, uniqueStarters: 4, starts: 12, totalPoints: 99, missingScores: 3 });
  expect(alpha(w, true)).toMatchObject({ pickups: 1, uniqueStarters: 1, starts: 3, totalPoints: 33, share: 50, missingIdentities: 3 });
  expect(alpha(w, true).weeks[0].lineupPoints).toBe(16);
});

test("unrecognized position labels are flagged and excluded in skill-only mode", () => {
  const w = fixture(); w.nflPlayers["3"].position = "Unknown";
  expect(alpha(w, true)).toMatchObject({ pickups: 0, starts: 0, missingIdentities: 3 });
});

test("sorts descending with null last and stable name/ID ties without mutating input", () => {
  const managers = buildWaiverImpact(fixture()).managers;
  const rows = [{ ...managers[0], id: "z", name: "Same", pointsPerWeek: null }, { ...managers[1], id: "2", name: "Same" }, { ...managers[1], id: "1", name: "Same" }, managers[0]];
  expect(sortWaiverManagers(rows, "pointsPerWeek").map(m => m.id)).toEqual(["a", "1", "2", "z"]);
  expect(rows[0].id).toBe("z");
  expect(sortWaiverManagers(managers, "pickups")[0].id).toBe("a");
});

test("does not invent weeks beyond the final recorded completed roster", () => {
  const w = fixture(); w.latestScoringPeriod = 18;
  expect(buildWaiverImpact(w).weeks).toEqual(["1", "2", "3"]);
});
