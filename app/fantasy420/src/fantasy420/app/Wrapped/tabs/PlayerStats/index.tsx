import { useMemo, useState } from "react";
import allWrapped from "../../allWrapped";
import Chart from "./Chart";
import type { PlayerStatsRecord } from "./refreshSnapshot";
import { usePlayerStats } from "./usePlayerStats";
import LoadStatus from "./LoadStatus";
import { getPointsPerGame } from "./pointsPerGame";

const MAX_RESULTS = 100;

// https://nflquery.web.app/fantasy
export default function PlayerStats() {
  const [nameFilter, updateNameFilter] = useState("");
  const stats = usePlayerStats();
  const playerStatsData = stats.data;
  const positionRanks = useMemo(
    () => calculatePositionRanks(playerStatsData),
    [playerStatsData]
  );
  return (
    <div>
      <LoadStatus {...stats} />
      <div>
        nameFilter:{" "}
        <input
          value={nameFilter}
          onChange={(e) => updateNameFilter(normalize(e.currentTarget.value))}
        />
      </div>
      <div>
        {playerStatsData
          .filter((d) => normalize(d.name).includes(nameFilter))
          .sort((a, b) => b.total - a.total)
          .slice(0, MAX_RESULTS)
          .map((d, i) => (
            <div key={i} style={{ display: "flex" }}>
              <pre>
                {JSON.stringify(
                  { index: i + 1, ...d, years: undefined },
                  null,
                  2
                )}
              </pre>
              <div style={{ display: "flex" }}>
                {d.years
                  .slice()
                  .reverse()
                  .map((y) => ({ y, w: allWrapped[y.year] }))
                  .map((o) => ({
                    ...o,
                    id: Object.values(o.w?.nflPlayers || {}).find(
                      (p) => p.name === d.name
                    )?.id,
                  }))
                  .map((o) => ({
                    ...o,
                    owner: Object.values(o.w?.ffTeams || {}).find((t) =>
                      t.rosters[0]?.rostered.includes(o.id!)
                    )?.name,
                  }))
                  .map((o) => ({
                    owner: o.owner,
                    ...o.y,
                    ...getPointsPerGame(o.y.scores),
                    ...positionRanks[o.y.year]?.[d.position]?.[d.name],
                    scores: o.y?.scores.map((score, i) =>
                      (({ owner }) => ({
                        week: i + 1,
                        state: !owner
                          ? "unowned"
                          : owner?.rosters[i + 1]?.starting.includes(o.id!)
                          ? "started"
                          : "benched",
                        score,
                        owner,
                      }))({
                        owner: Object.values(o.w?.ffTeams || {}).find((t) =>
                          t.rosters[i + 1]?.rostered.includes(o.id!)
                        ),
                      })
                    ),
                  }))
                  .map((o, j) => (
                    <div key={j}>
                      <pre>
                        {JSON.stringify({ ...o, scores: undefined }, null, 2)}
                      </pre>
                      <Chart delayMs={100 * (10 * i + j)} scores={o.scores} />
                    </div>
                  ))}
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}

function normalize(s: string) {
  return s.toLowerCase().replaceAll(".", "");
}

type PositionRanks = {
  [year: number]: {
    [position: string]: {
      [playerName: string]: { averageRank: number; totalRank: number };
    };
  };
};

function calculatePositionRanks(data: PlayerStatsRecord[]): PositionRanks {
  const ranks: PositionRanks = {};

  data.forEach((player) => {
    player.years.forEach((year) => {
      ranks[year.year] ??= {};
      ranks[year.year][player.position] ??= {};
    });
  });

  Object.entries(ranks).forEach(([yearString, positions]) => {
    const year = Number(yearString);
    Object.keys(positions).forEach((position) => {
      const players = data
        .filter((p) => p.position === position)
        .flatMap((p) =>
          p.years
            .filter((y) => y.year === year)
            .map((y) => ({ name: p.name, scores: y.scores, total: y.total }))
        );

      const avgSorted = [...players].sort(
        (a, b) =>
          getPointsPerGame(b.scores).pointsPerGame -
          getPointsPerGame(a.scores).pointsPerGame
      );
      const totalSorted = [...players].sort((a, b) => b.total - a.total);

      avgSorted.forEach((p, idx) => {
        const existing = ranks[year][position][p.name] || {};
        ranks[year][position][p.name] = {
          ...existing,
          averageRank: idx + 1,
        };
      });

      totalSorted.forEach((p, idx) => {
        const existing = ranks[year][position][p.name] || {};
        ranks[year][position][p.name] = {
          ...existing,
          totalRank: idx + 1,
        };
      });
    });
  });

  return ranks;
}
