const test = require("node:test");
const assert = require("node:assert/strict");

test("publishes the active extension runtime ID", async () => {
  global.chrome = { runtime: { id: "generated-extension-id" } };
  global.document = { documentElement: { dataset: {} } };
  global.location = { href: "https://example.com/" };

  require("./content_script.js");
  await Promise.resolve();

  assert.equal(
    document.documentElement.dataset.fantasy420ExtensionId,
    "generated-extension-id"
  );
});
