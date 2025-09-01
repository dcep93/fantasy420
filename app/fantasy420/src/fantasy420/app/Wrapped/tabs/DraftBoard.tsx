import { bubbleStyle, selectedWrapped } from "..";
import { POSITION_COLORS } from "../../Draft";
import { getPerformance } from "./DraftValue";

export default function DraftBoard() {
  const performance = getPerformance();
  return (
    <div>
      <div style={{ display: "flex" }}>
        {Object.values(selectedWrapped().ffTeams)
          .map((t) =>
            t.draft
              .map((p) => ({
                p,
                t,
                p2: selectedWrapped().nflPlayers[p.playerId],
                p3: performance[p.playerId],
              }))
              .sort((a, b) => a.p.pickIndex - b.p.pickIndex)
          )
          .sort((a, b) => a[0].p.pickIndex - b[0].p.pickIndex)
          .map((o, i) => (
            <div
              key={i}
              style={{
                display: "inline-flex",
                flexDirection: "column",
              }}
            >
              {o.map((oo, j) => (
                <div
                  key={j}
                  style={{
                    ...bubbleStyle,
                    fontSize: "0.7em",
                    width: "10em",
                    height: "6em",
                    backgroundColor: POSITION_COLORS[oo.p2.position],
                  }}
                >
                  <div>
                    {oo.p.pickIndex + 1}
                    {")"} {oo.p2.position}
                    {oo.p3.draftRank + 1} {"/"} {oo.p3.totalRank + 1}
                  </div>
                  <div style={{ fontWeight: "bold" }}>{oo.p2.name}</div>
                  <div>{oo.t.name}</div>
                </div>
              ))}
            </div>
          ))}
      </div>
    </div>
  );
}
