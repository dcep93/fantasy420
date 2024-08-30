const numTickets = 10;
const tickets = Array.from(new Array(numTickets)).map((_) => null);
const queue = [];
function takeTicket() {
  const ticket = tickets.pop();
  if (ticket === undefined) {
    return new Promise((resolve) => queue.push(resolve));
  }
}

function releaseTicket(t) {
  tickets.push(null);
  const resolve = queue.pop();
  if (resolve) resolve();
  return t;
}

function findALeague(start, size) {
  var foundLeagueId = null;
  var year = 2024;
  return Promise.resolve()
    .then(() =>
      Array.from(new Array(size))
        .map((_, i) => start + i)
        .map((leagueId) =>
          Promise.resolve()
            .then(takeTicket)
            .then(() =>
              fetch(
                `https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/${
                  year - 1
                }/segments/0/leagues/${leagueId}?view=kona_playercard`,
                {
                  headers: {
                    accept: "application/json",
                    "x-fantasy-filter": JSON.stringify({
                      players: {
                        filterSlotIds: {
                          value: [16],
                        },
                        filterStatsForTopScoringPeriodIds: {
                          value: 17,
                        },
                      },
                    }),
                    "x-fantasy-platform":
                      "kona-PROD-5b4759b3e340d25d9e1ae248daac086ea7c37db7",
                    "x-fantasy-source": "kona",
                  },
                }
              )
            )
            .then((resp) => resp.json())
            .then(releaseTicket)
            .then((resp) => {
              if (resp.messages === undefined) {
                foundLeagueId = leagueId;
                year = year - 1;
              }
            })
            .catch((e) => {
              console.log(e);
            })
        )
    )
    .then((ps) => Promise.all(ps))
    .then(() => ({ foundLeagueId, year }))
    .then(JSON.stringify)
    .then(console.log);
}

findALeague(203836968, 1);
