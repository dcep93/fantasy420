const test = require("node:test");
const assert = require("node:assert/strict");

let listener;
global.importScripts = () => {}; // The scoreboard listener is covered separately.
global.chrome = {
  runtime: {
    onMessageExternal: {
      addListener(nextListener) {
        listener = nextListener;
      },
    },
  },
  storage: {
    local: {
      get(keys, callback) {
        queueMicrotask(() => callback({ [keys[0]]: ["Josh Allen"] }));
      },
      set(save, callback) {
        queueMicrotask(callback);
      },
    },
  },
};

require("./background.js");

function sendExternalMessage(request) {
  return new Promise((resolve) => {
    const keepChannelOpen = listener(request, {}, resolve);
    assert.equal(keepChannelOpen, true);
  });
}

test("keeps the message channel open for asynchronous storage reads", async () => {
  const response = sendExternalMessage({
    storage: { action: "get", keys: ["draft"] },
  });

  assert.deepEqual(await response, { draft: ["Josh Allen"] });
});

test("keeps the message channel open for asynchronous storage writes", async () => {
  const response = sendExternalMessage({
    storage: { action: "save", save: { draft: [] } },
  });

  assert.equal(await response, true);
});

test("fetches JSON with the requested options", async () => {
  let received;
  global.fetch = async (url, options) => {
    received = { url, options };
    return {
      ok: true,
      json: async () => [{ id: 1, fullName: "Josh Allen" }],
    };
  };

  const options = {
    headers: { "x-fantasy-filter": '{"filterActive":{"value":true}}' },
  };
  const response = await sendExternalMessage({
    fetch: {
      url: "https://lm-api-reads.fantasy.espn.com/success",
      options,
      json: true,
      maxAgeMs: 0,
    },
  });

  assert.deepEqual(received, {
    url: "https://lm-api-reads.fantasy.espn.com/success",
    options,
  });
  assert.deepEqual(response, [{ id: 1, fullName: "Josh Allen" }]);
});

test("returns a serializable error for failed HTTP responses", async () => {
  global.fetch = async () => ({
    ok: false,
    status: 503,
    statusText: "Service Unavailable",
    text: async () => "temporarily down",
  });

  const response = await sendExternalMessage({
    fetch: {
      url: "https://lm-api-reads.fantasy.espn.com/http-error",
      json: true,
      maxAgeMs: 0,
    },
  });

  assert.deepEqual(response, {
    error: "HTTP 503 Service Unavailable: temporarily down",
  });
});

test("returns a serializable error for network failures", async () => {
  global.fetch = async () => {
    throw new TypeError("Failed to fetch");
  };

  const response = await sendExternalMessage({
    fetch: {
      url: "https://lm-api-reads.fantasy.espn.com/network-error",
      json: true,
      maxAgeMs: 0,
    },
  });

  assert.deepEqual(response, { error: "Failed to fetch" });
});

for (const filters of [["all", "defenses"], ["defenses", "all"]]) {
  test(`caches ESPN player filters separately (${filters.join(" then ")})`, async (t) => {
    const filterHeaders = {
      all: JSON.stringify({ players: { filterStatsForTopScoringPeriodIds: { value: 17 } } }),
      defenses: JSON.stringify({ players: { filterSlotIds: { value: [16] } } }),
    };
    const fetchMock = t.mock.method(global, "fetch", async (_url, options) => ({
      ok: true,
      text: async () => options.headers["x-fantasy-filter"] === filterHeaders.all
        ? '{"players":[{"id":1},{"id":-16001}]}'
        : '{"players":[{"id":-16001}]}',
    }));
    const request = (filter) => sendExternalMessage({
      fetch: {
        url: `https://lm-api-reads.fantasy.espn.com/filter-cache/${filters[0]}?view=kona_playercard`,
        options: { headers: { "x-fantasy-filter": filterHeaders[filter] } },
        json: false,
        maxAgeMs: 60_000,
      },
    });

    for (const filter of [...filters, ...filters]) {
      const response = JSON.parse(await request(filter));
      assert.deepEqual(response.players, filter === "all"
        ? [{ id: 1 }, { id: -16001 }]
        : [{ id: -16001 }]);
    }
    assert.equal(fetchMock.mock.callCount(), 2);
  });
}

test("equivalent headers reuse cached responses regardless of name case or order", async (t) => {
  const fetchMock = t.mock.method(global, "fetch", async () => ({
    ok: true,
    text: async () => "cached players",
  }));
  for (const headers of [
    { Accept: "application/json", "X-Fantasy-Filter": "all" },
    { "x-fantasy-filter": "all", accept: "application/json" },
    [["accept", "application/json"], ["x-fantasy-filter", "all"]],
  ]) {
    assert.equal(await sendExternalMessage({ fetch: {
      url: "https://lm-api-reads.fantasy.espn.com/equivalent-headers",
      options: { headers },
      maxAgeMs: 60_000,
    } }), "cached players");
  }
  assert.equal(fetchMock.mock.callCount(), 1);
});

test("headerless requests share a cache entry and still honor maxAgeMs", async (t) => {
  let fetched = 0;
  const fetchMock = t.mock.method(global, "fetch", async () => ({
    ok: true,
    text: async () => `response ${++fetched}`,
  }));
  const request = (options, maxAgeMs = 60_000) => sendExternalMessage({ fetch: {
    url: "https://lm-api-reads.fantasy.espn.com/headerless-cache",
    options,
    maxAgeMs,
  } });
  assert.equal(await request(undefined), "response 1");
  assert.equal(await request({ headers: {} }), "response 1");
  assert.equal(await request({}, 0), "response 2");
  assert.equal(fetchMock.mock.callCount(), 2);
});
