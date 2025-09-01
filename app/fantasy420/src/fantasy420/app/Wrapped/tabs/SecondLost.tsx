import { bubbleStyle, selectedWrapped } from "..";

export default function SecondLost() {
  return (
    <div>
      <div>
        <div>
          <div style={bubbleStyle}>SecondLost</div>
          <div>
            {Object.entries(selectedWrapped().ffMatchups)
              .map(([weekNum, matchups]) => ({ weekNum, matchups }))
              .filter(
                ({ weekNum }) =>
                  Object.values(selectedWrapped().ffTeams)[0].rosters[
                    weekNum
                  ] !== undefined
              )
              .map(({ weekNum, matchups }) => ({
                weekNum,
                matchups,
                scores: Object.values(selectedWrapped().ffTeams)
                  .map((t) => ({
                    t,
                    score: t.rosters[weekNum].starting
                      .map(
                        (playerId) =>
                          selectedWrapped().nflPlayers[playerId].scores[
                            weekNum
                          ]!
                      )
                      .reduce((a, b) => a + b, 0),
                  }))
                  .sort((a, b) => b.score - a.score),
              }))
              .map((o) => ({ ...o, second: o.scores[1].t.id }))
              .map((o) => ({
                ...o,
                first: o.matchups
                  .find((ms) => ms.includes(o.second))!
                  .find((m) => m !== o.second)!,
              }))
              .map((o) => (
                <div key={o.weekNum} style={bubbleStyle}>
                  {!(
                    o.scores.find((s) => s.t.id === o.second)!.score <
                    o.scores.find((s) => s.t.id === o.first)!.score
                  ) ? null : (
                    <div>
                      <div>week {o.weekNum}</div>
                      <div>
                        {selectedWrapped().ffTeams[o.second].name} lost to{" "}
                        {selectedWrapped().ffTeams[o.first].name}
                      </div>
                      <div>
                        {o.scores
                          .find((s) => s.t.id === o.second)!
                          .score.toFixed(2)}{" "}
                        to{" "}
                        {o.scores
                          .find((s) => s.t.id === o.first)!
                          .score.toFixed(2)}
                      </div>
                    </div>
                  )}
                </div>
              ))}
          </div>
        </div>
        <div style={bubbleStyle}>NinthWon</div>
        <div>
          {Object.entries(selectedWrapped().ffMatchups)
            .map(([weekNum, matchups]) => ({ weekNum, matchups }))
            .filter(
              ({ weekNum }) =>
                Object.values(selectedWrapped().ffTeams)[0].rosters[weekNum] !==
                undefined
            )
            .map(({ weekNum, matchups }) => ({
              weekNum,
              matchups,
              scores: Object.values(selectedWrapped().ffTeams)
                .map((t) => ({
                  t,
                  score: t.rosters[weekNum].starting
                    .map(
                      (playerId) =>
                        selectedWrapped().nflPlayers[playerId].scores[weekNum]!
                    )
                    .reduce((a, b) => a + b, 0),
                }))
                .sort((a, b) => a.score - b.score),
            }))
            .map((o) => ({ ...o, ninth: o.scores[1].t.id }))
            .map((o) => ({
              ...o,
              tenth: o.matchups
                .find((ms) => ms.includes(o.ninth))!
                .find((m) => m !== o.ninth)!,
            }))
            .map((o) => (
              <div key={o.weekNum} style={bubbleStyle}>
                {!(
                  o.scores.find((s) => s.t.id === o.ninth)!.score >
                  o.scores.find((s) => s.t.id === o.tenth)!.score
                ) ? null : (
                  <div>
                    <div>week {o.weekNum}</div>
                    <div>
                      {selectedWrapped().ffTeams[o.ninth].name} beat{" "}
                      {selectedWrapped().ffTeams[o.tenth].name}
                    </div>
                    <div>
                      {o.scores
                        .find((s) => s.t.id === o.ninth)!
                        .score.toFixed(2)}{" "}
                      to{" "}
                      {o.scores
                        .find((s) => s.t.id === o.tenth)!
                        .score.toFixed(2)}
                    </div>
                  </div>
                )}
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
