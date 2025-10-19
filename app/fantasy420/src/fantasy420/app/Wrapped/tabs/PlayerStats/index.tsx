import { useState } from "react";
import { bubbleStyle, currentYear } from "../..";
import allWrapped from "../../allWrapped";
import rawData from "./data.json";

export const playerStatsData = rawData as {
  position: string;
  total: number;
  name: string;
  years: { year: number; scores: (number | null)[]; total: number }[];
}[];

const MAX_RESULTS = 100;

// https://nflquery.web.app/fantasy
export default function PlayerStats() {
  const [nameFilter, updateNameFilter] = useState("");
  return (
    <div>
      <div>
        nameFilter:{" "}
        <input
          value={nameFilter}
          onChange={(e) => updateNameFilter(normalize(e.currentTarget.value))}
        />
      </div>
      <div style={{ display: "flex" }}>
        {playerStatsData
          .filter((d) => normalize(d.name).includes(nameFilter))
          .sort((a, b) => b.total - a.total)
          .slice(0, MAX_RESULTS)
          .map((d, i) => (
            <div key={i} style={bubbleStyle}>
              <pre>
                {JSON.stringify(
                  {
                    index: i + 1,
                    ...d,
                    years: d.years
                      .slice()
                      .reverse()
                      .map((y) => {
                        const wrappedSeason = allWrapped[y.year];
                        const ffTeams = Object.values(wrappedSeason?.ffTeams || {});
                        const player = Object.values(
                          wrappedSeason?.nflPlayers || {}
                        ).find((p) => p.name === d.name);
                        const playerId = player?.id;
                        const owner =
                          playerId != null
                            ? ffTeams.find((t) =>
                                t.rosters?.[0]?.rostered?.includes(playerId)
                              )
                            : undefined;

                        const scores =
                          y.year.toString() === currentYear && player?.scores
                            ? Object.values(player.scores).slice(1)
                            : y.scores;

                        return {
                          ...y,
                          owner: owner?.name,
                          scores: scores.map((score, index) => {
                            if (!playerId) {
                              return score;
                            }

                            const week = index + 1;
                            const weekOwner = ffTeams.find((t) =>
                              t.rosters?.[week]?.rostered?.includes(playerId)
                            );

                            if (!weekOwner) {
                              return score;
                            }

                            const started =
                              weekOwner.rosters?.[week]?.starting?.includes(
                                playerId
                              ) ?? false;

                            return {
                              week,
                              [started ? "started" : "benched"]: weekOwner.name,
                              score,
                            };
                          }),
                        };
                      }),
                  },
                  null,
                  2
                )}
              </pre>
            </div>
          ))}
      </div>
    </div>
  );
}

function normalize(s: string) {
  return s.toLowerCase().replaceAll(".", "");
}
