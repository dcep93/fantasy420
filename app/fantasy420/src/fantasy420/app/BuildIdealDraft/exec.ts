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

console.log(generate, Object.keys(allWrapped));
