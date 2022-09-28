import raw_generated from "./generated.json";

export default function Peaked() {
  const generated: {
    peaked: { url: string; lines: string[] };
    teams: { name: string; players: string[] }[];
  } = raw_generated;
  const parsed = parse(
    generated.peaked.lines,
    generated.teams.flatMap(({ players }) => players)
  );
  const teams = generated.teams
    .map((team) => ({
      ...team,
      players: team.players
        .map((player) => ({
          name: player,
          ...parsed[player],
        }))
        .sort((a, b) => (b.value || 0) - (a.value || 0)),
    }))
    .map((team) => ({
      ...team,
      score: team.players
        .map(({ value }) => value || 0)
        .reduce((a, b) => a + b, 0),
    }))
    .sort((a, b) => b.score - a.score);
  return (
    <div>
      <h1>{generated.peaked.lines[0]}</h1>
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
              <table style={{ whiteSpace: "nowrap" }}>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Value</th>
                    <th>Tier</th>
                  </tr>
                </thead>
                <tbody>
                  {team.players.map((player, j) => (
                    <tr key={j}>
                      <td>{player.name}</td>
                      <td>{player.value}</td>
                      <td>{player.tier}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
      <pre hidden style={{ overflow: "scroll" }}>
        {JSON.stringify(parsed, null, 2)}
      </pre>
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

type ParsedType = { [name: string]: { value: number; tier: number } };
function parse(lines: string[], all_players: string[]): ParsedType {
  const parsed: ParsedType = {};
  var tier = undefined;
  for (let i = 0; i < lines.length; i++) {
    let [v, ...words] = lines[i].split(" ");
    if (v === "Tier") {
      tier = parseInt(words[0]);
    } else if (tier !== undefined) {
      const value = parseFloat(v);
      if (!isNaN(value)) {
        const name_parts: string[] = [];
        for (let j = 0; j < words.length + 1; j++) {
          let word = words[j];
          let matched = (word || "").match(/^[A-Z.'-]+$/i);
          if (matched) {
            name_parts.push(word);
          }
          let name = name_parts
            .join(" ")
            .replace("AJ. Brown", "A.J. Brown")
            .replace("Ken Walker III", "Kenneth Walker III");
          if (all_players.includes(name)) {
            parsed[name] = { value, tier };
            name_parts.splice(0);
          }
          if (!matched) {
            name_parts.splice(0);
          }
        }
      }
    }
  }
  return parsed;
}
