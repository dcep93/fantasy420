import { useState } from "react";
import idealDraftJson from "../BuildIdealDraft/idealDraft.json";
import {
  DraftPlayerType,
  getPositionToRankedDraftPlayers,
  MAX_DEPTH,
  RosterEnum,
  scoreTeam,
} from "../BuildIdealDraft/search";
import { bubbleStyle } from "../Draft";
import { WrappedType } from "../FetchWrapped";
import { groupByF, selectedYear } from "../Wrapped";
import allWrapped from "../Wrapped/allWrapped";

export default function IdealDraft() {
  const [yearKey, updateYear] = useState(selectedYear);
  const [rosterEnum, updateRosterEnum] = useState(
    RosterEnum[RosterEnum.megaflex]
  );
  console.log({ yearKey, rosterEnum });
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
            {Array.from(new Set(idealDraftJson.map((d) => d.config.rosterEnum)))
              .map((k) => RosterEnum[k])
              .map((k) => (
                <option key={k} value={k}>
                  {k}
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
  const [help, updateHelp] = useState(false);
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
      <div>
        <div style={bubbleStyle} onClick={() => updateHelp(!help)}>
          help
        </div>
        {!help ? null : (
          <ol>
            <li>
              this intends to prove that contrary to{" "}
              <a href="https://subvertadown.com/tap-that-draft/6ba9a033-e1fa-4d4f-bec0-15b06f4a93f9">
                TapThatDraft
              </a>
              , superflex drafters should take QBs first
            </li>
            <li>
              interestingly, the findings seem to say that taking RB/WR first
              isn't so crazy
            </li>
            <li>
              credibility is reduced since there are many approximations and
              assumptions made
            </li>
            <li>approximate that managers want to draft only starters</li>
            <li>
              compute value equal to the total season scores of all starters
            </li>
            <li>
              ignore real-world tradeoffs like injury risk, boom/bust,
              transparency, age, and the misery of cheering for a jets player
            </li>
            <li>
              for many reasons, the start of the draft should reveal the most
              interesting trends
            </li>
            <li>generation 0 is our real draft</li>
            <li>
              generation 1 is the first N draft places needed to fill a roster,
              ordering by score but keeping positions the same
            </li>
            <li>
              generation N &gt; 1 maximizes a manager's score by simulating the
              rest of the draft, stopping after they have made {MAX_DEPTH} more
              picks
            </li>
            <li>
              this adds significant doubt on the results, but assume that the
              other managers will blindly follow ADP from generation N-1 to
              choose their picks
            </li>
            <li>doubleflex means 2 flexes</li>
            <li>megaflex means 2 flexes and one superflex</li>
            <li>
              I didn't prune at all, so maybe results become a bit more
              credible, but it also takes an hour to generate the results data
            </li>
          </ol>
        )}
      </div>
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
