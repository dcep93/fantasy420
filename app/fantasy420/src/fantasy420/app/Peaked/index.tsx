import { FetchedType } from "../Fetch";
import rawFetched from "../Fetch/fetched.json";
import rawPeaked from "./peaked.json";

export default function Peaked() {
  const peaked: { url: string; lines: string[] } = rawPeaked;
  const fetched: FetchedType = rawFetched;
  const parsed = parse(
    peaked.lines,
    rawFetched.teams
      .flatMap(({ players }) => players)
      .map((player) => player.name)
      .map(normalize)
  );
  const teams = fetched.teams
    .map((team) => ({
      ...team,
      players: team.players
        .map((player) => player.name)
        .map((player) => ({
          name: player,
          ...parsed[normalize(player)],
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
  const owned = fetched.teams
    .flatMap((team) => team.players)
    .map((player) => player.name)
    .map(normalize);
  return (
    <div>
      <h1>{peaked.lines[0]}</h1>
      <div style={{ width: "100vw", display: "flex", overflow: "scroll" }}>
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
        <div>
          <div>
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
                <div>UNOWNED</div>
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
                  {Object.entries(parsed)
                    .map(([name, obj]) => ({
                      name,
                      ...obj,
                    }))
                    .filter(({ name }) => !owned.includes(name))
                    .filter(({ name }) => name.includes(" "))
                    .filter(({ value }) => value < 150)
                    .sort((a, b) => b.value - a.value)
                    .map((player, i) => (
                      <tr key={i}>
                        <td>{player.name}</td>
                        <td>{player.value}</td>
                        <td>{player.tier}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
      <pre hidden style={{ overflow: "scroll" }}>
        {JSON.stringify(parsed, null, 2)}
      </pre>
      <img style={{ width: "95%" }} src={peaked.url} alt={peaked.url} />
      <pre style={{ overflow: "scroll" }}>
        {JSON.stringify(peaked, null, 2)}
      </pre>
    </div>
  );
}

type ParsedType = { [name: string]: { value: number; tier: number } };
function parse(lines: string[], all_players: string[]): ParsedType {
  const parsed: ParsedType = {};
  for (let i = 0; i < lines.length; i++) {
    let [v, ...words] = lines[i].split(" ");
    var value = parseFloat(v);
    if (!isNaN(value)) {
      const name_parts: string[] = [];
      for (let j = 0; j < words.length + 1; j++) {
        let word = words[j];
        let matched = (word || "").match(/^[A-Z.'-]+$/i);
        if (matched) {
          if (name_parts.length > 0 || !(word || "").match(/^((I+)|(Jr))$/)) {
            name_parts.push(word);
          }
        }
        let name = normalize(name_parts.join(" "));
        if (all_players.includes(name) || (!matched && name)) {
          if (!name.includes(" ")) {
            console.log("line", lines[i]);
          }
          parsed[name] = { value, tier: NaN };
          name_parts.splice(0);
        }
      }
    }
  }
  return parsed;
}

function normalize(name: string): string {
  return name
    .replaceAll("'", "")
    .replaceAll(".", "")
    .replaceAll("-", "")
    .replace("AmonRa Brown", "AmonRa St Brown")
    .replace(/Ken Walker III$/, "Kenneth Walker III");
}
