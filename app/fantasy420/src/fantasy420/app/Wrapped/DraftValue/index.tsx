import { useState } from "react";
import { normalize } from "../../Draft";

import { selectedWrapped, selectedYear } from "..";
import { allDrafts } from "../HistoricalAccuracy";

export default function DraftValue() {
  const draft_json = allDrafts[selectedYear];
  const picks = Object.fromEntries(
    Object.values(selectedWrapped.ffTeams)
      .flatMap((team) => team.draft)
      .map(({ playerId, pickNum }) => [
        normalize(selectedWrapped.nflPlayers[playerId].name),
        pickNum,
      ])
  );

  const extra_entries = (
    Object.entries(draft_json.extra) as [string, { [name: string]: number }][]
  )
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
  const [num_rounds, update] = useState(8);
  const results = get_results(picks, extra_entries, num_rounds);
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
  picks: { [name: string]: number },
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
  const scored = Object.values(selectedWrapped.ffTeams)
    .map((team, teamIndex) => ({
      ...team,
      teamIndex,
      players: team.rosters[1].rostered
        .map((playerName) => ({
          playerName,
          pick: picks[normalize(playerName)],
        }))
        .sort((a, b) => a.pick - b.pick)
        .map((player) => ({
          ...player,
          name: `${player.playerName} (${player.pick + 1})`,
          scores: extra.map((d) => d[normalize(player.playerName)]),
        })),
    }))
    .map((team) => ({
      ...team,
      scores: extra_entries.map((_, i) =>
        team.players
          .filter((_, j) => j < num_rounds)
          .map((player) => player.scores[i] || 0)
          .reduce((a, b) => a + b, 0)
      ),
    }));
  const ranks = extra.map((_, i) =>
    scored
      .map(({ scores, ...team }) => ({
        ...team,
        score: scores[i],
      }))
      .sort((a, b) =>
        isNaN(a.score) ? 1 : isNaN(b.score) ? -1 : a.score - b.score
      )
      .map(({ teamIndex }, rank) => ({ teamIndex, rank }))
      .sort((a, b) => a.teamIndex - b.teamIndex)
      .map(({ rank }) => rank)
  );
  return scored
    .map(({ teamIndex, ...o }) => ({
      ranks: ranks.map((r) => r[teamIndex]),
      ...o,
    }))
    .map(({ ...o }) => ({
      total_rank: o.ranks.reduce((a, b) => a + b, 0),
      ...o,
    }))
    .sort((a, b) => a.total_rank - b.total_rank);
}
