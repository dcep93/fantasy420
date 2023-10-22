import { useState } from "react";
import rawData from "./data.json";
import rawPredictabilities from "./predictabilities.json";

type DataType = {
  [year: string]: {
    [team: string]: {
      playoffs: boolean;
      primetimes: { [category: string]: number };
    };
  };
};

const data: DataType = rawData;
const allPredictabilities: { [year: string]: { [category: string]: number } } =
  rawPredictabilities;

export default function Index() {
  const defaultYear = Object.keys(data).sort().reverse()[0];
  const [year, updateYear] = useState(defaultYear);
  const yearData = data[year];
  const predictabilities = allPredictabilities[year];
  const playoffs = Object.entries(yearData)
    .map(([team, teamData]) => ({ team, teamData }))
    .filter((o) => o.teamData.playoffs)
    .map((o) => o.team);
  const prediction = Object.entries(yearData)
    .map(([team, teamData]) => ({
      team,
      score: Object.entries(teamData.primetimes)
        .map(([category, count]) => predictabilities[category] * count)
        .reduce((a, b) => a + b, 0),
    }))
    .sort((a, b) => a.score - b.score)
    .map((o) => o.team)
    .slice(-playoffs.length);
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
            <td>{playoffs.join(", ")}</td>
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
