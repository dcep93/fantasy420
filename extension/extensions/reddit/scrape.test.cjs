const test = require("node:test");
const assert = require("node:assert/strict");

const {
  fetchRedditPlayerBank,
  getRedditPlayerUrl,
  toRedditPlayerBank,
} = require("./scrape.js");

test("builds the ESPN player URL for the current calendar year", () => {
  assert.equal(
    getRedditPlayerUrl(new Date("2026-08-27T12:00:00Z")),
    "https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/2026/players?scoringPeriodId=0&view=players_wl"
  );
});

test("transforms ESPN players into the Reddit player bank", () => {
  assert.deepEqual(
    toRedditPlayerBank([
      { id: 1, fullName: "Josh Allen", ownership: { percentOwned: 99.5 } },
      { id: 2, fullName: "Free Agent" },
    ]),
    {
      1: { id: 1, n: "Josh Allen", o: 99.5 },
      2: { id: 2, n: "Free Agent", o: undefined },
    }
  );
});

test("requests players through the extension fetch channel", async () => {
  let payload;
  const playerBank = await fetchRedditPlayerBank(
    async (nextPayload) => {
      payload = nextPayload;
      return [
        { id: 1, fullName: "Josh Allen", ownership: { percentOwned: 99.5 } },
      ];
    },
    new Date("2026-08-27T12:00:00Z")
  );

  assert.deepEqual(payload, {
    fetch: {
      url: "https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/2026/players?scoringPeriodId=0&view=players_wl",
      options: {
        headers: {
          "x-fantasy-filter": '{"filterActive":{"value":true}}',
        },
      },
      json: true,
      maxAgeMs: 6 * 60 * 60 * 1000,
    },
  });
  assert.deepEqual(playerBank, {
    1: { id: 1, n: "Josh Allen", o: 99.5 },
  });
});

test("rejects service-worker fetch errors", async () => {
  await assert.rejects(
    fetchRedditPlayerBank(
      async () => ({ error: "Failed to fetch" }),
      new Date("2026-08-27T12:00:00Z")
    ),
    /ESPN player fetch failed: Failed to fetch/
  );
});
