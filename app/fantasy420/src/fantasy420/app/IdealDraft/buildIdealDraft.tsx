import { useCallback, useEffect, useState } from "react";
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
  const [rosterEnum, updateRosterEnum] = useState(
    RosterEnum[RosterEnum.doubleflex]
  );
  return (
    <div>
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
        <div>
          rosterEnum:{" "}
          <select
            onChange={(e) => updateRosterEnum(e.target.value)}
            defaultValue={yearKey}
          >
            {Object.keys(RosterEnum)
              .filter((k) => isNaN(parseInt(k)))
              .map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
          </select>
        </div>
      </div>
      <SubBuildIdealDraft
        key={`${yearKey}.${rosterEnum}`}
        yearKey={yearKey}
        rosterEnum={RosterEnum[rosterEnum as keyof typeof RosterEnum]}
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
  const [drafts, updateDrafts] = useState<DraftType[] | null>(null);
  const generateInBrowser = useCallback(
    () =>
      Promise.resolve()
        .then(() =>
          drafts === null
            ? getStart(wrapped, positionToRankedDraftPlayers, props.rosterEnum)
            : generate(drafts, positionToRankedDraftPlayers, {
                year: selectedYear,
                maxDepth: 1,
                maxGenerations: 1,
                numTeams: Object.keys(wrapped.ffTeams).length,
                rosterEnum: props.rosterEnum,
              })
        )
        .then((nextDrafts) => nextDrafts && updateDrafts(nextDrafts)),
    [drafts, positionToRankedDraftPlayers, wrapped, props.rosterEnum]
  );
  useEffect(() => {
    false && generateInBrowser();
  }, [generateInBrowser]);
  if (!drafts) return <div>loading...</div>;
  return (
    <SubIdealDraft
      wrapped={wrapped}
      draftedPlayers={drafts.map((d) => d.draft)}
    />
  );
}
