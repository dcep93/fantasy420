import { selectedWrapped } from "..";

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

const getExpected = (teamId: string, weekNum: string) => ({
  sundayScore: 0,
  mondayProjection: 0,
  total: 0,
});

const getSpiciness = (
  teams: { sundayScore: number; mondayProjection: number; total: number }[]
) => 0;
