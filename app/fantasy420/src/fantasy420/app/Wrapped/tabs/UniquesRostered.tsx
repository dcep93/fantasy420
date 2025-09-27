import { bubbleStyle, Position, selectedWrapped } from "..";

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
                    rostered: ffTeam.rosters["0"].rostered
                      .map((playerId) => selectedWrapped().nflPlayers[playerId])
                      .filter((player) => player?.position === Position[p])
                      .map((player) => player.name),
                  }))
                  .sort((a, b) => a.rostered.length - b.rostered.length)
                  .map(({ teamName, rostered }, i) => (
                    <div key={i}>
                      <b>
                        {teamName}: ({rostered.length})
                      </b>{" "}
                      - {rostered.join(" , ")}
                    </div>
                  ))}
              </div>
            </div>
          </div>
        ))}
    </div>
  );
}
