export type WrappedType = {
  players: {
    [id: string]: {
      name: string;
      proTeamId: string;
      position: string;
      scores: { [scoringPeriodId: string]: number | undefined };
      total: number;
    };
  };
  proTeams: {
    [proTeamId: string]: {
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
  };
  teams: {
    [teamId: string]: {
      name: string;
      rosters: {
        [scoringPeriodId: string]: {
          starting: string[];
          rostered: string[];
        };
      };
    };
  };
  matchups: { [scoringPeriodId: string]: number[][] };
};

export default function FetchWrapped() {
  const latestScoringPeriodId = 4;
  const year = 2022;
  const leagueId =
    new URL(window.document.location.href).searchParams.get("leagueId") ||
    203836968;
  return Promise.resolve()
    .then(() => [
      // players
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
        .then((resp) => resp.players.map((player: any) => player.player))
        .then((players: any[]) =>
          players
            .map((player) => ({
              id: player.id.toString(),
              proTeamId: player.proTeamId.toString(),
              name: player.fullName,
              position:
                { 1: "QB", 2: "RB", 3: "WR", 4: "TE", 16: "DST" }[
                  player.defaultPositionId as number
                ] || player.defaultPositionId,
              scores: Object.fromEntries(
                player.stats.map(
                  (stat: any) =>
                    [
                      stat.scoringPeriodId,
                      parseFloat(stat.appliedTotal.toFixed(2)),
                    ] as [number, number]
                )
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
        )
        .then((playersArr) =>
          Object.fromEntries(
            playersArr.map(({ id, ...player }) => [id, player])
          )
        ),
      // teams
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
                .then((resp: any) =>
                  Promise.resolve()
                    .then(() =>
                      resp.teams.map((team: any) => ({
                        id: team.id.toString(),
                        name: team.name,
                        schedule: {
                          weekNum,
                          ...resp.schedule
                            .flatMap((matchup: any) => [
                              matchup.home,
                              matchup.away,
                            ])
                            .find(
                              (s: any) =>
                                s.rosterForCurrentScoringPeriod &&
                                s.teamId === team.id
                            ),
                        },
                      }))
                    )
                    .then((week) =>
                      Object.fromEntries(
                        week.map((team: any) => [team.id, team])
                      )
                    )
                )
            )
        )
        .then((ps) => Promise.all(ps))
        .then((weeks) =>
          Object.values(weeks[0]).map((team: any) => ({
            id: team.id,
            name: team.name,
            rosters: Object.fromEntries(
              weeks
                .map((week) => week[team.id].schedule)
                .map((s) => [
                  s.weekNum,
                  {
                    starting: s.rosterForMatchupPeriod.entries.map((e: any) =>
                      e.playerId.toString()
                    ),
                    rostered: s.rosterForCurrentScoringPeriod.entries.map(
                      (e: any) => e.playerId.toString()
                    ),
                  },
                ])
            ),
          }))
        )
        .then((teams) =>
          Object.fromEntries(teams.map((team: any) => [team.id, team]))
        ),
      // matchups
      fetch(
        `https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/${year}/segments/0/leagues/${leagueId}?view=mMatchupScore&view=mSettings`,
        {
          credentials: "include",
        }
      )
        .then((resp) => resp.json())
        .then((resp) =>
          Array.from(
            new Array(resp.settings.scheduleSettings.matchupPeriodCount)
          )
            .map((_, i) => i + 1)
            .map((matchupPeriodId) => [
              matchupPeriodId.toString(),
              resp.schedule
                .filter((s: any) => s.matchupPeriodId === matchupPeriodId)
                .map((s: any) =>
                  [s.home, s.away].map((t) => t.teamId as number)
                ),
            ])
        )
        .then((matchups) => Object.fromEntries(matchups)),
      // proTeams
      fetch(
        `https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/${year}?view=proTeamSchedules_wl`
      )
        .then((resp) => resp.json())
        .then((resp) =>
          Object.fromEntries(
            resp.settings.proTeams.map((p: any) => [
              p.id.toString(),
              {
                name: p.name,
                byeWeek: p.byeWeek,
                proGamesByScoringPeriod: Object.fromEntries(
                  Object.entries(p.proGamesByScoringPeriod).map(
                    ([scoringPeriod, o]: any) => [
                      scoringPeriod,
                      {
                        id: o[0].id,
                        // todo
                        fieldGoals: [],
                        pointsAllowed: 0,
                        yardsAllowed: 0,
                      },
                    ]
                  )
                ),
              },
            ])
          )
        ),
    ])
    .then((ps) => Promise.all(ps))
    .then(
      ([players, teams, matchups, proTeams]) =>
        ({ players, teams, matchups, proTeams } as WrappedType)
    )
    .then(console.log);
}
