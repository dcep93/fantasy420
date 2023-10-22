import { useState } from "react";
import rawData from "./data.json";

type DataType = {
  [year: string]: {
    playoffs: string[];
    primetimes: { [category: string]: { [team: string]: number } };
  };
};

const data: DataType = rawData;

export default function Index() {
  const defaultYear = Object.keys(data).sort().reverse()[0];
  const [year, updateYear] = useState(defaultYear);
  const yearData = data[year];
  const allTeams = Object.keys(
    Object.fromEntries(
      Object.values(yearData.primetimes)
        .map((counts) => Object.keys(counts))
        .flatMap((team) => team)
        .map((team) => [team, true])
    )
  );
  const predictabilities: { [category: string]: number } = Object.fromEntries(
    Object.entries(yearData.primetimes).map(([category, counts]) => [
      category,
      1,
    ])
  );
  const prediction = allTeams
    .map((team) => ({
      team,
      score: Object.entries(yearData.primetimes)
        .map(
          ([category, counts]) =>
            predictabilities[category] * (counts[team] || 0)
        )
        .reduce((a, b) => a + b, 0),
    }))
    .sort((a, b) => a.score - b.score)
    .map((o) => o.team)
    .slice(-yearData.playoffs.length);
  return (
    <div>
      <div>
        year:{" "}
        <select
          defaultValue={defaultYear}
          onChange={(e) => updateYear(e.target.value)}
        >
          {Object.keys(data).map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>
      <table>
        <tbody>
          <tr>
            <td>playoff teams</td>
            <td>{yearData.playoffs.join(", ")}</td>
          </tr>
          <tr>
            <td>predicted playoff teams</td>
            <td>{prediction.join(", ")}</td>
          </tr>
          <tr>
            <td>predictabilities</td>
          </tr>
          {Object.entries(predictabilities).map(
            ([category, predictability]) => (
              <tr key={category}>
                <td>{category}</td>
                <td>{predictability.toFixed(2)}</td>
              </tr>
            )
          )}
        </tbody>
      </table>
    </div>
  );
}
