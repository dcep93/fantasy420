import { useEffect, useState } from "react";
import { bubbleStyle, groupByF, selectedWrapped } from "../Wrapped";

const MAX_GENERATIONS = 4;

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
  const positionToRankedIds = Object.fromEntries(
    Object.entries(
      groupByF(Object.values(wrapped.nflPlayers), (p) => p.position)
    ).map(([position, players]) => [
      position,
      players.sort((a, b) => b.total - a.total).map(({ id }) => id),
    ])
  );
  const playerIdToPositionSeasonRank = Object.fromEntries(
    Object.values(positionToRankedIds).flatMap((playerIds) =>
      playerIds.map((playerId, i) => [playerId, i])
    )
  );
  const [drafts, updateDrafts] = useState([
    rawInitialDraft.map((p) => ({
      name: wrapped.nflPlayers[p.playerId].name,
      season: `${wrapped.nflPlayers[p.playerId].position}${
        playerIdToPositionSeasonRank[p.playerId] + 1
      }`,
      points: wrapped.nflPlayers[p.playerId].total,
      ...p,
    })) as DraftType,
    [],
  ]);
  useEffect(() => {
    Promise.resolve()
      .then(() => generate(drafts, positionToRankedIds))
      .then((nextDrafts) => nextDrafts && updateDrafts(nextDrafts));
  }, [drafts, positionToRankedIds]);
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

type DraftPlayerType = {
  name: string;
  season: string;
  points: number;
  teamId: string;
  pickIndex: number;
  playerId: number;
};
type DraftType = DraftPlayerType[];

function generate(
  drafts: DraftType[],
  positionToRankedIds: { [position: string]: string[] }
): DraftType[] | null {
  console.log({ drafts, now: Date.now() });
  if (drafts.length > MAX_GENERATIONS) {
    console.log({ MAX_GENERATIONS });
    return null;
  }
  const curr = drafts[drafts.length - 1];
  const prev = drafts[drafts.length - 2];
  const best = getBest(curr, prev, positionToRankedIds);
  if (best.position === "") {
    if (JSON.stringify(curr) === JSON.stringify(prev)) {
      console.log("stabilized");
      return null;
    }
    console.log("new generation", drafts.length);
    return drafts.concat([[]]);
  }
  return drafts.slice(0, -1).concat([curr.concat([best.result.player])]);
}

function getBest(
  curr: DraftType,
  prev: DraftType,
  positionToRankedIds: { [position: string]: string[] }
): {
  position: string;
  result: { score: number; player: DraftPlayerType };
} {
  return ["", "QB", "RB", "WR", "TE"]
    .map((position) => ({
      position,
      result: {
        score: curr.length > 5 ? 0 : position === "" ? 0 : 1,
        player: {
          name: "",
          season: "",
          points: 0,
          teamId: "",
          pickIndex: 0,
          playerId: 0,
        },
      },
    }))
    .sort((a, b) => b.result.score - a.result.score)[0];
}
