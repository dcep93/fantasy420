const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

test("injects odds for normalized names without partial, Under, or defense matches", async () => {
  function bio(name) {
    const attributes = {};
    const link = {
      innerText: name,
      parentElement: {
        parentElement: { classList: { contains: () => false } },
      },
      getAttribute: (key) => attributes[key],
      setAttribute: (key, value) => { attributes[key] = value; },
    };
    const position = { innerText: "RB", style: {} };
    return {
      link, position,
      getElementsByTagName: () => [link],
      getElementsByClassName: () => [position],
    };
  }
  const players = [
    "James Cook III", "Marvin Harrison Jr.", "DJ Moore", "Gabe Davis",
    "Cook", "Dalvin Cook", "Under Only", "Bills D/ST", "   ",
  ].map(bio);
  const props = [
    ["James Cook", "Rushing Yards O/U", 76.5],
    ["James Cook", "Anytime Touchdown Scorer", undefined, 2],
    ["James Cook", "Receiving Yards O/U", 20.5],
    ["James Cook", "Receptions O/U", 2.5],
    ["Marvin Harrison", "Receiving Yards O/U", 47.5],
    ["D.J. Moore", "Receiving Yards O/U", 50.5],
    ["Gabriel Davis (BUF)", "Receiving Yards O/U", 30.5],
    ["Under Only", "Rushing Yards O/U", 100, 2, "Under"],
    ["Bills D/ST", "Rushing Yards O/U", 100],
    [undefined, "Rushing Yards O/U", 100],
  ];
  const payload = {
    markets: props.map(([, name], id) => ({
      id, name, eventId: "cook-game", marketType: { name },
    })),
    selections: props.map(([name, , points, trueOdds = 2, outcomeType = "Over"], marketId) => ({
      marketId, points, trueOdds, outcomeType,
      participants: [{ type: "Player", name }],
    })),
  };
  let finish;
  const injected = new Promise(resolve => { finish = resolve; });
  const context = vm.createContext({
    console: { log() {} },
    document: { getElementsByClassName: () => players },
    location: { pathname: "/football/team", href: "https://fantasy.espn.com/football/team" },
    setTimeout: finish,
    chrome: {
      runtime: {
        sendMessage(id, request, callback) {
          if (request.storage) return callback(request.storage.action === "save" ? true : { vegas: {} });
          callback(request.fetch.url.includes("navigation/")
            ? { events: [{ eventId: "cook-game", startDate: new Date(Date.now() + 86400000).toISOString() }] }
            : request.fetch.url.endsWith("/1000") ? payload : { markets: [], selections: [] });
        },
      },
    },
  });
  for (const file of ["shared.js", "vegas.js"]) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, file), "utf8"), context);
  }
  await injected;
  assert.equal(players[0].position.innerText, "17.00 TD_RSHy_R_RCPy");
  assert.equal(players[0].link.innerText, "James Cook III");
  for (const player of players.slice(0, 4)) {
    assert.equal(player.position.style.backgroundColor, "lightgreen");
  }
  for (const player of players.slice(4)) {
    assert.equal(player.position.style.backgroundColor, undefined, player.link.innerText);
    assert.equal(player.position.innerText, "RB");
  }
});

async function historyHarness({ failFirstWrite = false, failFirstRead = false } = {}) {
  let now = Date.parse("2026-11-25T12:00:00Z");
  class Clock extends Date {
    constructor(...args) { super(...(args.length ? args : [now])); }
    static now() { return now; }
  }
  const future = "2026-11-26T18:00:00Z";
  const old = "2026-11-23T18:00:00Z";
  const events = [
    { eventId: "upcoming", startDate: future, name: "CIN @ WAS", player: "Jayden Daniels", odds: 3.7 },
    { eventId: "other", startDate: "2026-11-27T18:00:00Z", name: "BUF @ KC", player: "James Cook", odds: 2 },
    { eventId: "past", startDate: old, player: "Past Player", odds: 4 },
    { eventId: "kickoff", startDate: new Clock().toISOString(), player: "Kickoff Player", odds: 5 },
    { eventId: "invalid", startDate: "invalid", player: "Invalid Player", odds: 6 },
  ];
  const players = events.map(({ player: name }) => {
    const attributes = {};
    const link = {
      innerText: name,
      parentElement: { parentElement: { classList: { contains: () => false } } },
      getAttribute: key => attributes[key],
      setAttribute: (key, value) => { attributes[key] = value; },
    };
    const position = { innerText: "QB", style: {} };
    return { link, position, getElementsByTagName: () => [link], getElementsByClassName: () => [position] };
  });
  let storage = { vegas: {
    "Jayden Daniels": { [old]: { score: "12.00", touchdownOddsDecimal: 4 } },
    "Untouched Player": { [old]: { score: "7.00" } },
  } };
  const original = structuredClone(storage);
  let writes = 0;
  let reads = 0;
  const errors = [];
  let resume, finish;
  let cycle = new Promise(resolve => { finish = resolve; });
  const context = vm.createContext({
    Date: Clock,
    console: { log() {}, error(...args) { errors.push(args); } },
    document: { getElementsByClassName: () => players },
    location: { pathname: "/football/team", href: "https://fantasy.espn.com/football/team" },
    setTimeout(callback) { resume = callback; finish(); },
    chrome: { runtime: { sendMessage(id, request, callback) {
      queueMicrotask(() => {
        if (request.storage?.action === "get") {
          reads++;
          return callback(failFirstRead && reads === 1 ? { error: "Read failed" } : structuredClone(storage));
        }
        if (request.storage?.action === "save") {
          writes++;
          if (failFirstWrite && writes === 1) return callback({ error: "QUOTA_BYTES exceeded" });
          storage = structuredClone(request.storage.save);
          return callback(true);
        }
        if (request.fetch.url.includes("navigation/")) return callback({ events });
        const event = events.find(e => request.fetch.url.includes(`/events/${e.eventId}/`));
        callback(request.fetch.url.endsWith("/1000") ? {
          markets: [{ id: "td", eventId: event.eventId, name: "Anytime TD", marketType: { name: "Anytime Touchdown Scorer" } }],
          selections: [{ marketId: "td", trueOdds: event.odds, participants: [{ type: "Player", name: event.player }] }],
        } : { markets: [], selections: [] });
      });
    } } },
  });
  for (const file of ["shared.js", "vegas.js"]) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, file), "utf8"), context);
  }
  await cycle;
  return {
    future, old, original, players, errors, events,
    get storage() { return storage; },
    get writes() { return writes; },
    get reads() { return reads; },
    async tick(time = now) {
      now = time;
      cycle = new Promise(resolve => { finish = resolve; });
      resume();
      await cycle;
    },
  };
}

test("saves pregame prices with their event date and preserves older history", async () => {
  const h = await historyHarness();
  const saved = h.storage.vegas["Jayden Daniels"][h.future];
  assert.equal(saved.eventId, "upcoming");
  assert.equal(saved.eventName, "CIN @ WAS");
  assert.equal(saved.touchdownOddsDecimal, 3.7);
  assert.equal(saved.touchdownOdds, "0.30"); // Existing adjusted projection stays separate.
  assert.equal(typeof saved.score, "string");
  assert.ok(saved.date);
  assert.deepEqual(h.storage.vegas["Jayden Daniels"][h.old], h.original.vegas["Jayden Daniels"][h.old]);
  assert.deepEqual(h.storage.vegas["Untouched Player"], h.original.vegas["Untouched Player"]);
  assert.equal(h.storage.vegas["James Cook"]["2026-11-27T18:00:00Z"].touchdownOddsDecimal, 2);
  for (const name of ["Past Player", "Kickoff Player", "Invalid Player"]) {
    assert.equal(h.storage.vegas[name], undefined);
  }
  assert.equal(h.writes, 1);
  await h.tick();
  await h.tick();
  assert.equal(h.writes, 1, "unchanged projections must not write every second");
  assert.equal(h.reads, 1);
  assert.equal(h.errors.length, 0);
});

for (const failure of ["failFirstWrite", "failFirstRead"]) {
  test(`retries ${failure} after the overlay has already rendered`, async () => {
    const h = await historyHarness({ [failure]: true });
    assert.equal(h.storage.vegas["Jayden Daniels"][h.future], undefined);
    assert.equal(h.players[0].position.style.backgroundColor, "lightgreen");
    assert.equal(h.errors.length, 1);
    await h.tick();
    assert.equal(h.storage.vegas["Jayden Daniels"][h.future].touchdownOddsDecimal, 3.7);
    assert.equal(h.writes, failure === "failFirstWrite" ? 2 : 1);
    await h.tick();
    assert.equal(h.writes, failure === "failFirstWrite" ? 2 : 1);
  });
}

test("updates changed pregame prices but never overwrites them after kickoff", async () => {
  const h = await historyHarness();
  h.events[0].odds = 4.5;
  await h.tick(Date.parse("2026-11-25T12:16:00Z"));
  assert.equal(h.storage.vegas["Jayden Daniels"][h.future].touchdownOddsDecimal, 4.5);
  const pregame = structuredClone(h.storage);
  h.events[0].odds = 1.5;
  await h.tick(Date.parse("2026-11-28T12:00:00Z"));
  assert.deepEqual(h.storage, pregame);
  assert.equal(h.writes, 2);
});
