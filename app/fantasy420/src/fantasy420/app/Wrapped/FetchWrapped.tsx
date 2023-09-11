const latestScoringPeriodId = 4;
const year = 2022;
const leagueId =
  new URL(window.document.location.href).searchParams.get("leagueId") ||
  203836968;

type PlayerType = {
  id: string;
  name: string;
  proTeamId: string;
  position: string;
  scores: { [scoringPeriodId: string]: number | undefined };
  total: number;
};

type ProTeamType = {
  id: string;
  name: string;
  byeWeek: number;
  proGamesByScoringPeriod: {
    [scoringPeriodId: string]:
      | {
          id: number;
          fieldGoals: number[];
          pointsAllowed: number;
          yardsAllowed: number;
        }
      | undefined;
  };
};

type TeamType = {
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
  players: {
    [id: string]: PlayerType;
  };
  proTeams: {
    [proTeamId: string]: ProTeamType;
  };
  teams: {
    [teamId: string]: TeamType;
  };
  matchups: { [scoringPeriodId: string]: MatchupType };
};

function fromEntries<T>(arr: { key: string; value: T }[]): {
  [key: string]: T;
} {
  return Object.fromEntries(arr.map((a) => [a.key, a.value]));
}

export default function FetchWrapped() {
  return Promise.resolve()
    .then(() => [
      // players
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
                    proTeamId: player.proTeamId.toString(),
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
        .then((players: { [id: string]: PlayerType }) => players),
      // teams
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
        .then((teams: { [teamId: string]: TeamType }) => teams),
      // matchups
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
          (matchups: { [scoringPeriodId: string]: MatchupType }) => matchups
        ),
      // proTeams
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
            .then((proTeams) =>
              Promise.resolve()
                .then(() =>
                  proTeams.flatMap((team) =>
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
                    (
                      Promise.resolve({}) || // todo
                      fetch(`${gameId}`).then((resp) => resp.json())
                    ).then((resp: any) => ({
                      key: gameId.toString(),
                      value: resp,
                    }))
                  )
                )
                .then((ps) => Promise.all(ps))
                .then((gamesByGameId) => fromEntries(gamesByGameId))
                .then((gamesByGameId) =>
                  proTeams
                    .map(({ proGamesByScoringPeriod, ...team }) => ({
                      ...team,
                      proGamesByScoringPeriod: fromEntries(
                        Object.entries(proGamesByScoringPeriod).map(
                          ([scoringPeriod, gameId]) => ({
                            key: scoringPeriod,
                            value: gamesByGameId[gameId][team.name],
                          })
                        )
                      ),
                    }))
                    .map((team) => ({ key: team.id, value: team }))
                )
                .then((proTeams) => fromEntries(proTeams))
            )
        )
        .then((proTeams: { [proTeamId: string]: ProTeamType }) => proTeams),
    ])
    .then((ps) => Promise.all(ps))
    .then(([players, teams, matchups, proTeams]) => ({
      players,
      teams,
      matchups,
      proTeams,
    }))
    .then(console.log);
}
