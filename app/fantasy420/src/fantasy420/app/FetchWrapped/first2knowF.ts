import { FFTeamType, MatchupsType, NFLPlayerType, Ownership } from ".";

export default function first2knowF(
  currentYear: string
): Promise<First2KnowSource> {
  // todo currentYear and leagueId arguments
  const leagueId = 203836968;

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
            `https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/${currentYear}/segments/0/leagues/${leagueId}?view=kona_playercard`,
            {
              headers: {
                accept: "application/json",
                "x-fantasy-filter": JSON.stringify({
                  players: {
                    filterStatsForTopScoringPeriodIds: {
                      value: 17,
                      additionalValue: [`00${currentYear}`, `10${currentYear}`],
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
                teams: {
                  roster: {
                    entries: { playerPoolEntry: { player: { stats: {}[] } } };
                  }[][];
                };
                players: {
                  player: {
                    id: number;
                    proTeamId: number;
                    onTeamId: number;
                    fullName: string;
                    defaultPositionId: number;
                    stats: {
                      seasonId: number;
                      statSourceId: number;
                      scoringPeriodId: number;
                      appliedTotal: number;
                      appliedAverage: number;
                      appliedStats: { [key: string]: number };
                    }[];
                    ownership: Ownership;
                    injuryStatus?: string;
                  };
                }[];
              }) =>
                resp.players
                  .map((player) => player.player)
                  .map((player) => ({
                    player,
                    seasonStats: player.stats.find(
                      (s) => s.scoringPeriodId === 0 && s.statSourceId === 0
                    ),
                  }))
                  .map(({ player, seasonStats }) => ({
                    id: player.id.toString(),
                    nflTeamId: player.proTeamId.toString(),
                    name: player.fullName,
                    position:
                      {
                        1: "QB",
                        2: "RB",
                        3: "WR",
                        4: "TE",
                        5: "K",
                        16: "DST",
                      }[player.defaultPositionId] ||
                      player.defaultPositionId.toString(),
                    total: seasonStats?.appliedTotal || 0,
                    average: seasonStats?.appliedAverage || 0,
                    scores: fromEntries(
                      player.stats
                        .filter(
                          (stat) =>
                            stat.seasonId === parseInt(currentYear) &&
                            stat.statSourceId === 0
                        )
                        .map((stat) => ({
                          key: stat.scoringPeriodId.toString(),
                          value: parseFloat(
                            (stat.appliedTotal || 0).toFixed(2)
                          ),
                        }))
                    ),
                    ownership: Object.fromEntries(
                      Object.entries(player.ownership || {}).filter(([k]) =>
                        [
                          "averageDraftPosition",
                          "auctionValueAverage",
                          "percentOwned",
                        ].includes(k)
                      )
                    ) as {
                      averageDraftPosition: number;
                      auctionValueAverage: number;
                      percentOwned: number;
                    },
                    injuryStatus: player.injuryStatus,
                  }))
                  .filter(
                    (player) =>
                      Object.keys(player.ownership).length > 0 &&
                      (player.ownership?.percentOwned > 0.1 ||
                        Object.values(player.scores).filter((s) => s !== 0)
                          .length > 0)
                  )
                  .map(({ ...player }) => ({
                    key: player.id,
                    value: player,
                  }))
            )
            .then((playersArr) => fromEntries(playersArr))
        )
        .then((v) => ["nflPlayers", v as { [id: string]: NFLPlayerType }]),
      // ffTeams
      Promise.resolve()
        .then(() =>
          fetch(
            `https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/${currentYear}/segments/0/leagues/${leagueId}?view=mDraftDetail&view=mRoster`,
            { credentials: "include" }
          )
            .then((resp) => resp.json())
            .then(
              (main: {
                draftDetail: { picks: { playerId: number; teamId: number }[] };
                teams: {
                  id: number;
                  roster: { entries: { playerId: number }[] };
                }[];
                status: { latestScoringPeriod: number };
                settings: { draftSettings: { pickOrder: number[] } };
              }) =>
                Promise.resolve()
                  .then(() =>
                    Array.from(new Array(main.status.latestScoringPeriod))
                      .map((_, i) => i + 1)
                      .map((weekNum) =>
                        fetch(
                          `https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/${currentYear}/segments/0/leagues/${leagueId}?view=mScoreboard&scoringPeriodId=${weekNum}`,
                          {
                            credentials: "include",
                          }
                        )
                          .then((resp) => resp.json())
                          .then(
                            (week: {
                              teams: {
                                id: number;
                                name: string;
                              }[];
                              schedule: {
                                home: {
                                  rosterForCurrentScoringPeriod: {
                                    entries: {
                                      playerId: number;
                                      lineupSlotId: number;
                                    }[];
                                  };
                                  teamId: number;
                                };
                                away: {
                                  rosterForCurrentScoringPeriod: {
                                    entries: {
                                      playerId: number;
                                      lineupSlotId: number;
                                    }[];
                                  };
                                  teamId: number;
                                };
                              }[];
                            }) => ({ weekNum, week })
                          )
                      )
                  )

                  .then((ps) => Promise.all(ps))
                  .then((weeks) => ({ main, weeks }))
            )
            .then(({ main, weeks }) =>
              Promise.resolve()
                .then(() =>
                  weeks.map(({ week, weekNum }) =>
                    Promise.resolve()
                      .then(() =>
                        week.teams.map((team) => ({
                          id: team.id.toString(),
                          name: team.name,
                          schedule: {
                            weekNum,
                            ...week.schedule
                              .flatMap((matchup) => [
                                matchup.home,
                                matchup.away,
                              ])
                              .find(
                                (s) =>
                                  s?.rosterForCurrentScoringPeriod &&
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
                .then((ps) => Promise.all(ps))
                .then((weeks) =>
                  Object.values(weeks[0] || {}).map((team) => ({
                    id: team.id,
                    name: team.name,
                    draft: main.draftDetail.picks
                      .map((p, pickIndex) => ({ ...p, pickIndex }))
                      .filter((p) => p.teamId === parseInt(team.id))
                      .map(({ playerId, pickIndex }) => ({
                        playerId,
                        pickIndex,
                      })),
                    pickOrder: main.settings.draftSettings.pickOrder.indexOf(
                      parseInt(team.id)
                    ),
                    rosters: fromEntries(
                      weeks
                        .map((week) => week[team.id].schedule)
                        .filter((s) => s.rosterForCurrentScoringPeriod)
                        .map((s) => ({
                          weekNum: s.weekNum.toString(),
                          starting: s.rosterForCurrentScoringPeriod.entries
                            .filter(
                              (e) =>
                                ![
                                  20, // bench
                                  21, // IR
                                ].includes(e.lineupSlotId)
                            )
                            .map((e) => e.playerId.toString()),
                          rostered: s.rosterForCurrentScoringPeriod.entries.map(
                            (e) => e.playerId.toString()
                          ),
                        }))
                        .concat({
                          weekNum: "0",
                          starting: [],
                          rostered: main.teams
                            .find((t) => t.id.toString() === team.id)!
                            .roster.entries.map((e) => e.playerId.toString()),
                        })
                        .map((roster) => ({
                          key: roster.weekNum,
                          value: roster,
                        }))
                    ),
                  }))
                )
                .then((teams) =>
                  fromEntries(
                    teams.map((team) => ({ key: team.id, value: team }))
                  )
                )
            )
            .then((teams: { [teamId: string]: FFTeamType }) => teams)
        )
        .then((v) => ["ffTeams", v as { [id: string]: FFTeamType }]),
      // ffMatchups
      Promise.resolve()
        .then(() =>
          fetch(
            `https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/${currentYear}/segments/0/leagues/${leagueId}?view=mMatchupScore&view=mSettings`,
            {
              credentials: "include",
            }
          )
            .then((resp) => resp.json())
            .then(
              (resp: {
                settings: {
                  scheduleSettings: { matchupPeriodCount: number };
                };
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
                        [s.home, s.away].map((t) => t?.teamId.toString())
                      ),
                  }))
            )
            .then((matchups) => fromEntries(matchups))
        )
        .then((v) => ["ffMatchups", v]),
      // nflTeamsSource
      Promise.resolve()
        .then(() =>
          fetch(
            `https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/${currentYear}?view=proTeamSchedules_wl`,
            {
              credentials: "include",
            }
          )
            .then((resp) => resp.json())
            .then((main) =>
              fetch(
                `https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/${currentYear}/segments/0/leagues/${leagueId}?view=kona_playercard`,
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
                .then((playerCards) => ({ main, playerCards }))
            )
        )
        .then((v) => ["nflTeamsSource", v]),
    ])
    .then((ps) => Promise.all(ps))
    .then(Object.fromEntries);
}

export type First2KnowSource = {
  nflPlayers: { [id: string]: NFLPlayerType };
  ffTeams: { [id: string]: FFTeamType };
  ffMatchups: { [weekNum: string]: MatchupsType };
  nflTeamsSource: {
    main: {
      settings: {
        proTeams: {
          id: number;
          name: string;
          byeWeek: number;
          proGamesByScoringPeriod: {
            [scoringPeriodId: string]: {
              id: number;
              statsOfficial: boolean;
            }[];
          };
        }[];
      };
    };
    playerCards: {
      players: {
        player: {
          proTeamId: number;
          stats: {
            scoringPeriodId: number;
            stats: { [key: string]: number };
          }[];
        };
      }[];
    };
  };
};
