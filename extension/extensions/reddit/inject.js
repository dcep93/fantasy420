const INTERVAL_MS = 100;

function main() {
  return Promise.resolve()
    .then(() => (chrome.runtime && run()) || console.log("no chrome runtime"))
    .then(() => setTimeout(main, INTERVAL_MS));
}

function run() {
  return get_from_storage().then(inject);
}

function inject(data) {
  const playerCard = document.getElementsByClassName("player-card-center")[0];
  if (!playerCard) return;
  var div = playerCard.getElementsByClassName("extension_div")[0];
  if (!div) {
    div = document.createElement("div");
    div.classList = ["extension_div"];
    playerCard.appendChild(div);
  }
  return Promise.resolve(playerCard.getElementsByTagName("a"))
    .then(Array.from)
    .then((es) => es.map((e) => e.getAttribute("href")))
    .then((hrefs) =>
      hrefs.find((href) =>
        href?.startsWith("https://www.espn.com/nfl/player/stats/_/id/")
      )
    )
    .then((href) => {
      if (!href) return;
      const playerId = href.split("_/id/")[1].split("/")[0];
      const innerHTML = Object.values(data.players[playerId] || {})
        .filter(({ redditId }) => redditId)
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .map(
          ({ redditId, title, timestamp }) =>
            `<div style="padding: 10px"><div><div>${new Date(
              timestamp
            )}</div><a href="https://www.reddit.com/r/fantasyfootball/comments/${
              redditId.split("_")[1]
            }">${title}</a></div></div>`
        )
        .join("\n");
      if (div.innerHTML !== innerHTML) {
        console.log(data);
        div.innerHTML = innerHTML;
      }
    });
}

main();
