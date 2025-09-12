import { useState } from "react";
import { bubbleStyle } from "../..";
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
          onChange={(e) =>
            updateNameFilter(e.currentTarget.value.toLowerCase())
          }
        />
      </div>
      <div style={{ display: "flex" }}>
        {playerStatsData
          .filter((d) => d.name.toLowerCase().includes(nameFilter))
          .sort((a, b) => b.total - a.total)
          .slice(0, MAX_RESULTS)
          .map((d, i) => (
            <div key={i} style={bubbleStyle}>
              <pre>{JSON.stringify({ index: i + 1, ...d }, null, 2)}</pre>
            </div>
          ))}
      </div>
    </div>
  );
}
