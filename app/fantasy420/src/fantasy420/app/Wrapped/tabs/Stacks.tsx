import { bubbleStyle, selectedWrapped } from "..";

export default function Stacks() {
  return (
    <div>
      {Object.values(selectedWrapped().nflPlayers)
        .filter((p) => p.position === "DST")
        .flatMap((p) =>
          Object.keys(p.scores)
            .filter((weekNum) => weekNum !== "0")
            .map((weekNum) => ({
              weekNum,
              ...p,
            }))
        )
        .map(({ weekNum, nflTeamId }) => ({
          weekNum,
          nflTeamId,
          players: Object.values(selectedWrapped().nflPlayers)
            .filter((p) => p.nflTeamId === nflTeamId)
            .map((p) => ({ ...p, score: p.scores[weekNum]! }))
            .filter((p) => p.score !== undefined)
            .sort((a, b) => b.score - a.score)
            .slice(0, 2),
        }))
        .map((o) => ({
          ...o,
          sum: o.players.map((p) => p.score).reduce((a, b) => a + b, 0),
        }))
        .sort((a, b) => b.sum - a.sum)
        .slice(0, 50)
        .map((o, i) => (
          <div key={i}>
            <div style={bubbleStyle}>
              {o.sum.toFixed(2)} week {o.weekNum}
              <div>
                {o.players.map((p) => (
                  <div key={p.id}>
                    {p.name} {p.score.toFixed(2)}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
    </div>
  );
}
