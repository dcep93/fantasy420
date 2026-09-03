import { bubbleStyle, selectedWrapped, selectedYear } from "..";
import { getCompositeForYear } from "../../Draft";
import { WrappedType } from "../../FetchWrapped";
import "./NFLTeams.css";

const POSITION_ORDER = ["QB", "RB", "WR", "TE", "K", "DST"];

type RankedPlayer = {
  id: string;
  name: string;
  position: string;
  adp: number;
  positionRank: number;
};

type ScheduleWeek = {
  week: number;
  opponent: string;
};

export type NFLTeamCard = {
  id: string;
  name: string;
  players: RankedPlayer[];
  schedule: ScheduleWeek[];
};

function positionOrder(position: string): number {
  const index = POSITION_ORDER.indexOf(position);
  return index === -1 ? POSITION_ORDER.length : index;
}

export function getNFLTeamCards(
  wrapped: WrappedType,
  composite: Record<string, number> | undefined,
  regularSeasonWeeks = 18
): NFLTeamCard[] {
  const positionCounts: Record<string, number> = {};
  const playersByTeam = Object.fromEntries(
    Object.values(wrapped.nflTeams).map((team) => [team.id, [] as RankedPlayer[]])
  );

  Object.entries(composite ?? {})
    .filter(([playerId]) => wrapped.nflPlayers[playerId] !== undefined)
    .sort((left, right) => left[1] - right[1] || left[0].localeCompare(right[0]))
    .forEach(([playerId, adp]) => {
      const player = wrapped.nflPlayers[playerId];
      positionCounts[player.position] =
        (positionCounts[player.position] ?? 0) + 1;
      playersByTeam[player.nflTeamId]?.push({
        id: player.id,
        name: player.name,
        position: player.position,
        adp,
        positionRank: positionCounts[player.position],
      });
    });

  return Object.values(wrapped.nflTeams)
    .filter((team) => team.id !== "0")
    .sort((left, right) => left.name.localeCompare(right.name))
    .map((team) => ({
      id: team.id,
      name: team.name,
      players: playersByTeam[team.id].sort(
        (left, right) =>
          positionOrder(left.position) - positionOrder(right.position) ||
          left.adp - right.adp
      ),
      schedule: Array.from({ length: regularSeasonWeeks }, (_, index) => {
        const week = index + 1;
        const game = team.nflGamesByScoringPeriod[String(week)];
        return {
          week,
          opponent:
            week === team.byeWeek
              ? "BYE"
              : wrapped.nflTeams[game?.opp ?? ""]?.name ?? "—",
        };
      }),
    }));
}

export function NFLTeamsForSeason({
  wrapped,
  composite,
  regularSeasonWeeks = 18,
}: {
  wrapped: WrappedType;
  composite: Record<string, number> | undefined;
  regularSeasonWeeks?: number;
}) {
  const cards = getNFLTeamCards(wrapped, composite, regularSeasonWeeks);

  return (
    <div className="nfl-teams-grid">
      {cards.map((team) => {
        const positionGroups = Object.entries(
          team.players.reduce((groups, player) => {
            (groups[player.position] ??= []).push(player);
            return groups;
          }, {} as Record<string, RankedPlayer[]>)
        );
        return (
          <section
            key={team.id}
            data-testid={`nfl-team-${team.id}`}
            className="nfl-team-bubble"
            style={{ ...bubbleStyle, display: "block", margin: 0 }}
          >
            <h2>/{team.name}</h2>
            <div className="nfl-team-depth-chart">
              {positionGroups.map(([position, players]) => (
                <div key={position} className="nfl-team-position-group">
                  <b>{position}</b>
                  <div>
                    {players.map((player) => (
                      <div key={player.id}>
                        {player.name} — {player.adp} ADP · {player.position}
                        {player.positionRank}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div
              className="nfl-team-schedule"
              aria-label={`${team.name} schedule`}
            >
              {team.schedule.map(({ week, opponent }) => (
                <span key={week}>
                  W{week} {opponent}
                </span>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

export default function NFLTeams() {
  return (
    <NFLTeamsForSeason
      wrapped={selectedWrapped()}
      composite={getCompositeForYear(selectedYear)}
    />
  );
}
