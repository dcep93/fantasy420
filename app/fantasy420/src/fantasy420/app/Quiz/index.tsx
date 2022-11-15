import raw_generated from "./generated.json";

export default function Quiz() {
  return helper(raw_generated);
}

const positions = ["ALL", "QB", "RB", "WR", "TE"];

const keys = [
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

function helper(
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
  return (
    <div>
      {JSON.stringify(
        generated.map((p) => ({
          yards_per_carry: (p.rushing_yards || 0) / (p.rushes || 0),
          targets_minus_receptions: (p.targets || 0) - (p.receptions || 0),
          ...p,
        }))
      )}
    </div>
  );
}
