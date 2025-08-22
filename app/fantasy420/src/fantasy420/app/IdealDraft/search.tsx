import { clog } from "../Wrapped";

const MAX_GENERATIONS = 5;

export type DraftPlayerType = {
  position: string;
  ffTeamId: string;
  playerId: number;
  score: number;
};
export type DraftType = {
  draft: DraftPlayerType[];
  draftedIds: {
    [k: string]: number;
  };
  picksByTeamId: { [k: string]: DraftPlayerType[] | undefined };
  positionToCount: { [k: string]: number | undefined };
};

export const ROSTER = [
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

function generate(
  drafts: DraftType[],
  positionToRankedDraftPlayers: {
    [k: string]: DraftPlayerType[];
  }
): DraftType[] | null {
  clog({ drafts, now: Date.now() });
  const curr = drafts[drafts.length - 1];
  const prev = drafts[drafts.length - 2];
  const start = curr.draft.length;
  const ffTeamId = prev.draft[start]?.ffTeamId;
  const best = getBest(
    curr,
    prev,
    positionToRankedDraftPlayers,
    ffTeamId,
    start,
    0
  );
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
  start: number,
  depth: number
): DraftPlayerType | undefined {
  const draftTeamId = prev.draft[curr.draft.length]?.ffTeamId;
  console.log({ depth, start, size: curr.draft.length, draftTeamId, ffTeamId });
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
        start,
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
  start: number,
  depth: number
): number {
  let iterDraft = curr;
  while (true) {
    const best = getBest(
      iterDraft,
      prev,
      positionToRankedDraftPlayers,
      ffTeamId,
      start,
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

export { generate };
