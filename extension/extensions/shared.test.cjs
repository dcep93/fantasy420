const test = require("node:test");
const assert = require("node:assert/strict");

global.document = { documentElement: { dataset: {} } };
global.chrome = {
  runtime: {
    lastError: null,
    sendMessage(id, payload, callback) {
      callback({ id, payload });
    },
  },
};

const { do_send_message } = require("./shared.js");

test("sends through the discovered extension ID", async () => {
  document.documentElement.dataset.fantasy420ExtensionId = "generated-id";
  assert.deepEqual(await do_send_message({ storage: true }), {
    id: "generated-id",
    payload: { storage: true },
  });
});

test("rejects when the extension marker is missing", async () => {
  delete document.documentElement.dataset.fantasy420ExtensionId;
  await assert.rejects(
    do_send_message({ storage: true }),
    /Fantasy420 extension unavailable/
  );
});
