import rankings from "./2026.json";

const minimumPlayersBySource = {
  espn_10_ppr_super: 300,
  espn_10_ppr_super_auction: 300,
  espn_10_ppr: 300,
  espn_10_ppr_auction: 300,
  yafsb_10_ppr_super_auction: 350,
  fantasypros_halfppr_super: 150,
  rotoballer_super: 400,
  si_ppr_super: 200,
  harrisfootball_ppr: 160,
  rotoworld: 199,
  reddit_kyon_ppr: 140,
  draftsharks_ppr_super_auction: 250,
  tapthatdraft_10_ppr_super_auction: 210,
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
