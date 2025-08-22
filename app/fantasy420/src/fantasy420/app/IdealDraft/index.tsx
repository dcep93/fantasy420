import { useEffect, useState } from "react";
import { bubbleStyle, clog, groupByF, selectedWrapped } from "../Wrapped";

const MAX_GENERATIONS = 5;
const A_CODE = 65;
const ROSTER = [
  ["QB"],
  ["RB"],
  ["RB"],
  ["WR"],
  ["WR"],
  ["TE"],
  ["RB", "WR", "TE"],
  ["RB", "WR", "TE"],
  ["QB", "RB", "WR", "TE"],
];

export default function IdealDraft() {
  const wrapped = selectedWrapped();
  const initialDraft = Object.values(wrapped.ffTeams)
    .sort((a, b) => a.draft[0].pickIndex - b.draft[0].pickIndex)
    .flatMap((t, i) =>
      t.draft.map((o) => ({
        ...o,
        ffTeamId: String.fromCharCode(A_CODE + i),
        position: wrapped.nflPlayers[o.playerId].position,
      }))
    )
    .sort((a, b) => a.pickIndex - b.pickIndex)
    .map(({ pickIndex, ...p }) => p) as DraftPlayerType[];
  const positionToRankedDraftPlayers = Object.fromEntries(
    Object.entries(
      groupByF(Object.values(wrapped.nflPlayers), (p) => p.position)
    ).map(([position, players]) => [
      position,
      players
        .sort((a, b) => b.total - a.total)
        .map((p) => ({
          score: p.total,
          position: p.position,
          playerId: parseInt(p.id),
          ffTeamId: "",
        })),
    ])
  );
  const playerIdToPositionSeasonRank = Object.fromEntries(
    Object.values(positionToRankedDraftPlayers).flatMap((ps) =>
      ps.map((p, i) => [p.playerId, i])
    )
  );
  const poppable = Object.fromEntries(
    Object.entries(positionToRankedDraftPlayers).map(([k, v]) => [k, v.slice()])
  );
  const sortedDraft = initialDraft
    .slice(0, ROSTER.length * Object.entries(wrapped.ffTeams).length)
    .map((p) => poppable[p.position].shift()!) as DraftPlayerType[];
  const [drafts, updateDrafts] = useState(
    [initialDraft, sortedDraft, []].map((draft) => ({
      draft,
      draftedIds: {},
      picksByTeamId: {},
      positionToCount: {},
    }))
  );
  useEffect(() => {
    Promise.resolve()
      .then(() => generate(drafts, positionToRankedDraftPlayers))
      .then((nextDrafts) => nextDrafts && updateDrafts(nextDrafts));
  }, [drafts, positionToRankedDraftPlayers, wrapped.ffTeams]);
  return (
    <div>
      <div style={{ display: "flex", alignItems: "baseline" }}>
        {drafts.map((d, i) => (
          <div key={i} style={{ ...bubbleStyle, flexShrink: 0 }}>
            <h1>
              generation {i} ({d.draft.length})
            </h1>
            <pre>
              {d.draft
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
  score: number;
};
type DraftType = {
  draft: DraftPlayerType[];
  draftedIds: {
    [k: string]: number;
  };
  picksByTeamId: { [k: string]: DraftPlayerType[] | undefined };
  positionToCount: { [k: string]: number | undefined };
};

function generate(
  drafts: DraftType[],
  positionToRankedDraftPlayers: {
    [k: string]: DraftPlayerType[];
  }
): DraftType[] | null {
  clog({ drafts, now: Date.now() });
  const curr = drafts[drafts.length - 1];
  const prev = drafts[drafts.length - 2];
  const ffTeamId = prev.draft[curr.draft.length]?.ffTeamId;
  const best = getBest(curr, prev, positionToRankedDraftPlayers, ffTeamId, 0);
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
    return drafts.concat([
      {
        draft: [],
        draftedIds: {},
        picksByTeamId: {},
        positionToCount: {},
      },
    ]);
  }
  return drafts.slice(0, -1).concat([updateDraft(curr, best, ffTeamId)]);
}

function updateDraft(
  curr: DraftType,
  best: DraftPlayerType,
  ffTeamId: string
): DraftType {
  return {
    draft: curr.draft.concat([best]),
    draftedIds: Object.assign({}, { [best.playerId]: best }, curr.draftedIds),
    picksByTeamId: Object.assign(
      {},
      {
        [ffTeamId]: (curr.picksByTeamId[ffTeamId] || []).concat(best),
      },
      curr.picksByTeamId
    ),
    positionToCount: Object.assign(
      {},
      {
        [best.position]: curr.positionToCount[best.position] || 0 + 1,
      },
      curr.positionToCount
    ),
  };
}

function getBest(
  curr: DraftType,
  prev: DraftType,
  positionToRankedDraftPlayers: {
    [k: string]: DraftPlayerType[];
  },
  ffTeamId: string,
  depth: number
): DraftPlayerType | undefined {
  const draftTeamId = prev.draft[curr.draft.length]?.ffTeamId;
  if (draftTeamId === undefined) return undefined;
  if (draftTeamId !== ffTeamId) {
    return prev.draft.find((p) => !curr.draftedIds[p.playerId])!;
  }
  return ["QB", "RB", "WR", "TE"]
    .filter((position) =>
      hasSpace(position, curr.picksByTeamId[ffTeamId] || [])
    )
    .map((position) => ({
      ...positionToRankedDraftPlayers[position][
        curr.positionToCount[position] || 0
      ],
      ffTeamId,
    }))
    .map((player) => ({
      player,
      score: getScore(
        updateDraft(curr, player, ffTeamId),
        prev,
        positionToRankedDraftPlayers,
        ffTeamId,
        depth
      ),
    }))
    .filter(({ score }) => score !== 0)
    .sort((a, b) => b.score - a.score)[0].player;
}

function hasSpace(position: string, myPicks: DraftPlayerType[]): boolean {
  const roster = ROSTER.slice();
  myPicks.forEach((p) =>
    roster.splice(
      roster.findIndex((r) => r.includes(p.position)),
      1
    )
  );
  return roster.find((r) => r.includes(position)) !== undefined;
}

function getScore(
  curr: DraftType,
  prev: DraftType,
  positionToRankedDraftPlayers: {
    [k: string]: DraftPlayerType[];
  },
  ffTeamId: string,
  depth: number
): number {
  let iterDraft = curr;
  while (true) {
    const best = getBest(
      iterDraft,
      prev,
      positionToRankedDraftPlayers,
      ffTeamId,
      depth + 1
    );
    if (!best) {
      return curr.picksByTeamId[ffTeamId]!.map((p) => p.score).reduce(
        (a, b) => a + b,
        0
      );
    }
    iterDraft = updateDraft(
      iterDraft,
      best,
      prev.draft[curr.draft.length]?.ffTeamId
    );
  }
}
