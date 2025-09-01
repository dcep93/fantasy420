import { bubbleStyle, selectedWrapped } from "..";

export default function GooseEggs() {
  return (
    <div style={{ display: "flex", flexWrap: "wrap" }}>
      {Object.values(selectedWrapped().ffTeams).map((team, teamIndex) => (
        <div key={teamIndex}>
          <div style={bubbleStyle}>
            <h4>{team.name}</h4>
            <div>
              {Object.entries(
                Object.entries(team.rosters)
                  .flatMap(([weekNum, r]) =>
                    r.starting.map((playerId) => ({
                      weekNum,
                      p: selectedWrapped().nflPlayers[playerId],
                    }))
                  )
                  .map((o) => ({ ...o, score: o.p.scores[o.weekNum]! }))
                  .filter(({ score }) => score <= 0)
                  .reduce((prev, curr) => {
                    prev[curr.p.name] = (prev[curr.p.name] || []).concat(
                      curr.weekNum
                    );
                    return prev;
                  }, {} as { [name: string]: string[] })
              )
                .map(([name, gooseEggs]) => ({ name, gooseEggs }))
                .sort((a, b) => b.gooseEggs.length - a.gooseEggs.length)
                .map((p) => `${p.name} -> ${p.gooseEggs}`)
                .map((str, i) => (
                  <div key={i}>{str}</div>
                ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
