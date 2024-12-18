import { useState } from "react";
import { bubbleStyle, groupByF, newManagers, selectedYear } from ".";
import allWrapped from "./allWrapped";

export default function Simps() {
  const [allowKDST, updateAllowKDST] = useState(false);
  return (
    <div>
      <div style={bubbleStyle}>how many times did a manager own a player?</div>
      <div style={bubbleStyle}>
        allow kicker and dst?{" "}
        <select
          onChange={(e) => updateAllowKDST(e.target.value === "true")}
          defaultValue={allowKDST.toString()}
        >
          {[true, false]
            .map((y) => y.toString())
            .map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
        </select>
      </div>
      <div>
        <div style={bubbleStyle}>
          {Object.entries(
            groupByF(
              Object.entries(allWrapped)
                .map(([year, wrapped]) => ({ year, wrapped }))
                .filter(({ year }) => year <= selectedYear)
                .flatMap(({ year, wrapped }) =>
                  Object.values(wrapped.ffTeams)
                    .flatMap((team) => ({
                      team,
                      teamNameYear:
                        newManagers[team.id] > year
                          ? (parseInt(newManagers[team.id]) - 1).toString()
                          : selectedYear,
                    }))
                    .flatMap(({ teamNameYear, team }) =>
                      Object.values(team.rosters)
                        .filter((roster) => roster.weekNum !== "0")
                        .flatMap((roster) =>
                          roster.rostered
                            .filter(
                              (playerId) =>
                                allowKDST ||
                                (wrapped.nflPlayers[playerId].position !==
                                  "DST" &&
                                  wrapped.nflPlayers[playerId].position !== "K")
                            )
                            .flatMap((playerId) => ({
                              year: parseInt(year),
                              weekNum: parseInt(roster.weekNum),
                              key: `${wrapped.nflPlayers[playerId]?.name} ❤️ ${
                                allWrapped[teamNameYear].ffTeams[team.id].name
                              }`,
                            }))
                        )
                    )
                ),
              (obj) => obj.key
            )
          )
            .map(([key, objs]) => ({
              key,
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
            .sort((a, b) => b.numWeeks - a.numWeeks)
            .sort((a, b) => b.numYears - a.numYears)
            .sort((a, b) => b.numStints - a.numStints)
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
                stints: {obj.numStints} / years:
                {obj.numYears} / weeks: {obj.numWeeks} / {obj.key}
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
