import { WrappedType } from "../FetchWrapped";
import { clog, groupByF } from "../Wrapped";

const MAX_GENERATIONS = 6;
const MAX_DEPTH = 3;
const A_CODE = 65;

const startDateNow = Date.now();

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

export enum RosterEnum {
  doubleflex,
  megaflex,
}

const allRosters = {
  [RosterEnum.doubleflex]: [
    ["QB"],
    ["RB"],
    ["RB"],
    ["WR"],
    ["WR"],
    ["TE"],
    ["RB", "WR", "TE"],
    ["RB", "WR", "TE"],
  ],
  [RosterEnum.megaflex]: [
    ["QB"],
    ["RB"],
    ["RB"],
    ["WR"],
    ["WR"],
    ["TE"],
    ["RB", "WR", "TE"],
    ["RB", "WR", "TE"],
    ["QB", "RB", "WR", "TE"],
  ],
};

function generate(
  drafts: DraftType[],
  positionToRankedDraftPlayers: {
    [k: string]: DraftPlayerType[];
  },
  rosterEnum: RosterEnum
): Promise<DraftType[] | null> {
  console.log(
    Date.now() - startDateNow,
    drafts.map((d) => d.draft.length)
  );
  const curr = drafts[drafts.length - 1];
  const prev = drafts[drafts.length - 2];
  const ffTeamId = prev.draft[curr.draft.length]?.ffTeamId;
  return Promise.resolve()
    .then(() =>
      getBest(curr, prev, positionToRankedDraftPlayers, ffTeamId, rosterEnum, 0)
    )
    .then((best) => {
      if (!best) {
        if (JSON.stringify(curr) === JSON.stringify(prev)) {
          clog("stabilized");
          return null;
        }
        if (drafts.length === MAX_GENERATIONS) {
          clog({ MAX_GENERATIONS });
          return null;
        }
        clog(`generation ${drafts.length}`);
        return drafts.concat([
          {
            draft: [],
            draftedIds: {},
            picksByTeamId: {},
            positionToCount: {},
          },
        ]);
      }
      return drafts.slice(0, -1).concat([updateDraft(curr, best)]);
    });
}

function updateDraft(curr: DraftType, best: DraftPlayerType): DraftType {
  return {
    draft: curr.draft.concat([best]),
    draftedIds: Object.assign({}, curr.draftedIds, { [best.playerId]: best }),
    picksByTeamId: Object.assign({}, curr.picksByTeamId, {
      [best.ffTeamId]: (curr.picksByTeamId[best.ffTeamId] || []).concat(best),
    }),
    positionToCount: Object.assign({}, curr.positionToCount, {
      [best.position]: (curr.positionToCount[best.position] || 0) + 1,
    }),
  };
}

function getBest(
  curr: DraftType,
  prev: DraftType,
  positionToRankedDraftPlayers: {
    [k: string]: DraftPlayerType[];
  },
  ffTeamId: string,
  rosterEnum: RosterEnum,
  depth: number
): Promise<DraftPlayerType | undefined> {
  return Promise.resolve().then(() => {
    const draftTeamId = prev.draft[curr.draft.length]?.ffTeamId;
    if (draftTeamId === undefined) return undefined;
    if (draftTeamId !== ffTeamId) {
      return {
        ...prev.draft.find((p) => !curr.draftedIds[p.playerId])!,
        ffTeamId: draftTeamId,
      };
    }
    return Promise.resolve()
      .then(() =>
        ["QB", "RB", "WR", "TE"].filter((position) =>
          hasSpace(position, curr.picksByTeamId[ffTeamId] || [], rosterEnum)
        )
      )
      .then((positions) =>
        positions
          .map((position) => ({
            ...positionToRankedDraftPlayers[position][
              curr.positionToCount[position] || 0
            ],
            ffTeamId,
          }))
          .map((player) =>
            getScore(
              updateDraft(curr, player),
              prev,
              positionToRankedDraftPlayers,
              ffTeamId,
              rosterEnum,
              depth + 1
            ).then((score) => ({ score, player }))
          )
      )
      .then((ps) => Promise.all(ps))
      .then(
        (os) =>
          os
            .filter(({ score }) => score !== 0)
            .sort((a, b) => b.score - a.score)[0].player
      );
  });
}

function hasSpace(
  position: string,
  myPicks: DraftPlayerType[],
  rosterEnum: RosterEnum
): boolean {
  const roster = allRosters[rosterEnum].slice();
  myPicks.forEach((p) =>
    roster.splice(
      roster.findIndex((r) => r.includes(p.position)),
      1
    )
  );
  return roster.find((r) => r.includes(position)) !== undefined;
}

async function getScore(
  _curr: DraftType,
  prev: DraftType,
  positionToRankedDraftPlayers: {
    [k: string]: DraftPlayerType[];
  },
  ffTeamId: string,
  rosterEnum: RosterEnum,
  depth: number
): Promise<number> {
  let curr = _curr;
  if (depth > MAX_DEPTH) return scoreTeam(curr.picksByTeamId[ffTeamId]!);
  while (true) {
    const best = await getBest(
      curr,
      prev,
      positionToRankedDraftPlayers,
      ffTeamId,
      rosterEnum,
      depth
    );
    if (!best) return scoreTeam(curr.picksByTeamId[ffTeamId]!);
    curr = updateDraft(curr, best);
  }
}

function scoreTeam(picks: DraftPlayerType[]): number {
  return picks.map((p) => p.score).reduce((a, b) => a + b, 0);
}

function getPositionToRankedDraftPlayers(wrapped: WrappedType): {
  [k: string]: DraftPlayerType[];
} {
  return Object.fromEntries(
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
          start: -3,
        })),
    ])
  );
}

function getStart(
  wrapped: WrappedType,
  positionToRankedDraftPlayers: {
    [k: string]: {
      score: number;
      position: string;
      playerId: number;
      ffTeamId: string;
    }[];
  },
  rosterEnum: RosterEnum
): DraftType[] {
  const initialDraft = Object.values(wrapped.ffTeams)
    .sort((a, b) => a.draft[0].pickIndex - b.draft[0].pickIndex)
    .flatMap((t, i) =>
      t.draft
        .map((o) => ({ o, p: wrapped.nflPlayers[o.playerId] }))
        .map(({ o, p }) => ({
          ...o,
          start: -1,
          score: p.total,
          ffTeamId: String.fromCharCode(A_CODE + i),
          position: p.position,
        }))
    )
    .sort((a, b) => a.pickIndex - b.pickIndex)
    .map(({ pickIndex, ...p }) => p);
  const poppable = Object.fromEntries(
    Object.entries(positionToRankedDraftPlayers).map(([k, v]) => [k, v.slice()])
  );
  const sortedDraft = initialDraft
    .slice(
      0,
      allRosters[rosterEnum].length * Object.entries(wrapped.ffTeams).length
    )
    .map((p) => ({
      ...poppable[p.position].shift()!,
      ffTeamId: p.ffTeamId,
      start: -2,
    }));
  return [initialDraft, sortedDraft, []].map((draft) => ({
    draft,
    draftedIds: {},
    picksByTeamId: {},
    positionToCount: {},
  }));
}

export { generate, getPositionToRankedDraftPlayers, getStart, scoreTeam };
