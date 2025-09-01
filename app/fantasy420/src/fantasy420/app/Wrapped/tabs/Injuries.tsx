import { bubbleStyle, selectedWrapped } from "..";

export default function Injuries() {
  return (
    <div style={{ display: "flex", flexWrap: "wrap" }}>
      {Object.values(selectedWrapped().ffTeams)
        .map((t) => ({
          ...t,
          injuries: Object.values(t.rosters)
            .filter((r) => r.weekNum !== "0")
            .flatMap((r) =>
              r.rostered
                .map((playerId) => selectedWrapped().nflPlayers[playerId])
                .filter((p) => p)
                .map((o) => ({
                  weekNum: parseInt(r.weekNum),
                  rank:
                    Object.values(selectedWrapped().ffTeams)
                      .flatMap((team) => team.draft)
                      .find((p) => p.playerId === parseInt(o.id))?.pickIndex ||
                    Infinity,
                  currentScore: o.scores[r.weekNum] || 0,
                  followingScore: o.scores[parseInt(r.weekNum) + 1],
                  ...o,
                }))
                .filter(
                  (o) =>
                    (r.starting.includes(o.id) || o.currentScore !== 0) &&
                    o.followingScore === 0 &&
                    !t.rosters[parseInt(r.weekNum) + 1]?.starting.includes(o.id)
                )
                .map((o) => ({
                  ...o,
                  rawWeekNums: Object.entries(o.scores)
                    .map(([weekNum, score]) => ({
                      weekNum: parseInt(weekNum),
                      score,
                    }))
                    .sort((a, b) => a.weekNum - b.weekNum)
                    .filter((s) => s.weekNum > o.weekNum),
                }))
                .map((o) => ({
                  ...o,
                  weekNums: o.rawWeekNums
                    .slice(
                      0,
                      o.rawWeekNums
                        .map((s, i) => ({ s, i }))
                        .find(({ s }) => s.score !== 0)?.i
                    )
                    .map((s) => s.weekNum),
                }))
                .map((o) => ({
                  ...o,
                  weekNumsStr:
                    o.weekNums.length === 1
                      ? `week ${o.weekNums[0]}`
                      : `weeks ${o.weekNums[0]}-${
                          o.weekNums[o.weekNums.length - 1]
                        }`,
                }))
            )
            .sort((a, b) => a.rank - b.rank),
        }))
        .map((team) => (
          <div key={team.id} style={bubbleStyle}>
            <h1>
              {team.name} ({team.injuries.length})
            </h1>
            {team.injuries.map((injury, i) => (
              <div key={i}>
                {injury.name} ({injury.rank + 1}) injured {injury.weekNumsStr}{" "}
                after scoring {injury.currentScore}
              </div>
            ))}
          </div>
        ))}
    </div>
  );
}
