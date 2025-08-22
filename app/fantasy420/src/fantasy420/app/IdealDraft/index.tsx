import { useEffect, useState } from "react";
import { bubbleStyle, groupByF, selectedWrapped } from "../Wrapped";

const MAX_GENERATIONS = 4;
const ROSTER = [
  ["QB"],
  ["RB"],
  ["RB"],
  ["WR"],
  ["WR"],
  ["TE"],
  ["QB", "RB", "WR", "TE"],
  ["RB", "WR", "TE"],
  ["RB", "WR", "TE"],
];

export default function IdealDraft() {
  const wrapped = selectedWrapped();
  const initialDraft = Object.values(wrapped.ffTeams)
    .sort((a, b) => a.draft[0].pickIndex - b.draft[0].pickIndex)
    .flatMap((t, i) =>
      t.draft.map((o) => ({
        ...o,
        position: wrapped.nflPlayers[o.playerId].position,
        ffTeamId: "ABCDEFGHIJKLMNOP"[i],
      }))
    )
    .sort((a, b) => a.pickIndex - b.pickIndex)
    .map(({ pickIndex, ...p }) => p);
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
  const poppablePositionToRankedIds = Object.fromEntries(
    Object.entries(positionToRankedIds).map(([k, v]) => [k, v.slice()])
  );
  const sortedDraft = initialDraft
    .slice(0, ROSTER.length * Object.entries(wrapped.ffTeams).length)
    .map((p) => ({
      ...p,
      playerId: parseInt(
        poppablePositionToRankedIds[
          wrapped.nflPlayers[p.playerId].position
        ].shift()!
      ),
    }));
  const [drafts, updateDrafts] = useState([initialDraft, sortedDraft, []]);
  useEffect(() => {
    Promise.resolve()
      .then(() => generate(drafts))
      .then((nextDrafts) => nextDrafts && updateDrafts(nextDrafts));
  }, [drafts, positionToRankedIds, wrapped.ffTeams]);
  return (
    <div>
      <div style={{ display: "flex", alignItems: "baseline" }}>
        {drafts.map((d, i) => (
          <div key={i} style={bubbleStyle}>
            <h1>
              generation {i} ({d.length})
            </h1>
            <pre>
              {d
                .map((p) => ({
                  p,
                  wp: wrapped.nflPlayers[p.playerId],
                }))
                .map((o, j) => (
                  <div key={j}>
                    <div style={bubbleStyle}>
                      <div>
                        #{j + 1} {o.wp.name}
                      </div>
                      <div>
                        {o.wp.total} {o.wp.position}
                        {playerIdToPositionSeasonRank[o.p.playerId] + 1}
                      </div>
                      <div>team {o.p.ffTeamId}</div>
                    </div>
                  </div>
                ))}
            </pre>
          </div>
        ))}
      </div>
    </div>
  );
}

type DraftPlayerType = {
  position: string;
  ffTeamId: string;
  playerId: number;
};
type DraftType = DraftPlayerType[];

function generate(drafts: DraftType[]): DraftType[] | null {
  console.log({ drafts, now: Date.now() });
  const curr = drafts[drafts.length - 1];
  const prev = drafts[drafts.length - 2];
  const myTeamId = prev[curr.length].ffTeamId;
  const best = getBest(curr, prev, myTeamId);
  if (!best) {
    if (JSON.stringify(curr) === JSON.stringify(prev)) {
      console.log("stabilized");
      return null;
    }
    if (drafts.length === MAX_GENERATIONS) {
      console.log({ MAX_GENERATIONS });
      return null;
    }
    console.log("generation", drafts.length);
    return drafts.concat([[]]);
  }
  return drafts.slice(0, -1).concat([
    curr.concat([
      {
        ...best.player,
        ffTeamId: prev[curr.length].ffTeamId,
      },
    ]),
  ]);
}

function getBest(
  curr: DraftType,
  prev: DraftType,
  myTeamId: string
): { score: number; player: DraftPlayerType } | undefined {
  if (curr.length === prev.length) return undefined;
  const draftedIds = Object.fromEntries(curr.map((p) => [p.playerId, p]));
  const thisTeamId = prev[curr.length].ffTeamId;
  if (thisTeamId !== myTeamId) {
    return ((player) => ({ score: 0, player }))(
      prev.find((p) => !draftedIds[p.playerId])!
    );
  }
  const myPicks = curr
    .filter((p) => p.ffTeamId === myTeamId)
    .map((p) => selectedWrapped().nflPlayers[p.playerId].position);
  return ["QB", "RB", "WR", "TE"]
    .map((position) => ({
      position,
      player: prev.find(
        (p) => !draftedIds[p.playerId] && p.position === position
      )!,
    }))
    .filter(({ player }) => player)
    .map((p) => ({ ...p, score: getScore(p.position, myPicks), myPicks }))
    .filter(({ score }) => score !== 0)
    .sort((a, b) => b.score - a.score)[0];
}

function getScore(position: string, myPicks: string[]): number {
  const roster = ROSTER.slice();
  myPicks.forEach((p) =>
    roster.splice(
      roster.findIndex((r) => r.includes(p)),
      1
    )
  );
  if (roster.find((r) => r.includes(position)) === undefined) return 0;
  return Math.random();
}
