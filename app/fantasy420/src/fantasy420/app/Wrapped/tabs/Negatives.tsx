import { Position, selectedWrapped } from "..";

export default function Negatives() {
  return (
    <div>
      {Object.values(selectedWrapped().nflPlayers)
        .flatMap((p) =>
          Object.entries(p.scores).map(([weekNum, score]) => ({
            ...p,
            started: Object.values(selectedWrapped().ffTeams).find((t) =>
              t.rosters[weekNum]?.starting.includes(p.id)
            )?.name,
            weekNum,
            score: score!,
          }))
        )
        .filter((p) => p.weekNum !== "0")
        .filter((p) => p.position !== Position[Position.DST])
        .filter((p) => p.score < 0)
        .sort((a, b) => a.score - b.score)
        .map((p, i) => (
          <div key={i}>
            week {p.weekNum} {p.name} scored {p.score}{" "}
            {p.started && `(${p.started})`}
          </div>
        ))}
    </div>
  );
}
