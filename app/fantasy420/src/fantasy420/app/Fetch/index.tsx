import rawFetchedDraftDay from "./draft_day.json";
import rawFetched from "./fetched.json";

export const fetched_draft_day: FetchedType = rawFetchedDraftDay;
export const fetched: FetchedType = rawFetched;

const year = 2023;

type FetchedType = {
  matchups: number[][][];
  teams: {
    id: number;
    name: string;
    players: { name: string; bye: number }[];
  }[];
};

export default function Fetch() {
  return (
    <div>
      <pre style={{ whiteSpace: "pre-wrap" }}>{printF(printFetched)}</pre>
    </div>
  );
}

export function printF(f: (...args: any[]) => any): string {
  return `${f
    .toString()
    .split("\n")
    .map((i) => i.split("// ")[0].trim())
    .join(" ")}; ${f.name}()`;
}

function printFetched() {
  function getFetched(): Promise<FetchedType> {
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
            matchups: Array.from(
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

  getFetched().then(console.log);
}
