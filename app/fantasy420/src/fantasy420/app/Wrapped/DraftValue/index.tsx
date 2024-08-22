import { useState } from "react";
import { normalize, selectedDraft } from "../../Draft";

import { groupByF, selectedWrapped } from "..";
import { NFLPlayerType } from "../../FetchWrapped";

export default function DraftValue() {
  const [num_rounds, update] = useState(8);

  const performance = get_performance();

  const extra_entries =
    selectedDraft() === undefined
      ? {
          performance: Object.fromEntries(
            Object.values(performance).map((player) => [
              player.name,
              player.performance,
            ])
          ),
        }
      : {
          performance: Object.fromEntries(
            Object.values(performance).map((player) => [
              player.name,
              player.performance,
            ])
          ),
          espnpick: selectedDraft().espn.pick,
          espnauction: Object.fromEntries(
            Object.entries(selectedDraft().espn.auction).map(
              ([name, value]) => [name, -value]
            )
          ),
          ...selectedDraft().extra,
        };

  const results = get_results(extra_entries, num_rounds, performance);
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
                  {Object.entries(extra_entries)
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
                      <td key={key} style={{ paddingLeft: "5em" }}>
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

type PerformanceType = {
  [playerId: string]: {
    msg: string;
    performance: number;
    pickIndex: number;
  } & NFLPlayerType;
};

function get_performance(): PerformanceType {
  const drafted = Object.values(selectedWrapped().ffTeams)
    .flatMap((team) => team.draft)
    .map(({ playerId, pickIndex }) => ({
      pickIndex,
      ...selectedWrapped().nflPlayers[playerId],
    }));
  const grouped = groupByF(drafted, (player) => player.position);
  const byTotal = Object.fromEntries(
    Object.entries(grouped).map(([position, players]) => [
      position,
      Object.fromEntries(
        players
          .slice()
          .sort((a, b) => b.total - a.total)
          .map((player, rank) => [player.id, { rank, ...player }])
      ),
    ])
  );
  const sortedByPick = Object.fromEntries(
    Object.entries(grouped).map(([position, players]) => [
      position,
      players
        .slice()
        .sort((a, b) => a.pickIndex - b.pickIndex)
        .map((player, rank) => ({ ...player, rank })),
    ])
  );
  const byPick = Object.fromEntries(
    Object.entries(sortedByPick).map(([position, players]) => [
      position,
      Object.fromEntries(players.map((player) => [player.id, player])),
    ])
  );
  return Object.fromEntries(
    drafted
      .map((player) => ({
        ...player,
        draftRank: byPick[player.position][player.id].rank,
        totalRank: byTotal[player.position][player.id].rank,
      }))
      .map((player) => [
        player.id,
        {
          ...player,
          msg: `(drafted ${player.pickIndex + 1} = ${player.position}${
            player.draftRank + 1
          }; scored ${player.total.toFixed(2)} = ${player.position}${
            player.totalRank + 1
          })`,
          performance:
            sortedByPick[player.position][player.totalRank].pickIndex + 1,
        },
      ])
  );
}

function get_results(
  extra_entries: { [key: string]: { [name: string]: number } },
  num_rounds: number,
  performance: PerformanceType
): {
  name: string;
  scores: number[];
  ranks: number[];
  players: { name: string; scores: number[] }[];
}[] {
  const extra = Object.entries(extra_entries).map(([_, d]) =>
    Object.fromEntries(
      Object.entries(d).map(([name, score]) => [normalize(name), score])
    )
  );
  const scored = Object.values(selectedWrapped().ffTeams)
    .map((team, teamIndex) => ({
      ...team,
      teamIndex,
      players: team.draft
        .map(({ playerId }) => performance[playerId])
        .sort((a, b) => a.pickIndex - b.pickIndex)
        .map((player) => ({
          ...player,
          name: `${player.name} ${player.msg}`,
          scores: extra.map((d) => d[normalize(player.name)]),
        })),
    }))
    .map((team) => ({
      ...team,
      scores: Object.entries(extra_entries).map((_, i) =>
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
