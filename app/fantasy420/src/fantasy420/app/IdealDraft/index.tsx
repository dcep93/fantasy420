import { useEffect, useState } from "react";
import { bubbleStyle, groupByF, selectedWrapped } from "../Wrapped";

export default function IdealDraft() {
  const wrapped = selectedWrapped();
  const rawInitialDraft = Object.values(wrapped.ffTeams)
    .sort((a, b) => a.draft[0].pickIndex - b.draft[0].pickIndex)
    .flatMap((t, i) => t.draft.map((o) => ({ ...o, teamId: "ABCDEFGHIJ"[i] })))
    .map(({ playerId, pickIndex, teamId }) => ({
      teamId,
      pickIndex,
      playerId,
    }))
    .sort((a, b) => a.pickIndex - b.pickIndex);
  const positionToSeasonRank = Object.fromEntries(
    Object.entries(
      groupByF(Object.values(wrapped.nflPlayers), (p) => p.position)
    ).map(([position, players]) => [
      position,
      players.sort((a, b) => b.total - a.total).map(({ id }) => id),
    ])
  );
  const playerIdToSeasonRank = Object.fromEntries(
    Object.entries(positionToSeasonRank).flatMap(([position, playerIds]) =>
      playerIds.map((playerId, i) => [playerId, { position, i }])
    )
  );
  const [drafts, updateDrafts] = useState([
    rawInitialDraft.map((p) => ({
      name: wrapped.nflPlayers[p.playerId].name,
      season: `${wrapped.nflPlayers[p.playerId].position}${
        playerIdToSeasonRank[p.playerId].i + 1
      }`,
      points: wrapped.nflPlayers[p.playerId].total,
      ...p,
    })),
    [],
  ]);
  function generate() {
    console.log({ drafts });
    return null;
  }
  useEffect(() => {
    Promise.resolve()
      .then(generate)
      .then((nextDrafts) => nextDrafts && updateDrafts(nextDrafts));
  }, [drafts]);
  return (
    <div>
      <div style={{ display: "flex", alignItems: "baseline" }}>
        {drafts.map((d, i) => (
          <div key={i} style={bubbleStyle}>
            <h1>
              generation {i} ({d.length})
            </h1>
            <pre>{JSON.stringify(d, null, 2)}</pre>
          </div>
        ))}
      </div>
    </div>
  );
}
