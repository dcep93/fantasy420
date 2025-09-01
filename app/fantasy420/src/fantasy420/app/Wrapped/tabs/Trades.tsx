import { bubbleStyle, groupByF, selectedWrapped } from "..";

export default function Trades() {
  const playerIdToWeekNumToOwnerId: Record<string, Record<string, string>> = {};
  Object.values(selectedWrapped().ffTeams).forEach((t) =>
    Object.values(t.rosters).map((r) =>
      r.rostered.forEach((playerId) => {
        if (!playerIdToWeekNumToOwnerId[playerId])
          playerIdToWeekNumToOwnerId[playerId] = {};
        playerIdToWeekNumToOwnerId[playerId][r.weekNum] = t.id;
      })
    )
  );
  return (
    <div>
      {Object.entries(
        groupByF(
          Object.values(selectedWrapped().ffTeams)
            .flatMap((t) =>
              Object.values(t.rosters)
                .filter((r) => r.weekNum !== "0" && r.weekNum !== "1")
                .flatMap((r) =>
                  r.rostered.map((playerId) => ({
                    t,
                    r,
                    playerId,
                    lastWeekOwnerId:
                      playerIdToWeekNumToOwnerId[playerId]?.[
                        Number(r.weekNum) - 1
                      ],
                  }))
                )
            )
            .filter((o) => o.lastWeekOwnerId !== o.t.id && o.lastWeekOwnerId),
          (o) => o.r.weekNum
        )
      ).map(([weekNum, os]) => (
        <div key={weekNum}>
          <div style={bubbleStyle}>
            <div>week {weekNum}</div>
            {os.map((o, i) => (
              <div
                key={i}
                style={bubbleStyle}
                title={Object.entries(
                  selectedWrapped().nflPlayers[o.playerId].scores
                )
                  .map(([scoreWeekNum, score]) => ({
                    scoreWeekNum,
                    str: `${scoreWeekNum}: ${score}`,
                  }))
                  .flatMap(({ scoreWeekNum, str }) =>
                    scoreWeekNum === weekNum ? ["TRADE", str] : [str]
                  )
                  .join("\n")}
              >
                <div style={{ fontWeight: "bold" }}>
                  {selectedWrapped().nflPlayers[o.playerId].name}
                </div>
                <div>{selectedWrapped().ffTeams[o.lastWeekOwnerId].name}</div>
                <div>{selectedWrapped().ffTeams[o.t.id].name}</div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
