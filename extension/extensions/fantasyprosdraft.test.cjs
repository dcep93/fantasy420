const test = require("node:test");
const assert = require("node:assert/strict");

const {
  getFantasyProsDraft,
  getFantasyProsDraftSnapshot,
  getFantasyProsPickOrder,
} = require("./fantasyprosdraft.js");

test("orders round.pickWithinRound labels without needing team headings", () => {
  assert.ok(getFantasyProsPickOrder("1.12") < getFantasyProsPickOrder("2.01"));
  assert.ok(getFantasyProsPickOrder("2.01") < getFantasyProsPickOrder("2.12"));
});

test("rejects malformed pick labels", () => {
  assert.equal(getFantasyProsPickOrder("current"), null);
  assert.equal(getFantasyProsPickOrder("1.00"), null);
  assert.equal(getFantasyProsPickOrder("0.01"), null);
});

test("extracts full names and sorts completed cells by overall pick", () => {
  const root = fakeRoot([
    fakeCell("James Cook III", "2.10"),
    fakeCell("Ja'Marr Chase", "1.08"),
    fakeCell("Josh Allen", "1.01"),
    fakeCell("", "1.02"),
    fakeCell("Jahmyr Gibbs", "not-a-pick"),
  ]);

  assert.deepEqual(getFantasyProsDraft(root), [
    "Josh Allen",
    "Ja'Marr Chase",
    "James Cook III",
  ]);
});

test("sorts reversed even-round DOM cells by chronological pick label", () => {
  const root = fakeRoot([
    fakeCell("Puka Nacua", "2.02"),
    fakeCell("Justin Herbert", "2.01"),
    fakeCell("Caleb Williams", "1.10"),
  ]);

  assert.deepEqual(getFantasyProsDraft(root), [
    "Caleb Williams",
    "Justin Herbert",
    "Puka Nacua",
  ]);
});

test("distinguishes an unrendered board from a rendered empty draft", () => {
  assert.equal(getFantasyProsDraft(fakeRoot([])), null);
  assert.deepEqual(getFantasyProsDraft(fakeRoot([fakeCell("", "1.01")])), []);
});

test("detects team count from all cells while preserving completed pick order", () => {
  assert.deepEqual(
    getFantasyProsDraftSnapshot(
      fakeRoot([
        fakeCell("Third Pick", "1.03"),
        fakeCell("", "1.12"),
        fakeCell("First Pick", "1.01"),
        fakeCell("Second Round Pick", "2.01"),
      ])
    ),
    {
      draft: ["First Pick", "Third Pick", "Second Round Pick"],
      teamCount: 12,
    }
  );
});

function fakeRoot(cells) {
  return {
    querySelectorAll(selector) {
      if (selector === ".vue-base-draft-log-cell") return cells;
      return [];
    },
  };
}

function fakeCell(name, pickNumber) {
  return {
    querySelector(selector) {
      if (selector === ".vue-draft-log-cell__player-name") {
        return { getAttribute: () => name };
      }
      if (selector === ".vue-base-draft-log-cell__pick-number") {
        return { textContent: pickNumber };
      }
      return null;
    },
  };
}
