import { useState } from "react";

import { groupByF, selectedWrapped } from "..";
import { selectedDraft } from "../../Draft";
import { NFLPlayerType } from "../../FetchWrapped";

export default function DraftValue() {
  const [numRounds, update] = useState(8);

  const results = getResults(numRounds);
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
          value={numRounds}
          type="number"
          onChange={(e) => update(parseInt(e.currentTarget.value))}
        />
      </div>
      <div style={{ display: "flex", flexWrap: "wrap" }}>
        {results.map(({ teamName: name, players, categories }, i) => (
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
                  {Object.entries(categories)
                    .map(([key, { score, rank }], j) => ({
                      key,
                      score,
                      rank,
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
                        j === 0 || j === numRounds ? "2px solid black" : "",
                    }}
                  >
                    <td>{player.player.id}</td>
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

function getPerformance(): PerformanceType {
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

function getResults(numRounds: number): {
  teamName: string;
  categories: { [key: string]: { score: number; rank: number } };
  players: { player: NFLPlayerType; msg: string; scores: number[] }[];
}[] {
  const performance = getPerformance();
  const scored = Object.values(selectedWrapped().ffTeams)
    .map((team) => ({
      ...team,
      players: team.draft
        .map(({ playerId }) => performance[playerId])
        .sort((a, b) => a.pickIndex - b.pickIndex)
        .map((player) => ({
          ...player,
          name: `${player.name} ${player.msg}`,
          scores: Object.values(selectedDraft()).map((d) => d[player.id]),
        })),
    }))
    .map((team) => ({
      ...team,
      scores: Object.entries(extraEntries).map((_, i) =>
        team.players
          .filter((_, j) => j < numRounds)
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
      totalRank: o.ranks.reduce((a, b) => a + b, 0),
      ...o,
    }))
    .sort((a, b) => a.totalRank - b.totalRank);
}
