export default function regenerate() {
  function groupByF<T>(ts: T[], f: (t: T) => string): { [key: string]: T[] } {
    return ts.reduce((prev, curr) => {
      const key = f(curr);
      if (!prev[key]) prev[key] = [];
      prev[key]!.push(curr);
      return prev;
    }, {} as { [key: string]: T[] });
  }

  function clog<T>(t: T): T {
    console.log(t);
    return t;
  }

  //   const leagueId = 203836968;

  return Promise.resolve()
    .then(() =>
      [
        2004, //
        2005,
        2006,
        2007,
        2008,
        2009,
        2010,
        2011,
        2012,
        2013,
        2014,
        2015,
        2016,
        2017,
        2018,
        2019,
        2020,
        2021,
        2022,
        2023,
      ].map((year) =>
        fetch(
          `https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/${year}/players?scoringPeriodId=0&view=kona_playercard`,
          // `https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/${year}/segments/0/leagues/${leagueId}?view=kona_playercard`,
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
            credentials: "include",
          }
        )
          .then((resp) => resp.json())
          .then(
            (
              json: {
                id: number;
                fullName: string;
                defaultPositionId: number;
                stats: {
                  scoringPeriodId: number;
                  statSourceId: number;
                  stats: { [key: string]: number };
                }[];
              }[]
            ) => [
              year,
              Object.fromEntries(
                Object.entries(
                  groupByF(
                    json
                      .map(({ defaultPositionId, id, fullName, stats }) => ({
                        year,
                        position: {
                          1: "QB",
                          2: "RB",
                          3: "WR",
                          4: "TE",
                          5: "K",
                          16: "DST",
                        }[defaultPositionId]!,
                        id,
                        fullName,
                        stats: (stats || []).filter(
                          ({ statSourceId }) => statSourceId === 0
                        ),
                      }))
                      .filter(({ position }) => position !== undefined)
                      .map(({ ...p }) => ({
                        ...p,
                        total: p.stats
                          .flatMap((s) => Object.values(s.stats))
                          .reduce((a, b) => a + b, 0),
                        weeks: Object.fromEntries(
                          p.stats.map(({ scoringPeriodId, stats }) => [
                            scoringPeriodId,
                            Object.keys(stats).length > 0,
                          ])
                        ),
                      }))
                      .map(({ stats, ...p }) =>
                        p.position !== "DST"
                          ? p
                          : {
                              ...p,
                              defence: Object.fromEntries(
                                stats.map(({ scoringPeriodId, stats }) => [
                                  scoringPeriodId,
                                  {
                                    yardsAllowed: stats["127"],
                                    pointsAllowed: stats["187"],
                                  },
                                ])
                              ),
                            }
                      ),
                    (p) => p.position
                  )
                ).map(([position, players]) => [
                  position,
                  players.sort((a, b) => b.total - a.total),
                ])
              ),
            ]
          )
      )
    )
    .then((ps) => Promise.all(ps))
    .then((arr) => Object.fromEntries(arr))
    .then(clog);
}
