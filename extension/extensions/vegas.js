(() => {
  const extension_id = "codiminongikfnidmdkpmeigapidedgn";

  const INTERVAL_MS = 1000;
  const MAX_FUTURE_GAME_MS = 7 * 24 * 60 * 60 * 1000;

  var cache = {};

  var data = undefined;

  var saved = undefined;

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
      "https://sportsbook-us-ny.draftkings.com//sites/US-NY-SB/api/v5/eventgroups/88808?format=json",
      12 * 60 * 60 * 1000 // 12 hours
    )
      .then(({ eventGroup }) => eventGroup)
      .then(({ events }) =>
        events.filter(
          ({ startDate }) =>
            new Date(startDate) - Date.now() < MAX_FUTURE_GAME_MS
        )
      )
      .then((events) =>
        events.map(({ eventId }) =>
          fetchC(
            `https://sportsbook-us-ny.draftkings.com//sites/US-NY-SB/api/v3/event/${eventId}?format=json`,
            15 * 60 * 1000 // 15 minutes
          )
        )
      )
      .then((promises) => Promise.all(promises))
      .then((events) =>
        events.filter(Boolean).flatMap(({ event, eventCategories }) =>
          eventCategories.flatMap(({ name, componentizedOffers }) =>
            componentizedOffers.flatMap(({ offers }) =>
              offers
                .flatMap((offers) => offers)
                .flatMap(({ label, outcomes }) =>
                  outcomes.flatMap(
                    ({ participant, line, oddsDecimal, ...outcome }) => ({
                      startDate: event.startDate,
                      eventName: event.name,
                      name,
                      label,
                      participant,
                      line,
                      oddsDecimal,
                      sublabel: outcome.label,
                    })
                  )
                )
            )
          )
        )
      )
      .then((events) => (data === undefined && console.log(events)) || events);
  }

  function inject(events) {
    return Promise.resolve()
      .then(() => document.getElementsByClassName("player-column__bio"))
      .then(Array.from)
      .then((arr) =>
        arr
          .map((bio) => bio.getElementsByTagName("a")[0])
          .filter(Boolean)
          .map((a) => ({ a, name: getName(a) }))
          .map(({ name, ...o }) => ({
            name,
            raw: getRaw(name, events),
            ...o,
          }))
          .filter(({ a, name, raw }) => {
            if (raw.length > 0) return true;
            if (a.innerText !== name) {
              a.innerText = name;
              a.style.backgroundColor = "";
              a.title = name;
            }
            return false;
          })
          .map(({ raw, ...o }) => ({
            raw,
            scores: getScores(raw),
            ...o,
          }))
          .map(({ scores, ...o }) => ({
            scores,
            title: getTitle(scores),
            ...o,
          }))
          .filter(({ title, a }) => a.title !== title)
          .map(({ name, scores, title, raw, a }) => {
            a.setAttribute("fantasy420_name", name);
            a.innerText = `(${getText(scores)}) ${name}`;
            a.style.backgroundColor = "lightgreen";
            a.title = title;
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
      .filter(({ sublabel }) => sublabel !== "Under")
      .filter(({ name }) => name !== "Popular")
      .filter(({ name }) => name !== "H2H Player Matchups")
      .filter(({ participant, sublabel }) =>
        [participant, sublabel]
          .map((name) =>
            name?.replace("Gabriel Davis", "Gabe Davis").replace(" (BAL)", "")
          )
          .includes(player_name)
      );
  }

  function getScores(raw) {
    const firstEvent = raw[0].eventName;
    raw = raw.filter(({ eventName }) => eventName === firstEvent);
    const touchdownOdds = raw.find(
      ({ label }) => label === "Anytime Touchdown Scorer"
    )?.oddsDecimal;
    var scores = {
      passing: raw.find(
        ({ label, participant }) => label === `${participant} Passing Yards`
      )?.line,
      interceptions: raw.find(
        ({ label, participant }) => label === `${participant} Interceptions`
      )?.line,
      passingTd: raw.find(
        ({ label, participant }) =>
          label === `${participant} Passing Touchdowns`
      )?.line,
      rushing: raw.find(
        ({ label, participant }) => label === `${participant} Rushing Yards`
      )?.line,
      receiving: raw.find(
        ({ label, participant }) => label === `${participant} Receiving Yards`
      )?.line,
      receptions: raw.find(
        ({ label, participant }) => label === `${participant} Receptions`
      )?.line,
      touchdowns: getTouchdowns(touchdownOdds),
      touchdownOdds: touchdownOdds && ((1 / touchdownOdds) * 1.1).toFixed(2),
      fieldGoals: raw.find(
        ({ label, participant }) => label === `${participant} Field Goal Made`
      )?.line,
    };
    scores = Object.fromEntries(
      Object.entries(scores).filter(([_, val]) => val)
    );
    scores.score = (
      (6 * scores.touchdowns || 0) +
      (-2 * scores.interceptions || 0) +
      (4 * scores.passingTd || 0) +
      (0.04 * scores.passing || 0) +
      (0.1 * scores.rushing || 0) +
      (0.1 * scores.receiving || 0) +
      (scores.receptions || 0) +
      (3 * scores.fieldGoals || 0)
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
              passing: "P",
              interceptions: "I",
              passingTd: "4",
              rushing: "B",
              receiving: "W",
              receptions: "R",
              touchdowns: "T",
              fieldGoals: "F",
            }[key] || "X")
        )
        .join(""),
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

    const extension_id = "codiminongikfnidmdkpmeigapidedgn";

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
