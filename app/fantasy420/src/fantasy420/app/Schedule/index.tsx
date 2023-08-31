import { DraftJsonType, printF } from "../Draft";
import draftJson from "../Draft/draft.json";
import rawScheduleJson from "./schedule.json";

export default function Schedule() {
  const scheduleJson: ScheduleJson = rawScheduleJson;
  return (
    <div>
      <div>
        <input readOnly value={printF(printSchedule)} />
      </div>
      {scheduleJson.teams.map((team, i) => {
        const teamWeeks = scheduleJson.weeks
          .map((matches, j) => ({
            number: j + 1,
            opponent: scheduleJson.teams.find(
              (opponent) =>
                team.id !== opponent.id &&
                matches.find(
                  (match) =>
                    match.includes(team.id) && match.includes(opponent.id)
                )!
            )!,
          }))
          .map((o) => ({
            byes: o.opponent.players
              .filter((player) => player.bye === o.number)
              .map((player) => ({
                ...player,
                auctionValue:
                  (draftJson as DraftJsonType).espn.auction[player.name] || 0,
              })),
            ...o,
          }));
        return (
          <div
            key={i}
            style={{
              border: "2px solid black",
              borderRadius: "20px",
              margin: "20px",
              padding: "20px",
            }}
          >
            <div>{team.name}</div>
            <div
              title={team.players
                .map(
                  (player) =>
                    `${player.name} $${
                      (draftJson as DraftJsonType).espn.auction[player.name] ||
                      0
                    } / bye ${player.bye}`
                )
                .join("\n")}
            >
              owned: $
              {team.players
                .map(
                  (player) =>
                    (draftJson as DraftJsonType).espn.auction[player.name] || 0
                )
                .reduce((a, b) => a + b, 0)
                .toFixed(1)}
            </div>
            <div>
              byes: $
              {teamWeeks
                .flatMap((week) =>
                  week.byes.map((player) => player.auctionValue)
                )
                .reduce((a, b) => a + b, 0)
                .toFixed(1)}
            </div>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "flex-start",
              }}
            >
              {teamWeeks.map((week, j) => (
                <div
                  key={j}
                  style={{
                    border: "2px solid black",
                    borderRadius: "20px",
                    padding: "10px",
                    margin: "10px",
                  }}
                >
                  <h2>
                    week {week.number} vs {week.opponent.name}: $
                    {week.byes
                      .map((player) => player.auctionValue)
                      .reduce((a, b) => a + b, 0)
                      .toFixed(1)}
                  </h2>
                  {week.byes.map((player, k) => (
                    <div key={k}>
                      {player.name} ${player.auctionValue}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function printSchedule() {
  const year = 2023;
  function getSchedule(): Promise<ScheduleJson> {
    const leagueId =
      new URL(window.document.location.href).searchParams.get("leagueId") ||
      203836968;
    return fetch(
      `https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/${year}?view=proTeamSchedules_wl`
    )
      .then((resp) => resp.json())
      .then((resp) =>
        Object.fromEntries(
          resp.settings.proTeams.map((p: any) => [p.id, p.byeWeek])
        )
      )
      .then((byeWeeksByTeam) =>
        fetch(
          `https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/${year}/segments/0/leagues/${leagueId}?view=mMatchupScore&view=mStatus&view=mSettings&view=mTeam&view=modular&view=mNav&view=mRoster`,
          {
            credentials: "include",
          }
        )
          .then((resp) => resp.json())
          .then((resp) => ({
            weeks: Array.from(
              new Array(resp.settings.scheduleSettings.matchupPeriodCount)
            )
              .map((_, i) => i + 1)
              .map((matchupPeriodId) =>
                resp.schedule
                  .filter((s: any) => s.matchupPeriodId === matchupPeriodId)
                  .map((s: any) =>
                    [s.home, s.away].map((t) => t.teamId as number)
                  )
              ),
            teams: resp.teams.map((team: any) => ({
              id: team.id,
              name: team.name,
              players: team.roster.entries
                .map((entry: any) => entry.playerPoolEntry.player)
                .map((player: any) => ({
                  name: player.fullName,
                  bye: byeWeeksByTeam[player.proTeamId],
                })),
            })),
          }))
      );
  }

  getSchedule().then(console.log);
}

type ScheduleJson = {
  weeks: number[][][];
  teams: {
    id: number;
    name: string;
    players: { name: string; bye: number }[];
  }[];
};
