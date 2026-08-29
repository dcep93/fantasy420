const test = require("node:test");
const assert = require("node:assert/strict");

let listener;
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
