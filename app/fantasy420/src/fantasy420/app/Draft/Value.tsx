import { useState } from "react";
import { MAX_PEAKED, getPeakedValue, normalize } from ".";
import draft_json from "./draft.json";

import raw_generated_peaked from "../Peaked/peaked.json";

const MANAGERS = [
  "neil",
  "heify",
  "dunc",
  "sourav",
  "ahmed",
  "ruifan",
  "bu",
  "jon",
  "dan",
  "george",
];

function Value() {
  const [num_rounds, update] = useState(8);
  const final = draft_json.drafts[0];

  const generated_peaked: { url: string; lines: string[] } =
    raw_generated_peaked;

  const peaked = Object.fromEntries(
    Object.keys(draft_json.espn.players)
      .map((name) => [name, getPeakedValue(name, generated_peaked.lines)])
      .filter(([name, value]) => (value as number) < MAX_PEAKED)
  );

  // @ts-ignore
  draft_json.extra.peaked = peaked;

  const extra_entries = (
    Object.entries(draft_json.extra) as [string, { [name: string]: number }][]
  )
    .reverse()
    .concat([["espnpick", draft_json.espn.pick]])
    .concat([
      [
        "espnauction",
        Object.fromEntries(
          Object.entries(draft_json.espn.auction).map(([name, value]) => [
            name,
            -value,
          ])
        ),
      ],
    ]);
  const results = get_results(final, extra_entries, num_rounds);
  return (
    <div>
      <div>
        <ul>
          <li>
            according to the different aggregations, after X rounds, who had the
            "strongest" draft?
          </li>
        </ul>
      </div>
      <div>
        num_rounds:{" "}
        <input
          value={num_rounds}
          type="number"
          onChange={(e) => update(parseInt(e.currentTarget.value))}
        />
      </div>
      <div style={{ display: "flex", flexWrap: "wrap" }}>
        {results.map(({ name, players, scores, ranks }, i) => (
          <div
            key={i}
            style={{
              border: "2px solid black",
              borderRadius: "5px",
              margin: "10px",
              padding: "10px",
              textAlign: "right",
              whiteSpace: "nowrap",
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
                    <div>#{i + 1}</div>
                    <div>{name}</div>
                  </td>
                  {extra_entries
                    .map(([key, _], j) => ({
                      key,
                      score: scores[j],
                      rank: ranks[j],
                    }))
                    .map(({ score, ...o }) => ({
                      score: Number.isInteger(score)
                        ? score
                        : parseFloat(score.toFixed(2)),
                      ...o,
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
                        j === 0 || j === num_rounds ? "2px solid black" : "",
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
  num_rounds: number
): {
  name: string;
  scores: number[];
  ranks: number[];
  players: { name: string; scores: number[] }[];
}[] {
  const extra = extra_entries.map(([_, d]) =>
    Object.fromEntries(
      Object.entries(d).map(([name, score]) => [normalize(name), score])
    )
  );
  const scored = Array.from(new Array(MANAGERS.length))
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
      name: MANAGERS[team_index],
      team_index,
      players,
      scores: extra_entries.map((_, i) =>
        players
          .filter((_, j) => j < num_rounds)
          .map((player) => player.scores[i])
          .reduce((a, b) => a + b, 0)
      ),
    }));
  const ranks = extra.map((_, i) =>
    scored
      .map(({ scores, team_index }) => ({
        team_index,
        score: scores[i],
      }))
      .sort((a, b) =>
        isNaN(a.score) ? 1 : isNaN(b.score) ? -1 : a.score - b.score
      )
      .map(({ team_index }, rank) => ({ team_index, rank }))
      .sort((a, b) => a.team_index - b.team_index)
      .map(({ rank }) => rank)
  );
  return scored
    .map(({ team_index, ...o }) => ({
      ranks: ranks.map((r) => r[team_index]),
      ...o,
    }))
    .map(({ ...o }) => ({
      total_rank: o.ranks.reduce((a, b) => a + b, 0),
      ...o,
    }))
    .sort((a, b) => a.total_rank - b.total_rank);
}

function isMyPick(pick_index: number, team_index: number): boolean {
  if (pick_index >= 20) {
    team_index = MANAGERS.length - 1 - team_index;
  }
  const oddRound = (pick_index / MANAGERS.length) % 2 < 1;
  return (
    pick_index % MANAGERS.length ===
    (oddRound ? team_index : MANAGERS.length - 1 - team_index)
  );
}

export default Value;
