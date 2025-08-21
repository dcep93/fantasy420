import { useEffect, useState } from "react";
import { bubbleStyle, groupByF, selectedWrapped } from "../Wrapped";

export default function IdealDraft() {
  const wrapped = selectedWrapped();
  const playerIdToPositionRank = Object.fromEntries(
    Object.values(
      groupByF(Object.values(wrapped.nflPlayers), (p) => p.position)
    ).flatMap((players) =>
      players
        .sort((a, b) => b.total - a.total)
        .map((p, i) => [p.id, `${p.position}${i + 1}`])
    )
  );
  const initialDraft = Object.values(wrapped.ffTeams)
    .flatMap((t) => t.draft)
    .map(({ playerId, pickIndex: value }) => ({
      playerId,
      value,
      points: wrapped.nflPlayers[playerId].total,
      name: wrapped.nflPlayers[playerId].name,
      positionRank: playerIdToPositionRank[playerId],
      analyzed: false,
      isOriginal: true,
    }))
    .sort((a, b) => a.value - b.value);
  const [idealDraft, updateIdealDraft] = useState({
    numAnalyzed: 0,
    draft: initialDraft,
  });
  useEffect(() => {}, [idealDraft]);
  const x = idealDraft;
  return (
    <div>
      <div style={{ display: "flex", alignItems: "baseline" }}>
        {Object.entries({
          numAnalyzed: idealDraft.numAnalyzed,
          initialDraft,
          ideal: idealDraft.draft,
        }).map(([k, v]) => (
          <div key={k} style={bubbleStyle}>
            <h1>{k}</h1>
            <pre>{JSON.stringify(v, null, 2)}</pre>
          </div>
        ))}
      </div>
    </div>
  );
}
