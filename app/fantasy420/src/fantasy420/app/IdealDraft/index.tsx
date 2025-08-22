import { useEffect, useState } from "react";
import { bubbleStyle, groupByF, selectedWrapped } from "../Wrapped";
import {
  generate,
  getPositionToRankedDraftPlayers,
  getStart,
  scoreTeam,
} from "./search";

export default function IdealDraft() {
  const wrapped = selectedWrapped();
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
          .map((d) => ({
            d,
            scoresByTeam: Object.entries(
              groupByF(d.draft, (p) => p.ffTeamId)
            ).map(([ffTeamId, ps]) => ({ ffTeamId, score: scoreTeam(ps) })),
          }))
          .map((o, i) => (
            <div key={i} style={{ ...bubbleStyle, flexShrink: 0 }}>
              <h1>
                generation {i} ({o.d.draft.length})
              </h1>
              <div>
                {o.scoresByTeam
                  .sort((a, b) => b.score - a.score)
                  .map(({ ffTeamId, score }) => (
                    <div key={ffTeamId}>
                      {ffTeamId}={score.toFixed(2)}
                    </div>
                  ))}
              </div>
              <pre>
                {o.d.draft
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
