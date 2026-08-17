import rankings from "./2026.json";
import wrapped from "../Wrapped/dataJson/2026.json";

const minimumPlayersBySource = {
  espn_10_ppr_super_auction: 300,
  draftsharks_ppr_super_auction: 250,
  tapthatdraft_10_ppr_super_auction: 210,
  yafsb_10_ppr_super_auction: 350,
  ringer_ppr_super_auction: 400,
  pfn_ppr_super: 440,
  yahoo_boone_ppr: 299,
  qblist_ppr: 300,
  cbs_ppr_auction: 200,
  fftoday_ppr: 225,
  fantasypros_ppr_super: 528,
  rotoballer_super: 400,
  si_ppr_super: 200,
  harrisfootball_ppr: 160,
  reddit_kyon_ppr: 140,
  rotoworld: 199,
} as const;

test("contains every complete 2026 ranking source in the legacy map format", () => {
  expect(Object.keys(rankings)).toEqual(Object.keys(minimumPlayersBySource));

  Object.entries(minimumPlayersBySource).forEach(([source, minimum]) => {
    const values = Object.values(rankings[source as keyof typeof rankings]);

    expect(values.length).toBeGreaterThanOrEqual(minimum);
    expect(values.every((value) => Number.isFinite(value))).toBe(true);
  });
});

test("stores auction prices as negative values so higher prices sort first", () => {
  Object.entries(rankings)
    .filter(([source]) => source.endsWith("_auction"))
    .forEach(([, players]) => {
      expect(Object.values(players).every((value) => value <= 0)).toBe(true);
    });
});

test("stores YAFSB auction values as dollars for a $200 budget", () => {
  expect(rankings.yafsb_10_ppr_super_auction["Josh Allen"]).toBe(-57.66);
  expect(rankings.yafsb_10_ppr_super_auction["Charlie Smyth"]).toBe(-1);
});

test("preserves representative values from the imported public boards", () => {
  expect(rankings.ringer_ppr_super_auction["Josh Allen"]).toBe(-65);
  expect(rankings.ringer_ppr_super_auction["Baker Mayfield"]).toBe(-19);
  expect(rankings.pfn_ppr_super["Josh Allen"]).toBe(1);
  expect(rankings.pfn_ppr_super["Baker Mayfield"]).toBe(94);
  expect(rankings.yahoo_boone_ppr["Baker Mayfield"]).toBe(170);
  expect(rankings.qblist_ppr["Bijan Robinson"]).toBe(1);
  expect(rankings.cbs_ppr_auction["Jahmyr Gibbs"]).toBe(-34);
  expect(rankings.fftoday_ppr["Jahmyr Gibbs"]).toBe(1);
});

test("new sources have unique normalized names and strongly match ESPN players", () => {
  const newSources = [
    "ringer_ppr_super_auction",
    "pfn_ppr_super",
    "yahoo_boone_ppr",
    "qblist_ppr",
    "cbs_ppr_auction",
    "fftoday_ppr",
  ] as const;
  const espnNames = new Set(
    Object.values(wrapped.nflPlayers).map(({ name }) => normalize(name))
  );

  newSources.forEach((source) => {
    const names = Object.keys(rankings[source]);
    const normalizedNames = names.map(normalize);
    const matches = normalizedNames.filter((name) => espnNames.has(name));

    expect(new Set(normalizedNames).size).toBe(names.length);
    expect(matches.length / names.length).toBeGreaterThanOrEqual(0.85);
  });
});

function normalize(name: string): string {
  return name
    .toLocaleLowerCase()
    .replaceAll(/[^A-Za-z0-9 ]/g, "")
    .replaceAll(/ i+$/g, "")
    .replaceAll(/gabriel davis$/gi, "gabe davis")
    .replaceAll(/hollywood brown$/gi, "marquise brown")
    .replaceAll(/nathaniel dell$/gi, "tank dell")
    .replaceAll(/cameron skattebo$/gi, "cam skattebo")
    .replaceAll(/cameron ward$/gi, "cam ward")
    .replaceAll(/kenneth gainwell$/gi, "kenny gainwell")
    .replaceAll(/chigoziem okonkwo$/gi, "chig okonkwo")
    .replaceAll(/andres borregales$/gi, "andy borregales")
    .replaceAll(/ sr$/gi, "")
    .replaceAll(/ jr$/gi, "");
}
