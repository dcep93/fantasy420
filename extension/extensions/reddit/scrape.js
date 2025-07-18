(() => {
  const INTERVAL_MS = 1000;

  var data = undefined;

  function main() {
    return new Promise((resolve, reject) =>
      chrome.runtime
        ? get_from_storage("reddit")
            .then(
              (_data) =>
                (data =
                  _data && _data.players
                    ? _data
                    : {
                        posts: {},
                        players: {},
                        fetched: { timestamp: -1 },
                      })
            )
            .then(resolve)
        : data !== undefined
        ? resolve(data)
        : reject("chrome.runtime not defined")
    )
      .then(loadPlayers)
      .then(transform)
      .then(() => setTimeout(main, INTERVAL_MS))
      .catch((e) => alert(e));
  }

  function clean(str) {
    return str
      .toLowerCase()
      .replaceAll(/[^a-z ]/g, "")
      .replaceAll(/\./g, "")
      .replaceAll(/ jr\b/g, "")
      .replaceAll(/ sr\b/g, "")
      .replaceAll(/ i+\b/g, "")
      .replaceAll(/\bgabe davis\b/g, "gabriel davis")
      .replaceAll(/\bcmc\b/g, "christian mccaffrey");
  }

  function transform() {
    return Promise.resolve()
      .then(() => document.getElementsByClassName("sitetable"))
      .then(Array.from)
      .then((tables) =>
        tables.map((table) =>
          Promise.resolve(table)
            .then((table) => table.children)
            .then(Array.from)
            .then((children) =>
              children
                .filter(
                  (e) =>
                    e.classList.contains("thing") &&
                    !e.classList.contains("comment") &&
                    !e.classList.contains("morechildren")
                )
                .filter((e) => {
                  if (!e.classList.contains("promoted")) {
                    const author = e.getElementsByClassName("author")[0];
                    if (
                      !["FFBot", "FantasyMod", "AutoModerator"].includes(
                        author?.innerText
                      )
                    ) {
                      return true;
                    }
                  }
                  table.removeChild(e);
                  return false;
                })
                .map((e) => transformPost(e, table))
            )
            .then((promises) => Promise.all(promises))
        )
      )
      .then((promises) => Promise.all(promises))
      .then(saveData);
  }

  function saveData(passThrough) {
    return save_to_storage({ reddit: data }).then(() => passThrough);
  }

  function transformPost(e, table) {
    const redditId = e.getAttribute("data-fullname");

    const wrapper = document.createElement("div");
    wrapper.style.padding = "3px";
    table.replaceChild(wrapper, e);

    const playersDiv = document.createElement("div");
    wrapper.appendChild(playersDiv);

    const controls = document.createElement("span");
    controls.innerText = `${
      e.getElementsByClassName("comments")[0]?.innerText
    } - ${redditId}`;
    controls.onclick = () => {
      if (!data.posts[redditId]) data.posts[redditId] = {};
      console.log(`toggling ${redditId} ${data.posts[redditId].hidden}`);
      data.posts[redditId].hidden = !data.posts[redditId].hidden;
      updateHidden(e, redditId);
      saveData();
    };
    wrapper.appendChild(controls);

    const timestamp = e.getElementsByTagName("time")[0]?.title;
    if (!timestamp) return;

    const postTitle = e.querySelector("a.title").innerText;
    boxdiv = getBoxDiv(playersDiv, redditId, postTitle, timestamp);
    e.appendChild(boxdiv);

    var p = Promise.resolve();
    if (data.posts[redditId] === undefined) {
      p = p.then(() => read(postTitle, redditId, playersDiv, timestamp));
    } else {
      updateHidden(e, redditId);
      p = p.then(() => updatePlayers(playersDiv, redditId));
    }
    wrapper.appendChild(e);
    return p.then(() => e);
  }

  function getBoxDiv(playersDiv, redditId, title, timestamp) {
    const boxdiv = document.createElement("div");
    const box = document.createElement("input");
    const boxplayers = document.createElement("span");
    boxdiv.appendChild(box);
    boxdiv.appendChild(boxplayers);
    box.onkeyup = (e) => {
      if (e.key === "Enter") {
        boxplayers.children[0].click();
        return;
      }
      Promise.resolve(data.fetched.playerBank)
        .then(Object.values)
        .then((players) =>
          players
            .filter((p) => clean(p.n).includes(clean(box.value)))
            .sort((a, b) => b.o - a.o)
            .slice(0, 10)
            .map((p) => {
              const d = document.createElement("div");
              d.innerText = `${p.o.toFixed(2)} ${p.n}`;
              d.onclick = () => {
                console.log(`adding ${p.id} to ${redditId}`);
                boxplayers.replaceChildren();
                box.value = "";
                if (!data.posts[redditId].players)
                  data.posts[redditId].players = {};
                data.posts[redditId].players[p.id] = new Date().getTime();
                data.players[p.id] = Object.assign(data.players[p.id] || {}, {
                  [redditId]: {
                    redditId,
                    title,
                    timestamp,
                  },
                });
                updatePlayers(playersDiv, redditId);
                saveData();
              };
              return d;
            })
        )
        .then((playerDivs) => boxplayers.replaceChildren(...playerDivs));
    };
    return boxdiv;
  }

  function read(title, redditId, playersDiv, timestamp) {
    return Promise.resolve(data.fetched.playerBank)
      .then(Object.values)
      .then((players) =>
        players.filter((p) => clean(title).includes(clean(p.n)))
      )
      .then((players) => players.sort((a, b) => a.o - b.o).map((p) => [p.n, p]))
      .then(Object.fromEntries)
      .then(Object.values)
      .then((players) => {
        players.length &&
          console.log(`reading ${players.map((p) => p.n)} to ${redditId}`);
        return players;
      })
      .then((players) => players.map((p) => [p.id, new Date().getTime()]))
      .then(Object.fromEntries)
      .then((players) => {
        data.posts[redditId] = { players };
        return players;
      })
      .then(Object.keys)
      .then((p) =>
        p.map(
          (playerId) =>
            (data.players[playerId] = Object.assign(
              data.players[playerId] || {},
              {
                [redditId]: {
                  redditId,
                  title,
                  timestamp,
                },
              }
            ))
        )
      )
      .then(() => updatePlayers(playersDiv, redditId));
  }

  function updateHidden(e, redditId) {
    if (!location.href.includes("/comments/"))
      e.style.display = data.posts[redditId].hidden ? "none" : "";
  }

  function updatePlayers(playersDiv, redditId) {
    return Promise.resolve(data.posts[redditId].players)
      .then(Object.keys)
      .then((players) =>
        players.map((playerId) => {
          const d = document.createElement("span");
          d.style.paddingRight = "10px";
          d.innerText = `${
            data.fetched.playerBank[playerId].n
          }/${data.fetched.playerBank[playerId].o?.toFixed(2)}`;
          d.title = Object.keys(data.players[playerId]);
          d.onclick = () => {
            console.log(`removing ${playerId} from ${redditId}`);
            delete data.posts[redditId].players[playerId];
            const redditIds = data.players[playerId];
            delete redditIds[redditId];
            updatePlayers(playersDiv, redditId);
            saveData();
          };
          return d;
        })
      )
      .then((playerDivs) => playersDiv.replaceChildren(...playerDivs));
  }

  function loadPlayers() {
    const currentYear = 2025;

    const timestamp = new Date().getTime();
    // 6 hours
    if (data.fetched.timestamp > timestamp - 6 * 60 * 60 * 1000)
      return Promise.resolve();
    console.log("fetching", data.fetched.timestamp);
    return fetch(
      `https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/${currentYear}/players?scoringPeriodId=0&view=players_wl`,
      {
        headers: {
          "x-fantasy-filter": '{"filterActive":{"value":true}}',
        },
      }
    )
      .then((resp) => resp.json())
      .then((resp) =>
        resp.map(({ fullName, id, ownership }) => [
          id,
          {
            n: fullName,
            id,
            o: ownership?.percentOwned,
          },
        ])
      )
      .then(Object.fromEntries)
      .then((playerBank) => (data.fetched = { playerBank, timestamp }))
      .then(saveData);
  }

  // chrome.storage.local.clear(run);
  main();
})();
