import { useEffect, useState } from "react";
import { SubIdealDraft } from "../IdealDraft";
import { selectedYear } from "../Wrapped";
import allWrapped from "../Wrapped/allWrapped";
import {
  DraftType,
  generate,
  getPositionToRankedDraftPlayers,
  getStart,
  RosterEnum,
} from "./search";

export default function BuildIdealDraft() {
  const [yearKey, updateYear] = useState(selectedYear);
  const [rosterEnum, updateRosterEnum] = useState(RosterEnum.flex);
  return (
    <div>
      <div>
        year:{" "}
        <select
          onChange={(e) => updateYear(e.target.value)}
          defaultValue={yearKey}
        >
          {Object.keys(allWrapped).map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>
      <SubBuildIdealDraft
        key={yearKey}
        yearKey={yearKey}
        rosterEnum={rosterEnum}
      />
    </div>
  );
}

function SubBuildIdealDraft(props: {
  yearKey: string;
  rosterEnum: RosterEnum;
}) {
  const wrapped = allWrapped[props.yearKey];
  const positionToRankedDraftPlayers = getPositionToRankedDraftPlayers(wrapped);
  var drafts: DraftType[];
  if (true) {
    const [switchDrafts, updateDrafts] = useState(
      getStart(wrapped, positionToRankedDraftPlayers, props.rosterEnum)
    );
    useEffect(() => {
      false &&
        Promise.resolve()
          .then(() =>
            generate(drafts, positionToRankedDraftPlayers, props.rosterEnum)
          )
          .then((nextDrafts) => nextDrafts && updateDrafts(nextDrafts));
    }, [switchDrafts, positionToRankedDraftPlayers, wrapped.ffTeams]);
    drafts = switchDrafts;
  } else {
    drafts = [];
  }
  return (
    <SubIdealDraft
      wrapped={wrapped}
      draftedPlayers={drafts.map((d) => d.draft)}
    />
  );
}
