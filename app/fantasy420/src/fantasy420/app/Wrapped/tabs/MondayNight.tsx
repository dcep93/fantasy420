import { selectedWrapped } from "..";

type TeamExpectation = {
  sundayScore: number;
  mondayProjection: number;
  total: number;
};

export default function MondayNight() {
  return (
    <div>
      {Object.entries(selectedWrapped().ffMatchups)
        .flatMap(([weekNum, matchups]) =>
          matchups.map((matchup) => ({
            weekNum,
            matchup,
            spiciness: getSpiciness(
              matchup.map((teamId) => getExpected(teamId, weekNum))
            ),
          }))
        )
        .filter((entry) => entry.spiciness !== 0)
        .sort((a, b) => b.spiciness - a.spiciness)
        .slice(0, 10)
        .map((o, index) => (
          <div key={index}>{JSON.stringify(o)}</div>
        ))}
    </div>
  );
}

function getIsMondayGame(nflTeamId: string, weekNum: string): boolean {
  return false;
}

const getExpected = (teamId: string, weekNum: string): TeamExpectation => {
  const wrapped = selectedWrapped();
  const ffTeam = wrapped.ffTeams[teamId];
  const roster = ffTeam?.rosters?.[weekNum];

  if (!ffTeam || !roster) {
    return { sundayScore: 0, mondayProjection: 0, total: 0 };
  }

  return roster.starting.reduce(
    (acc, playerId) => {
      const player = wrapped.nflPlayers[playerId];
      const playerScore = player?.scores?.[weekNum] ?? 0;
      const projection = roster.projections?.[playerId] ?? 0;

      if (player && getIsMondayGame(player.nflTeamId, weekNum)) {
        acc.mondayProjection += projection;
      } else {
        acc.sundayScore += playerScore;
      }

      acc.total += playerScore;
      return acc;
    },
    { sundayScore: 0, mondayProjection: 0, total: 0 } as TeamExpectation
  );
};

const getSpiciness = (teams: TeamExpectation[]) => {
  if (teams.length !== 2) return 0;

  const [teamA, teamB] = teams;
  const expectedA = teamA.sundayScore + teamA.mondayProjection;
  const expectedB = teamB.sundayScore + teamB.mondayProjection;
  const expectedDiff = expectedA - expectedB;
  const actualDiff = teamA.total - teamB.total;

  const mondayWeight = teamA.mondayProjection + teamB.mondayProjection;
  if (mondayWeight === 0) return 0;

  const swing = Math.abs(actualDiff - expectedDiff);
  const intensity = Math.tanh((swing + mondayWeight * 0.5) / 40);

  if (intensity === 0) return 0;

  const expectedSign = Math.abs(expectedDiff) < 1e-6 ? 0 : Math.sign(expectedDiff);
  const actualSign = Math.abs(actualDiff) < 1e-6 ? 0 : Math.sign(actualDiff);
  const direction = actualSign !== expectedSign ? 1 : -1;

  return direction * intensity;
};
