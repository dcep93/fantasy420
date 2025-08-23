import { useState } from "react";
import idealDraftJson from "../BuildIdealDraft/idealDraft.json";
import {
  DraftPlayerType,
  getPositionToRankedDraftPlayers,
  RosterEnum,
  scoreTeam,
} from "../BuildIdealDraft/search";
import { bubbleStyle } from "../Draft";
import { WrappedType } from "../FetchWrapped";
import { groupByF, selectedYear } from "../Wrapped";
import allWrapped from "../Wrapped/allWrapped";

export default function IdealDraft() {
  const [yearKey, updateYear] = useState(selectedYear);
  const [rosterEnum, updateRosterEnum] = useState(RosterEnum[RosterEnum.flex]);
  const wrapped = allWrapped[yearKey];
  const draftedPlayers = idealDraftJson.find(
    (d) =>
      d.config.year === yearKey &&
      RosterEnum[d.config.rosterEnum] === rosterEnum
  )?.draftPlayers;
  return (
    <div>
      <div>
        <div>
          year:{" "}
          <select
            onChange={(e) => updateYear(e.target.value)}
            defaultValue={yearKey}
          >
            {Array.from(
              new Set(
                idealDraftJson
                  .filter((d) => RosterEnum[d.config.rosterEnum] === rosterEnum)
                  .map((d) => d.config.year)
              )
            ).map((y) => (
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
            {Array.from(
              new Set(idealDraftJson.map((d) => d.config.rosterEnum))
            ).map((k) => (
              <option key={k} value={k}>
                {RosterEnum[k]}
              </option>
            ))}
          </select>
        </div>
      </div>
      {draftedPlayers && (
        <SubIdealDraft
          key={`${yearKey}.${rosterEnum}`}
          wrapped={wrapped}
          draftedPlayers={draftedPlayers}
        />
      )}
    </div>
  );
}

export function SubIdealDraft(props: {
  wrapped: WrappedType;
  draftedPlayers: DraftPlayerType[][];
}) {
  const positionToRankedDraftPlayers = getPositionToRankedDraftPlayers(
    props.wrapped
  );
  const playerIdToPositionSeasonRank = Object.fromEntries(
    Object.values(positionToRankedDraftPlayers).flatMap((ps) =>
      ps.map((p, i) => [p.playerId, i])
    )
  );
  return (
    <div>
      <div style={{ display: "flex", alignItems: "baseline" }}>
        {props.draftedPlayers.map((d, i) => (
          <div key={i} style={{ ...bubbleStyle, flexShrink: 0 }}>
            <h1>
              generation {i} ({d.length})
            </h1>
            <div>
              {Object.entries(groupByF(d, (p) => p.ffTeamId))
                .map(([ffTeamId, ps]) => ({
                  ffTeamId,
                  score: scoreTeam(ps),
                  ps,
                }))
                .sort((a, b) => b.score - a.score)
                .map(({ ffTeamId, score, ps }) => (
                  <div
                    key={ffTeamId}
                    title={ps
                      .map((p) => props.wrapped.nflPlayers[p.playerId].name)
                      .join("\n")}
                  >
                    {ffTeamId}={score.toFixed(2)}
                  </div>
                ))}
            </div>
            <pre>
              {d
                .map((p) => ({
                  p,
                  wp: props.wrapped.nflPlayers[p.playerId],
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
