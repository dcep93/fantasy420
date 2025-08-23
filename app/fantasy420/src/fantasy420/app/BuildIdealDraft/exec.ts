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
    console.log(config);
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
    years: Object.keys(allWrapped),
    rosterEnums: Object.keys(RosterEnum)
      .map((rosterEnum) => parseInt(rosterEnum))
      .filter((rosterEnum) => !isNaN(rosterEnum)),
  }))
  .then(({ years, rosterEnums }) =>
    years.flatMap((year) =>
      rosterEnums.map((rosterEnum) => ({ year, rosterEnum }))
    )
  )
  .then((configs) => configs.map((config) => () => processCombination(config)))
  .then(runSequential)
  .then(console.log);
