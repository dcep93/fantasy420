// npx ts-node ./exec.ts

import allWrapped from "../Wrapped/allWrapped";
import {
  DraftPlayerType,
  DraftType,
  generate,
  getPositionToRankedDraftPlayers,
  getStart,
  RosterEnum,
} from "./search";

type ConfigType = { year: string; rosterEnum: RosterEnum };

function processCombination(
  config: ConfigType
): Promise<{ config: ConfigType; draftPlayers: DraftPlayerType[][] }> {
  function helper(drafts: DraftType[]): Promise<{
    config: ConfigType;
    draftPlayers: DraftPlayerType[][];
  }> {
    return Promise.resolve()
      .then(() =>
        generate(drafts, positionToRankedDraftPlayers, config.rosterEnum)
      )
      .then((nextDrafts) =>
        nextDrafts === null
          ? { config, draftPlayers: drafts.map((d) => d.draft) }
          : helper(nextDrafts)
      );
  }
  const wrapped = allWrapped[config.year];
  const positionToRankedDraftPlayers = getPositionToRankedDraftPlayers(wrapped);
  return Promise.resolve()
    .then(() =>
      getStart(wrapped, positionToRankedDraftPlayers, config.rosterEnum)
    )
    .then(helper);
}

async function runSequential<T>(fns: (() => Promise<T>)[]): Promise<T[]> {
  const results: T[] = [];
  for (const fn of fns) {
    const res = await fn();
    results.push(res);
  }
  return results;
}

Promise.resolve()
  .then(() => ({
    years: Object.keys(allWrapped).filter((year) => year === "2025"),
    rosterEnums: Object.keys(RosterEnum).filter(
      (rosterEnum) => !isNaN(parseInt(rosterEnum))
    ),
  }))
  //   .then(() =>
  //     processCombination({ year: "2024", rosterEnum: RosterEnum.megaflex })
  //   )
  .then(console.log);
