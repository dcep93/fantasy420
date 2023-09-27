function FetchWrapped() {
  const year = 2023;
  const leagueId =
    new URL(window.document.location.href).searchParams.get("leagueId") ||
    203836968;
  function fromEntries(arr) {
    return Object.fromEntries(
      arr.filter((a) => a !== undefined).map((a) => [a.key, a.value])
    );
  }
  function clog(t) {
    console.log(t);
    return t;
  }
  return Promise.resolve()
    .then(() => [
      Promise.resolve()
        .then(() =>
          fetch(
            `https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/${year}/segments/0/leagues/${leagueId}?view=kona_playercard`,
            {
              headers: {
                accept: "application/json",
                "x-fantasy-filter": JSON.stringify({
                  players: {
                    filterStatsForTopScoringPeriodIds: {
                      value: 17,
                      additionalValue: [`00${year}`],
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
            .then((resp) =>
              resp.players
                .map((player) => player.player)
                .filter(
                  (player) => player.proTeamId !== 0 || player.onTeamId !== 0
                )
                .map((player) => ({
                  id: player.id.toString(),
                  nflTeamId: player.proTeamId.toString(),
                  name: player.fullName,
                  position:
                    { 1: "QB", 2: "RB", 3: "WR", 4: "TE", 5: "K", 16: "DST" }[
                      player.defaultPositionId
                    ] || player.defaultPositionId.toString(),
                  total: player.stats.find((stat) => stat.scoringPeriodId === 0)
                    .appliedTotal,
                  average: player.stats.find(
                    (stat) => stat.scoringPeriodId === 0
                  ).appliedAverage,
                  scores: fromEntries(
                    player.stats
                      .filter((stat) => stat.seasonId === year)
                      .map((stat) => ({
                        key: stat.scoringPeriodId.toString(),
                        value: parseFloat(stat.appliedTotal.toFixed(2)),
                      }))
                  ),
                }))
                .map((player) => ({ key: player.id, value: player }))
            )
            .then((playersArr) => fromEntries(playersArr))
        )
        .then((players) => players),
      Promise.resolve()
        .then(() =>
          fetch(
            `https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/${year}/segments/0/leagues/${leagueId}?view=mRoster`
          )
            .then((resp) => resp.json())
            .then((resp) =>
              Promise.resolve()
                .then(() =>
                  Array.from(new Array(resp.status.latestScoringPeriod))
                    .map((_, i) => i + 1)
                    .map((weekNum) =>
                      fetch(
                        `https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/${year}/segments/0/leagues/${leagueId}?view=mScoreboard&scoringPeriodId=${weekNum}`,
                        { credentials: "include" }
                      )
                        .then((resp) => resp.json())
                        .then((resp) =>
                          Promise.resolve()
                            .then(() =>
                              resp.teams.map((team) => ({
                                id: team.id.toString(),
                                name: team.name,
                                schedule: {
                                  weekNum,
                                  ...resp.schedule
                                    .flatMap((matchup) => [
                                      matchup.home,
                                      matchup.away,
                                    ])
                                    .find(
                                      (s) =>
                                        s.rosterForCurrentScoringPeriod &&
                                        s.teamId === team.id
                                    ),
                                },
                              }))
                            )
                            .then((week) =>
                              fromEntries(
                                week.map((team) => ({
                                  key: team.id,
                                  value: team,
                                }))
                              )
                            )
                        )
                    )
                )
                .then((ps) => Promise.all(ps))
                .then((weeks) =>
                  Object.values(weeks[0]).map((team) => ({
                    id: team.id,
                    name: team.name,
                    rosters: fromEntries(
                      weeks
                        .map((week) => week[team.id].schedule)
                        .filter((s) => s.rosterForCurrentScoringPeriod)
                        .map((s) => ({
                          weekNum: s.weekNum.toString(),
                          starting: s.rosterForMatchupPeriod.entries.map((e) =>
                            e.playerId.toString()
                          ),
                          rostered: s.rosterForCurrentScoringPeriod.entries.map(
                            (e) => e.playerId.toString()
                          ),
                        }))
                        .concat({
                          weekNum: "0",
                          starting: [],
                          rostered: resp.teams
                            .find((t) => t.id.toString() === team.id)
                            .roster.entries.map((e) => e.playerId.toString()),
                        })
                        .map((roster) => ({
                          key: roster.weekNum,
                          value: roster,
                        }))
                    ),
                  }))
                )
            )
            .then((teams) =>
              fromEntries(teams.map((team) => ({ key: team.id, value: team })))
            )
        )
        .then((teams) => teams),
      Promise.resolve()
        .then(() =>
          fetch(
            `https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/${year}/segments/0/leagues/${leagueId}?view=mMatchupScore&view=mSettings`,
            { credentials: "include" }
          )
            .then((resp) => resp.json())
            .then((resp) =>
              Array.from(
                new Array(resp.settings.scheduleSettings.matchupPeriodCount)
              )
                .map((_, i) => i + 1)
                .map((matchupPeriodId) => ({
                  key: matchupPeriodId.toString(),
                  value: resp.schedule
                    .filter((s) => s.matchupPeriodId === matchupPeriodId)
                    .map((s) =>
                      [s.home, s.away].map((t) => t.teamId.toString())
                    ),
                }))
            )
            .then((matchups) => fromEntries(matchups))
        )
        .then((ffMatchups) => ffMatchups),
      Promise.resolve()
        .then(() =>
          fetch(
            `https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/${year}?view=proTeamSchedules_wl`
          )
            .then((resp) => resp.json())
            .then((resp) =>
              resp.settings.proTeams.map((p) => ({
                id: p.id.toString(),
                name: p.name,
                byeWeek: p.byeWeek,
                proGamesByScoringPeriod: fromEntries(
                  Object.entries(p.proGamesByScoringPeriod)
                    .filter(([_, o]) => o[0].statsOfficial)
                    .map(([scoringPeriod, o]) => ({
                      key: scoringPeriod,
                      value: o[0].id,
                    }))
                ),
              }))
            )
            .then((nflTeams) =>
              Promise.resolve()
                .then(() =>
                  nflTeams.flatMap((team) =>
                    Object.values(team.proGamesByScoringPeriod)
                  )
                )
                .then((gameIds) =>
                  Object.keys(
                    fromEntries(
                      gameIds.map((gameId) => ({
                        key: gameId.toString(),
                        value: true,
                      }))
                    )
                  )
                )
                .then((gameIds) =>
                  gameIds.map((gameId) =>
                    fetch(
                      `https://www.espn.com/nfl/playbyplay/_/gameId/${gameId}`
                    )
                      .then((resp) => resp.text())
                      .then(
                        (resp) =>
                          resp
                            .split("window['__espnfitt__']=")
                            .reverse()[0]
                            .split(";</script>")[0]
                      )
                      .then((resp) => JSON.parse(resp))
                      .then((resp) =>
                        resp.page.content.gamepackage.scrSumm.scrPlayGrps
                          .flatMap((periodPlays) => periodPlays)
                          .filter((play) => play.typeAbbreviation === "FG")
                          .map((play) => ({
                            teamId: play.teamId,
                            yards: parseInt(
                              play.text
                                .split(" Yd Field Goal")[0]
                                .split(" ")
                                .reverse()[0]
                            ),
                          }))
                      )
                      .then((value) => ({ key: gameId.toString(), value }))
                  )
                )
                .then((ps) => Promise.all(ps))
                .then((gamesByGameId) => fromEntries(gamesByGameId))
                .then((gamesByGameId) =>
                  fetch(
                    `https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/${year}/segments/0/leagues/${leagueId}?view=kona_playercard`,
                    {
                      headers: {
                        accept: "application/json",
                        "x-fantasy-filter": JSON.stringify({
                          players: {
                            filterSlotIds: { value: [16] },
                            filterStatsForTopScoringPeriodIds: { value: 17 },
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
                    .then((resp) =>
                      Object.keys(
                        fromEntries(
                          resp.players
                            .flatMap((player) => player.player.stats)
                            .map((s) => ({
                              key: s.scoringPeriodId.toString(),
                              value: true,
                            }))
                        )
                      ).map((scoringPeriodId) => ({
                        key: scoringPeriodId.toString(),
                        value: fromEntries(
                          resp.players
                            .map((player) => {
                              var _player$player$stats$;
                              return {
                                teamId: player.player.proTeamId,
                                stats:
                                  (_player$player$stats$ =
                                    player.player.stats.find(
                                      (s) =>
                                        s.scoringPeriodId.toString() ===
                                        scoringPeriodId
                                    )) === null ||
                                  _player$player$stats$ === void 0
                                    ? void 0
                                    : _player$player$stats$.stats,
                              };
                            })
                            .map(({ teamId, stats }) =>
                              stats === undefined
                                ? undefined
                                : {
                                    key: teamId.toString(),
                                    value: {
                                      yardsAllowed: stats["127"] || 0,
                                      pointsAllowed: stats["187"] || 0,
                                    },
                                  }
                            )
                        ),
                      }))
                    )
                    .then((defensesByScoringPeriod) =>
                      fromEntries(defensesByScoringPeriod)
                    )
                    .then((defensesByScoringPeriod) =>
                      nflTeams
                        .map(({ proGamesByScoringPeriod, ...team }) => ({
                          ...team,
                          nflGamesByScoringPeriod: fromEntries(
                            Object.entries(proGamesByScoringPeriod)
                              .filter(
                                ([scoringPeriod]) =>
                                  defensesByScoringPeriod[scoringPeriod] !==
                                  undefined
                              )
                              .map(([scoringPeriod, gameId]) => ({
                                key: scoringPeriod,
                                value: {
                                  fieldGoals: gamesByGameId[gameId]
                                    .filter((play) => play.teamId === team.id)
                                    .map((play) => play.yards),
                                  ...defensesByScoringPeriod[scoringPeriod][
                                    team.id
                                  ],
                                },
                              }))
                          ),
                        }))
                        .map((team) => ({ key: team.id, value: team }))
                    )
                )
                .then((nflTeams) => fromEntries(nflTeams))
            )
        )
        .then((nflTeams) => nflTeams),
    ])
    .then((ps) => Promise.all(ps))
    .then(([nflPlayers, ffTeams, ffMatchups, nflTeams]) => ({
      nflPlayers,
      ffTeams,
      ffMatchups,
      nflTeams,
    }))
    .then(console.log);
}
FetchWrapped();
