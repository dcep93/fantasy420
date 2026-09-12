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

const { do_send_message, normalizePlayerName } = require("./shared.js");

test("normalizes equivalent player names on either side of a lookup", () => {
  for (const [left, right] of [
    ["James Cook III", "James Cook"],
    ["Marvin Harrison Jr.", "Marvin Harrison"],
    ["Patrick Mahomes II", "Patrick Mahomes"],
    ["John Smith IV", "John Smith"],
    ["John Smith V", "John Smith"],
    ["John Smith Sr.", "John Smith"],
    ["D.J. Moore", "DJ Moore"],
    ["Gabriel Davis", "Gabe Davis"],
    ["Gabe Davis Jr.", "Gabriel Davis (BUF)"],
    ["  JAMES\tCOOK   III  ", "James Cook"],
    ["Ja’Marr Chase", "Ja'Marr Chase"],
    ["José Smith", "Jose Smith"],
  ]) {
    assert.equal(normalizePlayerName(left), normalizePlayerName(right), left);
  }
});

test("does not conflate partial or distinct names and handles missing names", () => {
  for (const [left, right] of [
    ["James Cook", "Dalvin Cook"],
    ["James Cook", "Cook"],
    ["John Smith", "John Smithson"],
    ["I Smith", "Smith"],
  ]) {
    assert.notEqual(normalizePlayerName(left), normalizePlayerName(right));
  }
  for (const value of [undefined, null, "", "   "]) {
    assert.equal(normalizePlayerName(value), "");
  }
});

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
