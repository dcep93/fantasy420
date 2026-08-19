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

test("keeps the message channel open for asynchronous storage reads", async () => {
  const response = new Promise((resolve) => {
    const keepChannelOpen = listener(
      { storage: { action: "get", keys: ["draft"] } },
      {},
      resolve
    );
    assert.equal(keepChannelOpen, true);
  });

  assert.deepEqual(await response, { draft: ["Josh Allen"] });
});

test("keeps the message channel open for asynchronous storage writes", async () => {
  const response = new Promise((resolve) => {
    const keepChannelOpen = listener(
      { storage: { action: "save", save: { draft: [] } } },
      {},
      resolve
    );
    assert.equal(keepChannelOpen, true);
  });

  assert.equal(await response, true);
});
