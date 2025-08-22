import { useEffect, useState } from "react";
import { bubbleStyle, selectedWrapped } from "../Wrapped";
import { generate, getPositionToRankedDraftPlayers, getStart } from "./search";

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
        {drafts.map((d, i) => (
          <div key={i} style={{ ...bubbleStyle, flexShrink: 0 }}>
            <h1>
              generation {i} ({d.draft.length})
            </h1>
            <pre>
              {d.draft
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
