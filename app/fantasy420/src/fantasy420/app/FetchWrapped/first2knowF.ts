import { Ownership } from ".";

export default function first2knowF(
  currentYear: string
): Promise<First2KnowSource> {
  const leagueId = 203836968;
  return Promise.resolve()
    .then(() => [
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
          ).then((resp) => resp.json())
        )
        .then((v) => ["nflPlayersSource", v]),
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
                          .then((week) => ({ weekNum, week }))
                      )
                  )

                  .then((ps) => Promise.all(ps))
                  .then((weeks) => ({ main, weeks }))
            )
        )
        .then((v) => ["ffTeamsSource", v]),
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
  nflPlayersSource: {
    main: {
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
    };
  };
  ffTeamsSource: {
    main: {
      draftDetail: { picks: { playerId: number; teamId: number }[] };
      teams: {
        id: number;
        roster: { entries: { playerId: number }[] };
      }[];
      status: { latestScoringPeriod: number };
      settings: { draftSettings: { pickOrder: number[] } };
    };
    weeks: {
      weekNum: number;
      week: {
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
      };
    }[];
  };
  ffMatchupsSource: {
    main: {
      settings: {
        scheduleSettings: { matchupPeriodCount: number };
      };
      schedule: {
        matchupPeriodId: number;
        home: { teamId: number };
        away: { teamId: number };
      }[];
    };
  };
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
