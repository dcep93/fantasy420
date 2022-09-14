(() => {
  const extension_id = "codiminongikfnidmdkpmeigapidedgn";

  const INTERVAL_MS = 1000;
  const MAX_FUTURE_GAME_MS = 7 * 24 * 60 * 60 * 1000;

  var cache = {};

  var data = undefined;

  function main() {
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
        events.flatMap(({ event, eventCategories }) =>
          eventCategories.flatMap(({ name, componentizedOffers }) =>
            componentizedOffers.flatMap(({ offers }) =>
              offers
                .flatMap((offers) => offers)
                .flatMap(({ label, outcomes }) =>
                  outcomes.flatMap(
                    ({ participant, line, oddsDecimal, ...outcome }) => ({
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
          .map((a) => ({ a, name: a.innerText }))
          .map(({ name, ...o }) => ({
            name,
            raw: getRaw(name, events),
            ...o,
          }))
          .filter(({ raw }) => raw.length > 0)
          .map(({ raw, ...o }) => ({
            scores: getScores(raw),
            ...o,
          }))
          .map(({ scores, ...o }) => ({
            scores,
            title: getTitle(scores),
            ...o,
          }))
          .filter(({ title, a }) => a.title !== title)
          .forEach(({ scores, title, a }) => {
            a.innerText = `(${scores.score}) ${a.innerText}`;
            a.style.backgroundColor = "lightgreen";
            a.title = title;
          })
      );
  }

  function getRaw(player_name, events) {
    if (player_name.endsWith("D/ST")) {
      return [];
    }
    return events
      .filter(({ sublabel }) => sublabel !== "Under")
      .filter(({ name }) => name !== "Popular")
      .filter(({ participant, sublabel }) =>
        [participant, sublabel].includes(player_name)
      );
  }

  function getScores(raw) {
    const firstEvent = raw[0].eventName;
    raw = raw.filter(({ eventName }) => eventName === firstEvent);
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
      touchdowns: getTouchdowns(
        raw.find(({ label }) => label === "Anytime Touchdown Scorer")
          ?.oddsDecimal
      ),
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
    const prob = (oddsDecimal / (1 + oddsDecimal)) * 1.1;
    const touchdowns = -Math.log(1 - prob);
    return parseFloat(touchdowns.toFixed(2));
  }

  function getTitle(raw) {
    return Object.entries(raw)
      .map(([key, val]) => `${key}: ${val}`)
      .join("\n");
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

  main();
})();
