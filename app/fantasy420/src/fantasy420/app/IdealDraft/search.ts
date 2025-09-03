import { WrappedType } from "../FetchWrapped";
import { groupByF } from "../Wrapped";

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

export type ConfigType = {
  year: string;
  rosterEnum: RosterEnum;
  maxDepth: number;
  maxGenerations: number;
  numTeams: number;
};

function generate(
  drafts: DraftType[],
  positionToRankedDraftPlayers: {
    [k: string]: DraftPlayerType[];
  },
  config: ConfigType
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
      getBest(curr, prev, positionToRankedDraftPlayers, ffTeamId, config, 0)
    )
    .then((best) => {
      if (!best) {
        if (JSON.stringify(curr) === JSON.stringify(prev)) {
          console.log("stabilized");
          return null;
        }
        if (drafts.length === config.maxGenerations) {
          console.log("maxGenerations");
          return null;
        }
        console.log(`${config} generation ${drafts.length}`);
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
  config: ConfigType,
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
    if (depth > config.maxDepth) {
      return {
        ...prev.draft.find(
          (p) =>
            !curr.draftedIds[p.playerId] &&
            hasSpace(p.position, curr.picksByTeamId[ffTeamId] || [], config)
        )!,
        ffTeamId,
      };
    }
    return Promise.resolve()
      .then(() =>
        ["QB", "RB", "WR", "TE"].filter((position) =>
          hasSpace(position, curr.picksByTeamId[ffTeamId] || [], config)
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
              config,
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
  config: ConfigType
): boolean {
  const roster = allRosters[config.rosterEnum].slice();
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
  config: ConfigType,
  depth: number
): Promise<number> {
  let curr = _curr;
  while (true) {
    const best = await getBest(
      curr,
      prev,
      positionToRankedDraftPlayers,
      ffTeamId,
      config,
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

function getFFTeamId(pickIndex: number, numTeams: number): string {
  const roundIndex = pickIndex % (2 * numTeams);
  const teamIndex =
    roundIndex < numTeams ? roundIndex : 2 * numTeams - 1 - roundIndex;
  return String.fromCharCode(A_CODE + teamIndex);
}

function getStart(
  wrapped: WrappedType,
  positionToRankedDraftPlayers: {
    [k: string]: DraftPlayerType[];
  },
  rosterEnum: RosterEnum
): DraftType[] {
  const numTeams =
    parseInt(process.env.NUM_TEAMS || "") ||
    Object.values(wrapped.ffTeams).length;
  const initialDraft = Object.values(wrapped.ffTeams)
    .flatMap((t) =>
      t.draft
        .map((o) => ({ o, p: wrapped.nflPlayers[o.playerId] }))
        .map(({ o, p }) => ({
          ...o,
          start: -1,
          score: p.total,
          ffTeamId: getFFTeamId(o.pickIndex, numTeams),
          position: p.position,
        }))
    )
    .sort((a, b) => a.pickIndex - b.pickIndex)
    .map(({ pickIndex, ...p }) => p);
  const poppable = Object.fromEntries(
    Object.entries(positionToRankedDraftPlayers).map(([k, v]) => [k, v.slice()])
  );
  const sortedDraft = initialDraft
    .slice(0, allRosters[rosterEnum].length * numTeams)
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
