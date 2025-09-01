import { bubbleStyle, Helpers, Position, selectedWrapped } from "..";

export default function UniquesRostered() {
  return (
    <div>
      {Object.values(Position)
        .filter((p) => Number.isInteger(p))
        .map((p) => p as Position)
        .filter((p) => p > 0)
        .map((p) => (
          <div key={p}>
            <div style={bubbleStyle}>
              {Position[p]}
              <div>
                {Object.values(selectedWrapped().ffTeams)
                  .map((ffTeam) => ({
                    teamName: ffTeam.name,
                    started: Object.entries(
                      Helpers.countStrings(
                        Object.entries(ffTeam.rosters).flatMap(
                          ([weekNum, roster]) =>
                            weekNum === "0" ? [] : roster.rostered
                        )
                      )
                    )
                      .map(([playerId, c]) => ({
                        player: selectedWrapped().nflPlayers[playerId],
                        c,
                      }))
                      .filter(({ player }) => player?.position === Position[p])
                      .map(({ player, c }) => `${player.name}: ${c}`),
                  }))
                  .sort((a, b) => a.started.length - b.started.length)
                  .map(({ teamName, started }, i) => (
                    <div key={i}>
                      <b>
                        {teamName}: ({started.length})
                      </b>{" "}
                      - {started.join(" , ")}
                    </div>
                  ))}
              </div>
            </div>
          </div>
        ))}
    </div>
  );
}
