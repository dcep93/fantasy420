type NFLPlayerType = {
  id: string;
  name: string;
  nflTeamId: string;
  position: string;
  scores: { [scoringPeriodId: string]: number | undefined };
  total: number;
};

type NFLTeamType = {
  id: string;
  name: string;
  byeWeek: number;
  nflGamesByScoringPeriod: {
    [scoringPeriodId: string]:
      | {
          fieldGoals: number[];
          pointsAllowed: number;
          yardsAllowed: number;
        }
      | undefined;
  };
};

type FFTeamType = {
  id: string;
  name: string;
  rosters: {
    [scoringPeriodId: string]: {
      starting: string[];
      rostered: string[];
    };
  };
};

type MatchupType = string[][];

export type WrappedType = {
  nflPlayers: {
    [id: string]: NFLPlayerType;
  };
  nflTeams: {
    [id: string]: NFLTeamType;
  };
  ffTeams: {
    [id: string]: FFTeamType;
  };
  ffMatchups: { [scoringPeriodId: string]: MatchupType };
};

// todo scoringperiod vs week

export default function FetchWrapped() {
  const latestScoringPeriodId = 4;
  const year = 2022;
  const leagueId =
    new URL(window.document.location.href).searchParams.get("leagueId") ||
    203836968;
  function fromEntries<T>(arr: ({ key: string; value: T } | undefined)[]): {
    [key: string]: T;
  } {
    return Object.fromEntries(
      arr.filter((a) => a !== undefined).map((a) => [a!.key, a!.value])
    );
  }
  return Promise.resolve()
    .then(() => [
      // nflPlayers
      Promise.resolve()
        .then(() =>
          fetch(
            `https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/${year}/segments/0/leagues/${leagueId}?view=kona_playercard`,
            {
              headers: {
                accept: "application/json",
                "x-fantasy-filter": JSON.stringify({
                  players: {
                    filterSlotIds: { value: [0, 7, 2, 23, 4, 6] },
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
              (resp: {
                players: {
                  player: {
                    id: number;
                    proTeamId: number;
                    fullName: string;
                    defaultPositionId: number;
                    stats: { scoringPeriodId: number; appliedTotal: number }[];
                  };
                }[];
              }) =>
                resp.players
                  .map((player) => player.player)
                  .map((player) => ({
                    id: player.id.toString(),
                    nflTeamId: player.proTeamId.toString(),
                    name: player.fullName,
                    position:
                      { 1: "QB", 2: "RB", 3: "WR", 4: "TE", 16: "DST" }[
                        player.defaultPositionId
                      ] || player.defaultPositionId.toString(),
                    scores: fromEntries(
                      player.stats.map((stat) => ({
                        key: stat.scoringPeriodId.toString(),
                        value: parseFloat(stat.appliedTotal.toFixed(2)),
                      }))
                    ),
                  }))
                  .map((player) => ({
                    total: parseFloat(
                      Object.values(player.scores)
                        .reduce((a, b) => a + b, 0)
                        .toFixed(2)
                    ),
                    ...player,
                  }))
                  .map((player) => ({ key: player.id, value: player }))
            )
            .then((playersArr) => fromEntries(playersArr))
        )
        .then((players: { [id: string]: NFLPlayerType }) => players),
      // ffTeams
      Promise.resolve()
        .then(() =>
          Promise.resolve()
            .then(() =>
              Array.from(new Array(latestScoringPeriodId))
                .map((_, i) => i + 1)
                .map((weekNum) =>
                  fetch(
                    `https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/${year}/segments/0/leagues/${leagueId}?view=mScoreboard&scoringPeriodId=${weekNum}`,
                    {
                      credentials: "include",
                    }
                  )
                    .then((resp) => resp.json())
                    .then(
                      (resp: {
                        teams: { id: number; name: string }[];
                        schedule: {
                          home: {
                            rosterForMatchupPeriod: {
                              entries: { playerId: number }[];
                            };
                            rosterForCurrentScoringPeriod: {
                              entries: { playerId: number }[];
                            };
                            teamId: number;
                          };
                          away: {
                            rosterForMatchupPeriod: {
                              entries: { playerId: number }[];
                            };
                            rosterForCurrentScoringPeriod: {
                              entries: { playerId: number }[];
                            };
                            teamId: number;
                          };
                        }[];
                      }) =>
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
                                  )!,
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
                    .map((s) => ({
                      weekNum: s.weekNum.toString(),
                      starting: s.rosterForMatchupPeriod.entries.map((e) =>
                        e.playerId.toString()
                      ),
                      rostered: s.rosterForCurrentScoringPeriod.entries.map(
                        (e) => e.playerId.toString()
                      ),
                    }))
                    .map((roster) => ({ key: roster.weekNum, value: roster }))
                ),
              }))
            )
            .then((teams) =>
              fromEntries(teams.map((team) => ({ key: team.id, value: team })))
            )
        )
        .then((teams: { [teamId: string]: FFTeamType }) => teams),
      // ffMatchups
      Promise.resolve()
        .then(() =>
          fetch(
            `https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/${year}/segments/0/leagues/${leagueId}?view=mMatchupScore&view=mSettings`,
            {
              credentials: "include",
            }
          )
            .then((resp) => resp.json())
            .then(
              (resp: {
                settings: { scheduleSettings: { matchupPeriodCount: number } };
                schedule: {
                  matchupPeriodId: number;
                  home: { teamId: number };
                  away: { teamId: number };
                }[];
              }) =>
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
        .then(
          (ffMatchups: { [scoringPeriodId: string]: MatchupType }) => ffMatchups
        ),
      // nflTeams
      Promise.resolve()
        .then(() =>
          fetch(
            `https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/${year}?view=proTeamSchedules_wl`
          )
            .then((resp) => resp.json())
            .then(
              (resp: {
                settings: {
                  proTeams: {
                    id: number;
                    name: string;
                    byeWeek: number;
                    proGamesByScoringPeriod: {
                      [scoringPeriodId: string]: { id: number }[];
                    };
                  }[];
                };
              }) =>
                resp.settings.proTeams.map((p) => ({
                  id: p.id.toString(),
                  name: p.name,
                  byeWeek: p.byeWeek,
                  proGamesByScoringPeriod: fromEntries(
                    Object.entries(p.proGamesByScoringPeriod).map(
                      ([scoringPeriod, o]) => ({
                        key: scoringPeriod,
                        value: o[0].id,
                      })
                    )
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
                      .then(
                        (resp: {
                          page: {
                            content: {
                              gamepackage: {
                                scrSumm: {
                                  scrPlayGrps: {
                                    teamId: string;
                                    typeAbbreviation: string;
                                    text: string;
                                  }[][];
                                };
                              };
                            };
                          };
                        }) =>
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
                      .then((value) => ({
                        key: gameId.toString(),
                        value,
                      }))
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
                      (resp: {
                        players: {
                          onTeamId: number;
                          player: {
                            stats: {
                              scoringPeriodId: number;
                              stats: { [key: string]: number };
                            }[];
                          };
                        }[];
                      }) =>
                        Array.from(new Array(latestScoringPeriodId + 1))
                          .map((_, i) => i)
                          .map((scoringPeriodId) => ({
                            key: scoringPeriodId.toString(),
                            value: fromEntries(
                              resp.players
                                .map((player) => ({
                                  teamId: player.onTeamId,
                                  stats: player.player.stats.find(
                                    (s) => s.scoringPeriodId === scoringPeriodId
                                  )?.stats,
                                }))
                                .map(({ teamId, stats }) =>
                                  stats === undefined
                                    ? undefined
                                    : {
                                        key: teamId.toString(),
                                        value: {
                                          yardsAllowed: stats["127"],
                                          pointsAllowed: stats["187"],
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
        .then((nflTeams: { [nflTeamId: string]: NFLTeamType }) => nflTeams),
    ])
    .then((ps) => Promise.all(ps))
    .then(
      ([nflPlayers, ffTeams, ffMatchups, nflTeams]) =>
        ({
          nflPlayers,
          ffTeams,
          ffMatchups,
          nflTeams,
        } as WrappedType)
    )
    .then(console.log);
}
