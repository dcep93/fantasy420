import { useEffect, useState } from "react";
import { selectedWrapped } from "../Wrapped";

export default function IdealDraft() {
  const wrapped = selectedWrapped();
  const [idealDraft, updateIdealDraft] = useState({
    numAnalyzed: 0,
    draft: Object.values(wrapped.ffTeams)
      .flatMap((t) => t.draft)
      .map(({ playerId, pickIndex: value }) => ({
        playerId,
        value,
        points: wrapped.nflPlayers[playerId].total,
        name: wrapped.nflPlayers[playerId].name,
        analyzed: false,
      }))
      .sort((a, b) => a.value - b.value),
  });
  useEffect(() => {}, [idealDraft]);
  const x = idealDraft;
  return <pre>{JSON.stringify(x, null, 2)}</pre>;
}
