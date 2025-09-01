import { bubbleStyle, selectedWrapped } from "..";

export default function Performance() {
  return (
    <div>
      {Object.keys(Object.values(selectedWrapped().ffTeams)[0].rosters)
        .filter((weekNum) => weekNum !== "0")
        .flatMap((weekNum) => ({
          weekNum,
          matchups:
            selectedWrapped().ffMatchups[weekNum] ||
            Object.keys(selectedWrapped().ffTeams).map((teamId) => [teamId]),
        }))
        .map(({ weekNum, matchups }) => (
          <div key={weekNum}>
            <div style={bubbleStyle}>week {weekNum}</div>
            <div style={{ display: "flex", overflow: "scroll" }}>
              {matchups.map((matchup, i) => (
                <div
                  key={i}
                  style={{ ...bubbleStyle, backgroundColor: "grey" }}
                >
                  <div style={{ display: "flex", whiteSpace: "nowrap" }}>
                    {matchup
                      .map((teamId) =>
                        teamId === null
                          ? null
                          : selectedWrapped().ffTeams[teamId]
                      )
                      .map((team) => team!)
                      .map((team) => ({
                        ...team,
                        roster: team.rosters[weekNum],
                      }))
                      .map((team) => (
                        <div key={team.id} style={bubbleStyle}>
                          <h2>{team.name}</h2>
                          <h3>
                            {team.roster.starting
                              .map(
                                (playerId) =>
                                  selectedWrapped().nflPlayers[playerId]
                              )
                              .map((p) => p.scores[weekNum] || 0)
                              .reduce((a, b) => a + b, 0)
                              .toFixed(2)}
                          </h3>
                          <div>
                            started
                            <div>
                              {(weekNum === "0"
                                ? Object.entries(
                                    Object.entries(team.rosters)
                                      .map(([w, obj]) => ({ w, obj }))
                                      .filter(({ w }) => w !== "0")
                                      .flatMap(({ w, obj }) =>
                                        obj.starting.map((playerId) => ({
                                          playerId,
                                          w,
                                          score:
                                            selectedWrapped().nflPlayers[
                                              playerId
                                            ].scores[w] || 0,
                                        }))
                                      )
                                      .reduce((prev, curr) => {
                                        if (!prev[curr.playerId]) {
                                          prev[curr.playerId] = {
                                            score: 0,
                                            weeks: [],
                                          };
                                        }
                                        prev[curr.playerId].score += curr.score;
                                        prev[curr.playerId].weeks.push(curr.w);
                                        return prev;
                                      }, {} as { [playerId: string]: { score: number; weeks: string[] } })
                                  ).map(([playerId, obj]) => ({
                                    name: `${
                                      selectedWrapped().nflPlayers[playerId]
                                        .name
                                    } ${obj.weeks}`,
                                    ...obj,
                                  }))
                                : team.roster.starting
                                    .map(
                                      (playerId) =>
                                        selectedWrapped().nflPlayers[playerId]
                                    )
                                    .map((p) => ({
                                      ...p,
                                      score: p?.scores[weekNum] || 0,
                                    }))
                              )
                                .sort((a, b) => b.score - a.score)
                                .map((p, j) => (
                                  <div key={j}>
                                    {p.score.toFixed(2)} {p.name}
                                  </div>
                                ))}
                            </div>
                          </div>
                          <div>
                            bench
                            <div>
                              {team.roster.rostered
                                .filter(
                                  (playerId) =>
                                    !team.roster.starting.includes(playerId)
                                )
                                .map(
                                  (playerId) =>
                                    selectedWrapped().nflPlayers[playerId]
                                )
                                .map((p) => ({
                                  ...p,
                                  score: p?.scores[weekNum] || 0,
                                }))
                                .sort((a, b) => b.score - a.score)
                                .map((p, j) => (
                                  <div key={j}>
                                    {p.score.toFixed(2)} {p.name}
                                  </div>
                                ))}
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
    </div>
  );
}
