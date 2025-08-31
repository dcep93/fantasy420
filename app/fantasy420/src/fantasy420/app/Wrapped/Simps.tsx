import { bubbleStyle, groupByF, newManagers, selectedYear } from ".";
import allWrapped from "./allWrapped";

export default function Simps() {
  return (
    <div>
      <div style={bubbleStyle}>how many times did a manager own a player?</div>
      <div>
        <div style={bubbleStyle}>
          {Object.values(
            groupByF(
              Object.entries(allWrapped)
                .map(([year, wrapped]) => ({ year, wrapped }))
                .filter(({ year }) => year <= selectedYear)
                .flatMap(({ year, wrapped }) =>
                  Object.values(wrapped.ffTeams)
                    .map((team) => ({
                      team,
                      rawTeamNameYear: newManagers[team.id]?.find(
                        (y) => y > year
                      ),
                    }))
                    .map((o) => ({
                      ...o,
                      teamNameYear:
                        o.rawTeamNameYear === undefined
                          ? selectedYear
                          : (parseInt(o.rawTeamNameYear) - 1).toString(),
                    }))
                    .flatMap(({ teamNameYear, team }) =>
                      Object.values(team.rosters)
                        .filter((roster) => roster.weekNum !== "0")
                        .flatMap((roster) =>
                          roster.rostered.flatMap((playerId) => ({
                            year: parseInt(year),
                            weekNum: parseInt(roster.weekNum),
                            playerId,
                            teamName:
                              allWrapped[teamNameYear].ffTeams[team.id].name,

                            playerName: wrapped.nflPlayers[playerId]?.name,
                          }))
                        )
                    )
                ),
              (obj) => `${obj.playerId} ${obj.teamName}`
            )
          )
            .map((objs) => ({
              key: `${objs[0].playerName} ❤️ ${objs[0].teamName}`,
              stints: objs.reduce((prev, curr) => {
                const p = prev[prev.length - 1];
                if (p?.year === curr.year && p.end === curr.weekNum - 1) {
                  p.end = curr.weekNum;
                } else {
                  prev.push({
                    year: curr.year,
                    start: curr.weekNum,
                    end: curr.weekNum,
                  });
                }
                return prev;
              }, [] as { year: number; start: number; end: number }[]),
              numWeeks: objs.length,
            }))
            .map((obj) => ({
              ...obj,
              numYears: new Set(obj.stints.map((stint) => stint.year)).size,
              numStints: obj.stints.length,
            }))
            .sort((a, b) => b.numStints - a.numStints)
            .sort((a, b) => b.numYears - a.numYears)
            .sort((a, b) => b.numWeeks - a.numWeeks)
            .map((obj) => (
              <div
                key={obj.key}
                title={obj.stints
                  .map(
                    (stint) =>
                      `${stint.year} w${
                        stint.end === stint.start
                          ? stint.start
                          : `${stint.start}-${stint.end}`
                      }`
                  )
                  .join("\n")}
              >
                stints:{obj.numStints} / years:
                {obj.numYears} / weeks:{obj.numWeeks} / {obj.key}
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
