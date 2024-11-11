import { useEffect, useState } from "react";
import { printF } from "..";
import { currentYear, selectedWrapped } from "../Wrapped";

export type NFLPlayerType = {
  id: string;
  name: string;
  nflTeamId: string;
  position: string;
  scores: { [weekNum: string]: number };
  total: number;
  average: number;
  injuryStatus?: string;
};

type NFLTeamType = {
  id: string;
  name: string;
  byeWeek: number;
  nflGamesByScoringPeriod: {
    [weekNum: string]:
      | {
          opp: string;
          fieldGoals: number[];
          pointsAllowed: number;
          yardsAllowed: number;
          drives: (string | null)[];
        }
      | undefined;
  };
};

export type FFTeamType = {
  id: string;
  name: string;
  rosters: {
    [weekNum: string]: {
      weekNum: string;
      starting: string[];
      rostered: string[];
    };
  };
  draft: { playerId: number; pickIndex: number }[];
  pickOrder?: number;
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
  ffMatchups: { [weekNum: string]: MatchupType };
  fantasyCalc: {
    timestamp: number;
    history: { date: number; values: { [teamId: string]: number } }[];
    players: { [espnId: string]: number };
  };
};

var initialized = false;
export default function FetchWrapped() {
  const [wrapped, update] = useState("fetching...");
  useEffect(() => {
    if (initialized) return;
    initialized = true;
    getWrapped(currentYear)
      .then((wrapped) => JSON.stringify(wrapped))
      .then(update)
      .catch((e: Error) => update(e.toString()));
  }, [update]);
  return (
    <div>
      <pre>{printF(getWrapped, `${currentYear}`)}</pre>
      <pre style={{ whiteSpace: "pre-wrap" }}>{wrapped}</pre>
    </div>
  );
}

function getWrapped(currentYear: string): Promise<WrappedType> {
  const leagueId =
    new URL(window.document.location.href).searchParams.get("leagueId") ||
    203836968;
  // 203836968 ADP
  // 67201591; QZ
  // 17110401 WS

  function ext(data: any): Promise<any> {
    const extension_id = "kmpbdkipjlpbckfnpbfbncddjaneeklc";
    return new Promise((resolve, reject) =>
      window.chrome.runtime.sendMessage(extension_id, data, (response: any) => {
        if (window.chrome.runtime.lastError) {
          return reject(
            `chrome.runtime.lastError ${window.chrome.runtime.lastError}`
          );
        }
        if (!response.ok) {
          console.error(data, response);
          return reject(`chrome: ${response.err}`);
        }
        resolve(response.data);
      })
    );
  }

  function fromEntries<T>(arr: ({ key: string; value: T } | undefined)[]): {
    [key: string]: T;
  } {
    return Object.fromEntries(
      arr.filter((a) => a !== undefined).map((a) => [a!.key, a!.value])
    );
  }
  function clog<T>(t: T): T {
    console.log(t);
    return t;
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
                    ownership: {
                      averageDraftPosition: number;
                      auctionValueAverage: number;
                      percentOwned: number;
                    };
                    injuryStatus?: string;
                  };
                }[];
              }) => resp
            )
            .then((resp) =>
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
                        value: parseFloat((stat.appliedTotal || 0).toFixed(2)),
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
                .map(({ ownership, ...player }) => ({
                  key: player.id,
                  value: player,
                }))
            )
            .then((playersArr) => fromEntries(playersArr))
        )
        .then((players: { [id: string]: NFLPlayerType }) => players),
      // ffTeams
      Promise.resolve()
        .then(() =>
          fetch(
            `https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/${currentYear}/segments/0/leagues/${leagueId}?view=mDraftDetail&view=mRoster`,
            { credentials: "include" }
          )
            .then((resp) => resp.json())
            .then(
              (resp: {
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
                    Array.from(new Array(resp.status.latestScoringPeriod))
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
                            (resp: {
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
                  )
                  .then((ps) => Promise.all(ps))
                  .then((weeks) =>
                    Object.values(weeks[0] || {}).map((team) => ({
                      id: team.id,
                      name: team.name,
                      draft: resp.draftDetail.picks
                        .map((p, pickIndex) => ({ ...p, pickIndex }))
                        .filter((p) => p.teamId === parseInt(team.id))
                        .map(({ playerId, pickIndex }) => ({
                          playerId,
                          pickIndex,
                        })),
                      pickOrder: resp.settings.draftSettings.pickOrder.indexOf(
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
                            rostered:
                              s.rosterForCurrentScoringPeriod.entries.map((e) =>
                                e.playerId.toString()
                              ),
                          }))
                          .concat({
                            weekNum: "0",
                            starting: [],
                            rostered: resp.teams
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
        .then((ffMatchups: { [weekNum: string]: MatchupType }) => ffMatchups),
      // nflTeams
      Promise.resolve()
        .then(() =>
          fetch(
            `https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/${currentYear}?view=proTeamSchedules_wl`
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
                      [scoringPeriodId: string]: {
                        id: number;
                        statsOfficial: boolean;
                      }[];
                    };
                  }[];
                };
              }) =>
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
                    ext({
                      fetch: {
                        url: `https://www.espn.com/nfl/playbyplay/_/gameId/${gameId}`,
                        maxAgeMs: 1000 * 60 * 60 * 24 * 30,
                      },
                    })
                      .then((resp) => resp.msg)
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
                                pbp: {
                                  tms: {
                                    [key: string]: {
                                      id: string;
                                      displayName: string;
                                    };
                                  };
                                };
                                scrSumm: {
                                  scrPlayGrps: {
                                    teamId: string;
                                    typeAbbreviation: string;
                                    text: string;
                                  }[][];
                                };
                                allPlys: {
                                  teamName: string;
                                  headline: string;
                                }[];
                              };
                            };
                          };
                        }) => ({
                          fieldGoals:
                            resp.page.content.gamepackage.scrSumm.scrPlayGrps
                              .flatMap((periodPlays) => periodPlays)
                              .filter((play) => play.typeAbbreviation === "FG")
                              .map((play) => ({
                                teamId: play.teamId,
                                yards: parseInt(
                                  play.text
                                    .replace("Yrd Field Goal", "Yd Field Goal")
                                    .split(" Yd Field Goal")[0]
                                    .split(" ")
                                    .reverse()[0]
                                ),
                              })),
                          drives: Object.fromEntries(
                            Object.values(
                              resp.page.content.gamepackage.pbp.tms
                            ).map(({ id, displayName }) => [
                              id,
                              resp.page.content.gamepackage.allPlys
                                .filter((p) => p.teamName === displayName)
                                .map((drive) => drive.headline),
                            ])
                          ),
                        })
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
                    .then(
                      (resp: {
                        players: {
                          player: {
                            proTeamId: number;
                            stats: {
                              scoringPeriodId: number;
                              stats: { [key: string]: number };
                            }[];
                          };
                        }[];
                      }) =>
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
                              .map((player) => ({
                                teamId: player.player.proTeamId,
                                stats: player.player.stats.find(
                                  (s) =>
                                    s.scoringPeriodId.toString() ===
                                    scoringPeriodId
                                )?.stats,
                              }))
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
                                  opp: Object.keys(
                                    gamesByGameId[gameId].drives
                                  ).find((t) => t !== team.id)!,
                                  drives: gamesByGameId[gameId].drives[team.id],
                                  fieldGoals: gamesByGameId[gameId].fieldGoals
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
      // fantasyCalc
      Promise.resolve()
        .then(() =>
          ext({
            fetch: {
              url: `https://api.fantasycalc.com/values/current?isDynasty=false&numQbs=2&numTeams=10&ppr=1&includeAdp=false`,
            },
          })
            .then((resp) => JSON.parse(resp.msg))
            .then(
              (
                resp: {
                  redraftValue: number;
                  player: { name: string; espnId: number };
                }[]
              ) =>
                Object.fromEntries(
                  resp.map((p) => [
                    p.player.espnId
                      ? p.player.espnId.toString()
                      : p.player.name,
                    p.redraftValue / 100,
                  ])
                )
            )
        )
        .then((players) => ({ players, timestamp: Date.now() })),
    ])
    .then((ps) => ps.map((p) => p.catch((e) => console.error(e))))
    .then((ps) => Promise.all(ps))
    .then(
      ([nflPlayers, ffTeams, ffMatchups, nflTeams, fantasyCalc]) =>
        ({
          nflPlayers,
          ffTeams,
          ffMatchups,
          nflTeams,
          fantasyCalc,
        } as WrappedType)
    )
    .then((wrapped) => {
      const values = Object.fromEntries(
        Object.values(wrapped.ffTeams).map((team) => [
          team.id,
          parseFloat(
            team.rosters["0"].rostered
              .map((playerId) => wrapped.fantasyCalc.players[playerId] || 0)
              .reduce((a, b) => a + b, 0)
              .toFixed(2)
          ),
        ])
      );
      wrapped.fantasyCalc.history = selectedWrapped().fantasyCalc.history;
      if (
        JSON.stringify(values) !==
        JSON.stringify(
          wrapped.fantasyCalc.history[wrapped.fantasyCalc.history.length - 1]
            .values
        )
      )
        wrapped.fantasyCalc.history.push({
          values,
          date: Date.now(),
        });
      return wrapped;
    })
    .then(clog);
}
