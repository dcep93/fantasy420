export type WrappedType = {
  players: {
    [id: string]: {
      name: string;
      team: string;
      position: string;
      scores: { [scoringPeriodId: string]: number | undefined };
      total: number;
    };
  };
  byeWeeksByTeam: { [team: string]: number };
  managers: {
    [id: string]: {
      name: string;
      rosters: {
        starting: string[];
        bench: string[];
        fieldGoals: number[];
        pointsAllowed: number;
        yardsAllowed: number;
      }[];
    };
  };
  matchups: { [scoringPeriodId: string]: [number, number][] };
};

export default function FetchWrapped() {
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
            .sort((a, b) => b.total - a.total)
        )
        .then((playersArr) =>
          Object.fromEntries(
            playersArr.map(({ id, ...player }) => [id, player])
          )
        ),
      // managers
      Promise.resolve({}),
      // matchups
      fetch(
        `https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/${year}/segments/0/leagues/${leagueId}?view=mMatchupScore&view=mStatus&view=mSettings&view=mTeam&view=modular&view=mNav&view=mRoster`,
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
            .map((matchupPeriodId) =>
              resp.schedule
                .filter((s: any) => s.matchupPeriodId === matchupPeriodId)
                .map((s: any) =>
                  [s.home, s.away].map((t) => t.teamId as number)
                )
            )
        ),
      // byeWeeksByTeam
      fetch(
        `https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/${year}?view=proTeamSchedules_wl`
      )
        .then((resp) => resp.json())
        .then((resp) =>
          Object.fromEntries(
            resp.settings.proTeams.map((p: any) => [p.id, p.byeWeek])
          )
        ),
    ])
    .then((ps) => Promise.all(ps))
    .then(
      ([players, managers, matchups, byeWeeksByTeam]) =>
        ({ players, managers, matchups, byeWeeksByTeam } as WrappedType)
    )
    .then(console.log);
}
