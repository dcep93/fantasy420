(() => {
  const extension_id = "dikaanhdjgmmeajanfokkalonmnpfidm";

  const INTERVAL_MS = 1000;
  const MAX_FUTURE_GAME_MS = 7 * 24 * 60 * 60 * 1000;

  var cache = {};

  var data = undefined;

  var saved = undefined;

  function clog(t) {
    console.log(t);
    return t;
  }

  function main() {
    if (location.pathname === "/football/fantasycast") return;
    return new Promise((resolve, reject) =>
      chrome.runtime
        ? vegas()
            .then((_data) => (data = _data))
            .then(resolve)
        : data !== undefined
        ? resolve(data)
        : reject("chrome.runtime not defined")
    )
      .then(inject)
      .then(() => setTimeout(main, INTERVAL_MS));
  }

  function vegas() {
    return fetchC(
      "https://sportsbook-nash.draftkings.com/api/sportscontent/navigation/dkusny/v1/nav/leagues/88808?format=json",
      12 * 60 * 60 * 1000 // 12 hours
    )
      .then(({ events }) =>
        events.filter(
          ({ startDate }) =>
            new Date(startDate) - Date.now() < MAX_FUTURE_GAME_MS
        )
      )
      .then((events) =>
        events.flatMap(({ eventId }) =>
          [1000, 1001, 1002, 1003, 1342].map((categoryId) =>
            fetchC(
              `https://sportsbook-nash.draftkings.com/api/sportscontent/dkusny/v1/events/${eventId}/categories/${categoryId}`,
              15 * 60 * 1000 // 15 minutes
            )
          )
        )
      )
      .then((promises) => Promise.all(promises))
      .then((events) =>
        events.filter(Boolean).flatMap(({ selections, markets }) =>
          (selections || [])
            .filter(({ participants }) => participants)
            .map((s) => ({
              outcomeType: s.outcomeType,
              odds: s.trueOdds,
              participant: s.participants.find((p) => p.type === "Player")
                ?.name,
              points: s.points,
              s,
              ...markets
                .map((m) => ({
                  name: m.name,
                  eventId: m.eventId,
                  marketTypeName: m.marketType.name,
                  m,
                }))
                .find(({ m }) => m.id === s.marketId),
              // participant: participants[0],
              // startDate: event.startDate,
              // eventName: event.name,
              // name,
              // label,
              // participant,
              // line,
              // oddsDecimal,
              // sublabel: outcome.label,
            }))
        )
      )
      .then((events) => (data === undefined && console.log(events)) || events);
  }

  function inject(events, clicked) {
    return Promise.resolve()
      .then(() => document.getElementsByClassName("player-column__bio"))
      .then(Array.from)
      .then((arr) =>
        arr
          .map((bio) => ({
            aE: bio.getElementsByTagName("a")[0],
            posE: bio.getElementsByClassName("playerinfo__playerpos")[0],
          }))
          .filter(({ aE }) => aE)
          .map((o) => ({ ...o, name: getName(o.aE) }))
          .map((o) => ({
            raw: getRaw(o.name, events),
            ...o,
          }))
          .filter(({ aE, name, raw }) => {
            if (raw.length > 0) return true;
            if (aE.innerText !== name) {
              posE.innerText = "";
            }
            return false;
          })
          .map((o) => ({
            scores: getScores(o.raw),
            ...o,
          }))
          .filter(({ scores }) => scores !== null)
          .map((o) => ({
            text: getText(o.scores),
            ...o,
          }))
          .map((o) => ({
            title: `${o.text}\n${getTitle(o.scores)}`,
            ...o,
          }))
          .filter(({ aE, title }) => clicked || aE.title !== title)
          .map(({ name, scores, title, raw, aE, posE, text }) => {
            if (
              clicked ||
              location.href.match("https://fantasy.espn.com/football/team")
            ) {
              posE.innerText = text;
            }
            posE.onclick = () => {
              inject(events, true);
            };
            aE.setAttribute("fantasy420_name", name);
            posE.style.backgroundColor = "lightgreen";
            aE.title = title;
            return { startDate: raw[0].startDate, name, scores };
          })
      )
      .then(persist);
  }

  function getName(a) {
    const grandparent = a.parentElement.parentElement;
    if (grandparent.classList.contains("player-column__athlete"))
      return grandparent.title;
    const name = a.getAttribute("fantasy420_name");
    if (name) return name;
    return a.innerText;
  }

  function getRaw(player_name, events) {
    if (player_name.endsWith("D/ST")) {
      return [];
    }
    return events
      .filter(({ outcomeType }) => outcomeType !== "Under")
      .filter(({ participant }) =>
        participant
          ?.replace("Gabriel Davis", "Gabe Davis")
          .replace("D.J. Moore", "DJ Moore")
          .replace(/ \(.*\)$/, "")
          .includes(player_name)
      );
  }

  function getScores(raw) {
    const firstEvent = raw[0].eventId;
    raw = raw.filter((r) => r.eventId === firstEvent);
    const touchdownOdds = raw.find(
      ({ marketTypeName }) => marketTypeName === "Anytime Touchdown Scorer"
    )?.odds;
    var scores = {
      passing: raw.find(
        ({ marketTypeName }) => marketTypeName === "Passing Yards O/U"
      )?.points,
      interceptions: raw.find(
        ({ marketTypeName }) => marketTypeName === "Interceptions Thrown O/U"
      )?.points,
      passingTd: raw.find(
        ({ marketTypeName }) => marketTypeName === "Passing Touchdowns O/U"
      )?.points,
      touchdowns: getTouchdowns(touchdownOdds),
      touchdownOdds: touchdownOdds && ((1 / touchdownOdds) * 1.1).toFixed(2),
      rushing: raw.find(
        ({ marketTypeName }) => marketTypeName === "Rushing Yards O/U"
      )?.points,
      receiving: raw.find(
        ({ marketTypeName }) => marketTypeName === "Receiving Yards O/U"
      )?.points,
      receptions: raw.find(
        ({ marketTypeName }) => marketTypeName === "Receptions O/U" // TODO BROKEN?
      )?.points,
      kickingPoints: raw.find(
        ({ marketTypeName }) => marketTypeName === "Kicking Points O/U"
      )?.points,
    };
    scores = Object.fromEntries(
      Object.entries(scores).filter(([_, val]) => val)
    );
    if (Object.keys(scores).length === 0) return null;
    scores.score = (
      (6 * scores.touchdowns || 0) +
      (-2 * scores.interceptions || 0) +
      (4 * scores.passingTd || 0) +
      (0.04 * scores.passing || 0) +
      (0.1 * scores.rushing || 0) +
      (0.1 * scores.receiving || 0) +
      (scores.receptions || 0) +
      (scores.kickingPoints || 0)
    ).toFixed(2);
    return scores;
  }

  function getTouchdowns(oddsDecimal) {
    const prob = (1 / oddsDecimal) * 1.1;
    const touchdowns = -Math.log(1 - prob);
    return parseFloat(touchdowns.toFixed(2));
  }

  function getTitle(raw) {
    return Object.entries(raw)
      .map(([key, val]) => `${key}: ${val}`)
      .join("\n");
  }

  function getText(scores) {
    return [
      scores.score,
      Object.keys(scores)
        .filter((key) => !["touchdownOdds", "score"].includes(key))
        .map(
          (key) =>
            ({
              passing: "Py",
              interceptions: "I",
              passingTd: "PT",
              rushing: "RSHy",
              receiving: "R",
              receptions: "RCPy",
              touchdowns: "TD",
              kickingPoints: "K",
            }[key] || "X")
        )
        .join("_"),
    ].join(" ");
  }

  function fetchC(url, maxAgeMs) {
    const cached = cache[url];
    const now = Date.now();
    if (now - cached?.timestamp < maxAgeMs) return Promise.resolve(cached.json);
    return new Promise((resolve) =>
      chrome.runtime.sendMessage(
        extension_id,
        { fetch: { url, maxAgeMs, json: true } },
        (response) => resolve(response)
      )
    ).then((json) => {
      cache[url] = { timestamp: now, json };
      return json;
    });
  }

  function persist(toPersist) {
    if (!chrome.runtime) return;
    const toSave = JSON.stringify(toPersist);
    if (toSave === saved) return;
    saved = toSave;

    const extension_id = "dikaanhdjgmmeajanfokkalonmnpfidm";

    const now = new Date();

    return new Promise((resolve) =>
      chrome.runtime.sendMessage(
        extension_id,
        { storage: { action: "get", keys: ["vegas"] } },
        function (response) {
          resolve(response);
        }
      )
    )
      .then((response) => response.vegas || {})
      .then((vegas) => {
        toPersist
          .filter(({ name, startDate }) => {
            if (now < new Date(startDate)) return true;
            console.log(name, vegas[name]);
            return false;
          })
          .forEach(({ name, startDate, scores }) => {
            if (!vegas[name]) vegas[name] = {};
            vegas[name][startDate] = {
              date: new Date().toLocaleString(),
              ...scores,
            };
            console.log(name, vegas[name]);
          });
        return vegas;
      })
      .then(
        (vegas) =>
          new Promise((resolve) =>
            chrome.runtime.sendMessage(
              extension_id,
              { storage: { action: "save", save: { vegas } } },
              function (response) {
                resolve(response);
              }
            )
          )
      );
  }

  main();
})();
