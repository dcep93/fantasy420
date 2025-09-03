import { useState } from "react";
import { bubbleStyle } from "../..";
import rawData from "./data.json";

const data: {
  position: string;
  total: number;
  name: string;
  years: { year: number; scores: number[]; total: number }[];
}[] = rawData;

const MAX_RESULTS = 100;

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
        {data
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
