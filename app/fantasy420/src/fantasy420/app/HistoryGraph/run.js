function findALeague(start, size) {
  return Promise.resolve()
    .then(() =>
      Array.from(new Array(size))
        .map((_, i) => start + i)
        .map((leagueId) =>
          fetch(
            `https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/2023/segments/0/leagues/${leagueId}?view=kona_playercard`,
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
          ).then((resp) => resp.json())
        )
    )
    .then((ps) => Promise.all(ps))
    .then(JSON.stringify)
    .then((str) => str.slice(0, 1000))
    .then(console.log);
}

findALeague(203836968, 1);
