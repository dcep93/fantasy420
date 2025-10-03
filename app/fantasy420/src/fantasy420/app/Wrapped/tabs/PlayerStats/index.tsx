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
                      .map((y) => ({
                        ...y,
                        // total for year and career
                        // will be stale
                        scores:
                          y.year.toString() !== currentYear
                            ? y.scores
                            : Object.values(
                                Object.values(
                                  allWrapped[y.year].nflPlayers
                                ).find((p) => p.name === d.name)!.scores
                              ).slice(1),
                      }))
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
                          t.rosters[0].rostered.includes(o.id!)
                        )?.name,
                      }))
                      .map((o) => ({
                        owner: o.owner,
                        ...o.y,
                        scores: o.y.scores.map((score, i) =>
                          (({ owner }) =>
                            owner ? { week: i + 1, owner, score } : score)({
                            owner: Object.values(o.w?.ffTeams || {}).find((t) =>
                              t.rosters[i + 1]?.rostered.includes(o.id!)
                            )?.name,
                          })
                        ),
                      })),
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
