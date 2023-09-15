import { draft_json, normalize } from "../Draft";
import { wrapped } from "../Wrapped";
import rawPeaked from "./peaked.json";

export const peaked: { url: string; lines: string[] } = rawPeaked;

const playerToDraftPick = Object.fromEntries(
  draft_json.drafts[0].map((name, i) => [normalize(name), i + 1])
);

export default function Peaked() {
  const parsed = parse(
    peaked.lines,
    Object.values(wrapped.nflPlayers)
      .map((player) => player.name)
      .map(normalize)
  );
  const allNormalizedPlayers = Object.fromEntries(
    Object.entries(draft_json.espn.players).map(([playerName, o]) => [
      playerName,
      o.position,
    ])
  );
  const parsedPlayers: {
    [position: string]: { name: string; value: number }[];
  } = {};
  Object.entries(parsed)
    .map(([name, p]) => ({
      name,
      ...p,
      position: allNormalizedPlayers[name],
    }))
    .forEach(({ name, value, position }) => {
      parsedPlayers[position] = (parsedPlayers[position] || [])
        .concat({ name, value })
        .sort((a, b) => b.value - a.value);
    });
  const qbToNonQB = Object.fromEntries(
    parsedPlayers["QB"]
      .map((player, i) => ({ player, RB: parsedPlayers["RB"][i] }))
      .map((obj) => [
        obj.player.name,
        {
          ...obj.RB,
          title: `${obj.player.value} -> ${obj.RB.name}`,
        },
      ])
  );
  console.log(parsed);
  const teams = Object.values(wrapped.ffTeams)
    .map((team) => ({
      ...team,
      players: team.rosters["0"].rostered
        .map((playerId) => wrapped.nflPlayers[playerId].name)
        .map((name) => ({
          name,
          ...parsed[normalize(qbToNonQB[name]?.name || name)],
        }))
        .map(({ value, ...o }) => ({ ...o, value: value || 0 }))
        .sort((a, b) => b.value - a.value),
    }))
    .map((team) => ({
      ...team,
      score: team.players
        .map(({ value }) => value)
        .sort((a, b) => a - b)
        .reverse()
        .slice(0, 13)
        .reduce((a, b) => a + b, 0),
    }))
    .sort((a, b) => b.score - a.score);
  const owned = teams
    .flatMap((t) => t.players)
    .map((p) => p.name)
    .map(normalize);
  return (
    <div>
      <h1>{peaked.lines[0]}</h1>
      <div>
        <span
          style={{
            border: "2px solid black",
            borderRadius: "5px",
            margin: "10px",
            padding: "10px",
          }}
        >
          the nth best qb is as valuable as the nth best rb
        </span>
      </div>
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
                    {/* <th>Tier</th> */}
                  </tr>
                </thead>
                <tbody>
                  {team.players.map((player, j) => (
                    <tr key={j}>
                      <td title={qbToNonQB[player.name]?.title}>
                        {player.name} (
                        {playerToDraftPick[normalize(player.name)]})
                      </td>
                      <td>{qbToNonQB[player.name]?.value || player.value}</td>
                      {/* <td>{player.tier}</td> */}
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
                    {/* <th>Tier</th> */}
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
                    .filter(({ value }) => value > -150)
                    .sort((a, b) => b.value - a.value)
                    .map((player, i) => (
                      <tr key={i}>
                        <td>{player.name}</td>
                        <td>{player.value}</td>
                        {/* <td>{player.tier}</td> */}
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
