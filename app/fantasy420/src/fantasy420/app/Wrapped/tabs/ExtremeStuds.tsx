import { useState } from "react";
import { bubbleStyle, Helpers, selectedWrapped } from "..";

export default function ExtremeStuds() {
  const funcs: {
    [funcName: string]: (playerId: string) =>
      | {
          weekNum: string;
          score: number;
        }
      | undefined;
  } = {
    max: (playerId) =>
      Object.entries(selectedWrapped().nflPlayers[playerId]?.scores || {})
        .map(([weekNum, score]) => ({
          weekNum,
          score: score!,
        }))
        .filter(({ weekNum }) => weekNum !== "0")
        .sort((a, b) => b.score - a.score)[0],
    "2nd": (playerId) =>
      Object.entries(selectedWrapped().nflPlayers[playerId].scores)
        .map(([weekNum, score]) => ({
          weekNum,
          score: score!,
        }))
        .filter(({ weekNum }) => weekNum !== "0")
        .sort((a, b) => b.score - a.score)[1],
    min: (playerId) =>
      Object.entries(selectedWrapped().nflPlayers[playerId].scores)
        .map(([weekNum, score]) => ({
          weekNum,
          score: score!,
        }))
        .filter(({ weekNum }) => weekNum !== "0")
        .filter(({ score }) => score !== 0)
        .sort((a, b) => b.score - a.score)
        .reverse()[0],
    average: (playerId) => ({
      weekNum: "avg",
      score: selectedWrapped().nflPlayers[playerId].average,
    }),
  };
  const [funcName, updateFuncName] = useState(Object.keys(funcs)[0]);
  return (
    <div>
      <div>
        <div>
          funcName:{" "}
          <select onChange={(e) => updateFuncName(e.target.value)}>
            {Object.keys(funcs).map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </div>
        {Object.values(selectedWrapped().ffTeams)
          .map((t) => ({
            ...t,
            xroster: Object.fromEntries(
              t.rosters["0"].rostered
                .map((playerId) => [playerId, funcs[funcName](playerId)])
                .filter(([_, xx]) => xx !== undefined)
            ),
          }))
          .map((t) => ({
            ...t,
            xplayers: Object.fromEntries(
              Helpers.getIdealHelper(
                Object.keys(t.xroster),
                Object.entries(t.rosters)
                  .map(([weekNum, roster]) => ({
                    weekNum: parseInt(weekNum),
                    roster,
                  }))
                  .sort((a, b) => b.weekNum - a.weekNum)[0].roster.starting,
                (player) => t.xroster[player.id]?.score || 0
              ).map((playerId) => [playerId, t.xroster[playerId]])
            ),
          }))
          .map((t) => ({
            ...t,
            xtotal: Object.entries(t.xplayers)
              .map(([playerId, o]) => ({ playerId, ...o }))
              .map(({ playerId, score }) => score!)
              .reduce((a, b) => a + b, 0),
          }))
          .sort((a, b) => b.xtotal - a.xtotal)
          .map((t) => (
            <div key={t.id} style={bubbleStyle}>
              <h2>{t.name}</h2>
              <div>{Helpers.toFixed(t.xtotal)}</div>
              {Object.entries(t.xplayers)
                .map(([playerId, o]) => ({
                  player: selectedWrapped().nflPlayers[playerId],
                  o,
                }))
                .map(({ player, o }) => ({
                  player,
                  ...o,
                }))
                .map(({ score, ...o }) => ({ ...o, score: score! }))
                .sort((a, b) => b.score - a.score)
                .map(({ player, weekNum, score }) => (
                  <div key={player.id}>
                    {Helpers.toFixed(score)} week {weekNum} {player.name}
                  </div>
                ))}
            </div>
          ))}
      </div>
    </div>
  );
}
