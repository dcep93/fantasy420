const test = require("node:test");
const assert = require("node:assert/strict");

const {
  getFantasyProsDraft,
  getFantasyProsOverallPick,
} = require("./fantasyprosdraft.js");

test("converts round.pickWithinRound labels to chronological overall picks", () => {
  assert.equal(getFantasyProsOverallPick("1.01", 10), 1);
  assert.equal(getFantasyProsOverallPick("1.10", 10), 10);
  assert.equal(getFantasyProsOverallPick("2.01", 10), 11);
  assert.equal(getFantasyProsOverallPick("2.02", 10), 12);
  assert.equal(getFantasyProsOverallPick("2.10", 10), 20);
  assert.equal(getFantasyProsOverallPick("3.01", 10), 21);
});

test("rejects malformed and out-of-range pick labels", () => {
  assert.equal(getFantasyProsOverallPick("current", 10), null);
  assert.equal(getFantasyProsOverallPick("1.00", 10), null);
  assert.equal(getFantasyProsOverallPick("1.11", 10), null);
  assert.equal(getFantasyProsOverallPick("1.01", 0), null);
});

test("extracts full names and sorts completed cells by overall pick", () => {
  const root = fakeRoot(10, [
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
  const root = fakeRoot(10, [
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
  assert.equal(getFantasyProsDraft(fakeRoot(0, [])), null);
  assert.deepEqual(getFantasyProsDraft(fakeRoot(10, [])), []);
});

function fakeRoot(teamCount, cells) {
  return {
    querySelectorAll(selector) {
      if (selector === ".vue-draft-board-team-heading") {
        return Array.from({ length: teamCount }, () => ({}));
      }
      if (selector === ".vue-draft-board-player-cell-contents") return cells;
      return [];
    },
  };
}

function fakeCell(name, pickNumber) {
  return {
    querySelector(selector) {
      if (selector === ".vue-draft-board-player-cell-contents__name") {
        return { getAttribute: () => name };
      }
      if (selector === ".vue-draft-board-player-cell-contents__pick-number") {
        return { textContent: pickNumber };
      }
      return null;
    },
  };
}
