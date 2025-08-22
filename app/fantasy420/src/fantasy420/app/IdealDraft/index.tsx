import { useEffect, useState } from "react";
import { bubbleStyle, groupByF, selectedYear } from "../Wrapped";
import allWrapped from "../Wrapped/allWrapped";
import {
  generate,
  getPositionToRankedDraftPlayers,
  getStart,
  scoreTeam,
} from "./search";

export default function IdealDraft() {
  const [yearKey, updateYear] = useState(selectedYear);
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
      <SubIdealDraft key={yearKey} yearKey={yearKey} />
    </div>
  );
}

function SubIdealDraft(props: { yearKey: string }) {
  const wrapped = allWrapped[props.yearKey];
  const positionToRankedDraftPlayers = getPositionToRankedDraftPlayers(wrapped);
  const [drafts, updateDrafts] = useState(
    getStart(wrapped, positionToRankedDraftPlayers)
  );
  const playerIdToPositionSeasonRank = Object.fromEntries(
    Object.values(positionToRankedDraftPlayers).flatMap((ps) =>
      ps.map((p, i) => [p.playerId, i])
    )
  );
  useEffect(() => {
    Promise.resolve()
      .then(() => generate(drafts, positionToRankedDraftPlayers))
      .then((nextDrafts) => nextDrafts && updateDrafts(nextDrafts));
  }, [drafts, positionToRankedDraftPlayers, wrapped.ffTeams]);
  return (
    <div>
      <div style={{ display: "flex", alignItems: "baseline" }}>
        {drafts
          .map((d) => d.draft)
          .map((d, i) => (
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
                        .map((p) => wrapped.nflPlayers[p.playerId].name)
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
