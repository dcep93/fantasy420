import { useState } from "react";
import raw_generated from "./generated.json";

export default function Quiz() {
  return Helper(raw_generated);
}

const num = 10;

const positions = ["ALL", "QB", "RB", "WR", "TE"];

const valueKeys = [
  "fantasy_points",
  "throws",
  "completions",
  "passing_yards",
  "passing_touchdowns",
  "interceptions",
  "rushes",
  "rushing_yards",
  "rushing_touchdowns",
  "receptions",
  "targets",
  "receiving_touchdowns",

  "yards_per_carry",
  "targets_minus_receptions",
];

function Helper(
  generated: {
    full_name: string;
    position: string;
    fantasy_points: number;
    throws?: number;
    completions?: number;
    passing_yards?: number;
    passing_touchdowns?: number;
    interceptions?: number;
    rushes?: number;
    rushing_yards?: number;
    rushing_touchdowns?: number;
    receptions?: number;
    targets?: number;
    receiving_touchdowns?: number;
  }[]
) {
  const [valueKey, updateKey] = useState(valueKeys[0]);
  const [filter, updateFilter] = useState(positions[0]);
  return (
    <div>
      {JSON.stringify(
        generated
          .map((p) => ({
            yards_per_carry: (p.rushing_yards || 0) / (p.rushes || 0),
            targets_minus_receptions: (p.targets || 0) - (p.receptions || 0),
            ...p,
          }))
          .filter((p) => filter === "ALL" || p.position === filter)
          .map((p) => ({
            full_name: p.full_name,
            value: (p as unknown as { [k: string]: number })[valueKey] || 0,
          }))
          .sort((a, b) => b.value - a.value)
          .slice(0, num)
      )}
    </div>
  );
}
