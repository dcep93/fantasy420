import { useEffect, useState } from "react";
import { bubbleStyle, groupByF, selectedWrapped } from "../Wrapped";

type IdealDraftType = { numAnalyzed: number; draft: any[] };
type Drafts = any[][];

export default function IdealDraft() {
  const wrapped = selectedWrapped();
  const rawInitialDraft = Object.values(wrapped.ffTeams)
    .flatMap((t, i) => t.draft.map((o) => ({ ...o, teamId: "ABCDEFGHIJ"[i] })))
    .map(({ playerId, pickIndex, teamId }) => ({
      playerId,
      pickIndex,
      teamId,
    }))
    .sort((a, b) => a.pickIndex - b.pickIndex);
  const positionToDraftRank = Object.fromEntries(
    Object.entries(
      groupByF(rawInitialDraft, (p) => wrapped.nflPlayers[p.playerId].position)
    ).map(([position, players]) => [
      position,
      Object.fromEntries(
        players
          .sort((a, b) => a.pickIndex - b.pickIndex)
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
        season: `${wrapped.nflPlayers[p.playerId].position}${
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
  const [drafts, updateDrafts] = useState([[], initialDraft]);
  useEffect(() => {
    Promise.resolve()
      .then(() => generate(drafts))
      .then((nextDrafts) => nextDrafts && updateDrafts(nextDrafts));
  }, [drafts]);
  return (
    <div>
      <div style={{ display: "flex", alignItems: "baseline" }}>
        {drafts
          .slice()
          .reverse()
          .map((d, i) => (
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

function generate(drafts: Drafts): Drafts | null {
  return null;
}
