import { useEffect, useState } from "react";
import { bubbleStyle, groupByF, selectedWrapped } from "../Wrapped";

type IdealDraftType = { numAnalyzed: number; draft: any[] };

export default function IdealDraft() {
  const wrapped = selectedWrapped();
  const rawInitialDraft = Object.values(wrapped.ffTeams)
    .flatMap((t, i) => t.draft.map((o) => ({ ...o, teamId: "ABCDEFGHIJ"[i] })))
    .map(({ playerId, pickIndex: value, teamId }) => ({
      playerId,
      value,
      teamId,
    }))
    .sort((a, b) => a.value - b.value);
  const positionToDraftRank = Object.fromEntries(
    Object.entries(
      groupByF(rawInitialDraft, (p) => wrapped.nflPlayers[p.playerId].position)
    ).map(([position, players]) => [
      position,
      Object.fromEntries(
        players
          .sort((a, b) => a.value - b.value)
          .map(({ playerId }, i) => [playerId, i])
      ),
    ])
  );
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
  const playerIdToDraft = Object.fromEntries(
    rawInitialDraft.map((p) => [
      p.playerId,
      {
        ...p,
        points: wrapped.nflPlayers[p.playerId].total,
        name: wrapped.nflPlayers[p.playerId].name,
        positionRank: `${wrapped.nflPlayers[p.playerId].position}${
          playerIdToSeasonRank[p.playerId].i + 1
        }`,
        analyzed: false,
      },
    ])
  );
  const initialDraft = rawInitialDraft.map(({ playerId, teamId }) => ({
    ...playerIdToDraft[playerId],
    teamId,
  }));
  const [idealDraft, updateIdealDraft] = useState({
    numAnalyzed: 0,
    draft: initialDraft.map(({ playerId, teamId }) => ({
      ...playerIdToDraft[
        positionToSeasonRank[wrapped.nflPlayers[playerId].position][
          positionToDraftRank[playerIdToSeasonRank[playerId].position][playerId]
        ]
      ],
      teamId,
    })),
  });
  useEffect(() => {
    Promise.resolve(idealDraft)
      .then(idealDraftGeneration)
      .then(
        (nextIdealDraft) => nextIdealDraft && updateIdealDraft(nextIdealDraft)
      );
  }, [idealDraft]);
  return (
    <div>
      <div style={{ display: "flex", alignItems: "baseline" }}>
        {Object.entries({
          numAnalyzed: idealDraft.numAnalyzed,
          ideal: idealDraft.draft,
          initialDraft,
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

function idealDraftGeneration(
  idealDraft: IdealDraftType
): IdealDraftType | null {
  return null;
}
