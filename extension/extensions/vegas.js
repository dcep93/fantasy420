(() => {
  const extension_id = "codiminongikfnidmdkpmeigapidedgn";

  const INTERVAL_MS = 1000;
  const MAX_FUTURE_GAME_MS = 7 * 24 * 60 * 60 * 1000;

  var cache = {};

  var data = undefined;

  function log(val) {
    console.log(val);
    return val;
  }

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
                    ({ participant, line, oddsFractional, ...outcome }) => ({
                      eventName: event.name,
                      name,
                      label,
                      participant,
                      line,
                      oddsFractional,
                      sublabel: outcome.label,
                    })
                  )
                )
            )
          )
        )
      );
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
      )
      .then((arr) =>
        arr.map(({ name, ...o }) => ({
          name,
          raw: getRaw(name, events),
          ...o,
        }))
      )
      .then((arr) => arr.map(({ a, raw }) => (a.title = getTitle(raw))));
  }

  function getRaw(player_name, events) {
    return events
      .filter(({ sublabel }) => sublabel === "Over")
      .filter(({ name }) => name !== "Popular")
      .filter((event) => JSON.stringify(event).includes(player_name))
      .map(({ label, line }) => `${label}: ${line}`);
  }

  function getTitle(raw) {
    return JSON.stringify(raw, null, 2);
  }

  function fetchC(url, maxAgeMs) {
    const cached = cache[url];
    const now = Date.now();
    if (now - cached?.timestamp < maxAgeMs) return Promise.resolve(cached.json);
    return new Promise((resolve) =>
      chrome.runtime.sendMessage(
        extension_id,
        { fetch: { url, maxAgeMs, json: true } },
        function (response) {
          resolve(response);
        }
      )
    ).then((json) => {
      cache[url] = { timestamp: now, json };
      return json;
    });
  }

  main();
})();
