import { useState } from "react";
import { normalize, NUM_TEAMS } from "./Draft";
import draft_json from "./draft.json";

const MANAGERS = [
  "Ahmed",
  "Dunc",
  "Neil",
  "Sourav",
  "Dan",
  "Heify",
  "Ruifan",
  "Jon",
  "George",
  "Bu",
];

function Value() {
  const [num_players, update] = useState(8);
  const final = draft_json.drafts[0];
  const extra_entries = Object.entries(draft_json.extra).reverse();
  const results = get_results(final, extra_entries, num_players);
  return (
    <div>
      <div>
        num_players:{" "}
        <input
          value={num_players}
          type="number"
          onChange={(e) => update(parseInt(e.currentTarget.value))}
        />
      </div>
      <div style={{ display: "flex", flexWrap: "wrap" }}>
        {results.map(({ players, scores, ranks }, i) => (
          <div
            key={i}
            style={{
              border: "2px solid black",
              borderRadius: "5px",
              margin: "10px",
              padding: "10px",
              textAlign: "right",
            }}
          >
            <table style={{ borderCollapse: "collapse" }}>
              <tbody>
                <tr>
                  <td
                    style={{
                      textAlign: "left",
                    }}
                  >
                    {MANAGERS[i]}
                  </td>
                  {extra_entries
                    .map(([key, _], j) => ({
                      key,
                      score: scores[j],
                      rank: ranks[j],
                    }))
                    .map(({ key, score, rank }) => (
                      <td key={key}>
                        <div>{key}</div>
                        <div>#{rank + 1}</div>
                        <div>{score < 0 ? `$${-score}` : score}</div>
                      </td>
                    ))}
                </tr>
                {players.map((player, j) => (
                  <tr
                    key={j}
                    style={{
                      borderTop:
                        j === 0 || j === num_players ? "2px solid black" : "",
                    }}
                  >
                    <td>{player.name}</td>
                    {player.scores.map((score, k) => (
                      <td key={k}>{score < 0 ? `$${-score}` : score}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </div>
  );
}

function get_results(
  final: string[],
  extra_entries: [string, { [name: string]: number }][],
  num_players: number
): {
  scores: number[];
  ranks: number[];
  players: { name: string; scores: number[] }[];
}[] {
  const extra = extra_entries.map(([_, d]) =>
    Object.fromEntries(
      Object.entries(d).map(([name, score]) => [normalize(name), score])
    )
  );
  const scored = Array.from(new Array(NUM_TEAMS))
    .map((_, team_index) =>
      final
        .map((name, pick_index) => ({ name, pick_index }))
        .filter(({ pick_index }) => isMyPick(pick_index, team_index))
        .map(({ pick_index, name }) => ({
          name: `${name} (${pick_index + 1})`,
          scores: extra.map((d) => d[normalize(name)]),
        }))
    )
    .map((players, team_index) => ({
      team_index,
      players,
      scores: extra_entries.map((_, i) =>
        players
          .filter((_, j) => j < num_players)
          .map((player) => player.scores[i])
          .map((score) => (score === undefined ? 0 : score))
          .reduce((a, b) => a + b, 0)
      ),
    }));
  const ranks = extra.map((_, i) =>
    scored
      .map(({ scores, team_index }) => ({
        team_index,
        score: scores[i],
      }))
      .sort((a, b) => a.score - b.score)
      .map(({ team_index }, rank) => ({ team_index, rank }))
      .sort((a, b) => a.team_index - b.team_index)
      .map(({ rank }) => rank)
  );
  return scored.map(({ team_index, ...o }) => ({
    ranks: ranks.map((r) => r[team_index]),
    ...o,
  }));
}

function isMyPick(pick_index: number, team_index: number): boolean {
  if (pick_index >= 20) {
    team_index = NUM_TEAMS - 1 - team_index;
  }
  const oddRound = (pick_index / NUM_TEAMS) % 2 < 1;
  return (
    pick_index % NUM_TEAMS ===
    (oddRound ? team_index : NUM_TEAMS - 1 - team_index)
  );
}

export default Value;
