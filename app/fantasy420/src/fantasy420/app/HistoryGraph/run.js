function findALeague(start, size, numTickets, year) {
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
    if (resolve) setTimeout(resolve, 1000);
    return t;
  }

  var foundLeagueId = null;
  var errors = 0;
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
              errors++;
            })
        )
    )
    .then((ps) => Promise.all(ps))
    .then(() => ({ foundLeagueId, year, errors }))
    .then(JSON.stringify)
    .then(console.log);
}

// 203836968
findALeague(1, 10000, 50, 2021);
new Promise((resolve) => setTimeout(resolve, 60 * 60 * 1000));
