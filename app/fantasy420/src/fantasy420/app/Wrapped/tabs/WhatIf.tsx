import { useState } from "react";
import { bubbleStyle, selectedWrapped } from "..";

export default function WhatIf() {
  const [diff, updateDiff] = useState(10);
  return (
    <div>
      <div>
        what would the standings be if every matchup within X points were
        flipped? hypotheticalWins(realWins)
      </div>
      <div>
        pointsDiff:{" "}
        <input
          defaultValue={diff.toFixed(1)}
          onChange={(e) =>
            setTimeout(() => updateDiff(parseFloat(e.target!.value)))
          }
          type="number"
        />
      </div>
      <div style={bubbleStyle}>
        {Object.values(selectedWrapped().ffTeams)
          .map((t) => ({
            t,
            advantages: Object.entries(selectedWrapped().ffMatchups)
              .filter(
                ([weekNum]) => selectedWrapped().ffTeams[t.id].rosters[weekNum]
              )
              .map(([weekNum, teamIds]) =>
                teamIds
                  .find((teamIds) => teamIds.includes(t.id))!
                  .sort((a, b) => (a === t.id ? 1 : -1))
                  .map((teamId) =>
                    selectedWrapped()
                      .ffTeams[teamId].rosters[weekNum].starting.map(
                        (playerId) =>
                          selectedWrapped().nflPlayers[playerId].scores[weekNum]
                      )
                      .reduce((a, b) => a + b, 0)
                  )
              )
              .map((scores) => scores[1] - scores[0]),
          }))
          .map((o) => ({
            ...o,
            wins: o.advantages.filter((a) => a > 0).length,
            altWins: o.advantages
              .map((a) => (Math.abs(a) < diff ? -a : a))
              .filter((a) => a > 0).length,
          }))
          .sort((a, b) => b.altWins - a.altWins)
          .map((o) => (
            <div key={o.t.id}>
              <div>
                {o.altWins}({o.wins}) {o.t.name}
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
