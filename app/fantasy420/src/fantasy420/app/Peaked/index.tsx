import raw_generated from "./generated.json";

export default function Peaked() {
  const generated: {
    peaked: { url: string; lines: string[] };
    teams: { name: string; players: string[] }[];
  } = raw_generated;
  const parsed = parse(generated.peaked.lines);
  const teams = generated.teams
    .map((team) => ({
      ...team,
      players: team.players.map((player) => ({
        name: player,
        ...parsed[player],
      })),
    }))
    .map((team) => ({
      ...team,
      score: team.players.map(({ value }) => value).reduce((a, b) => a + b, 0),
    }))
    .sort((a, b) => b.score - a.score);
  return (
    <div>
      <div style={{ width: "100vw", display: "flex" }}>
        {teams.map((team, i) => (
          <div key={i}>
            <div
              style={{
                border: "2px solid black",
                borderRadius: "5px",
                margin: "10px",
                padding: "10px",
              }}
            >
              <div
                style={{
                  display: "inline-block",
                  border: "2px solid black",
                  borderRadius: "5px",
                  margin: "10px",
                  padding: "10px",
                }}
              >
                <div># {i + 1}</div>
                <div>
                  {team.name} ({team.score})
                </div>
              </div>
              {team.players.map((player, j) => (
                <div key={j}>
                  {player.name} {player.value} {player.tier}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <img
        style={{ width: "95%" }}
        src={generated.peaked.url}
        alt={generated.peaked.url}
      />
      <pre style={{ overflow: "scroll" }}>
        {JSON.stringify(generated, null, 2)}
      </pre>
    </div>
  );
}

function parse(lines: string[]): {
  [name: string]: { value: number; tier: number };
} {
  return {};
}
