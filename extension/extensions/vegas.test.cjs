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
          if (request.storage) return callback({ vegas: {} });
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
