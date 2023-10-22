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
  const predictabilities: { [category: string]: number } = Object.fromEntries(
    Object.entries(yearData.primetimes).map(([category, counts]) => [
      category,
      1,
    ])
  );
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
        <tr>
          <td>playoff teams</td>
          <td>{yearData.playoffs.join(", ")}</td>
        </tr>
        <tr>
          <td>predicted playoff teams</td>
          <td>{yearData.playoffs.join(", ")}</td>
        </tr>
        <tr>
          <td>predictabilities</td>
        </tr>
        {Object.entries(predictabilities).map(([category, predictability]) => (
          <tr key={category}>
            <td>{category}</td>
            <td>{predictability.toFixed(2)}</td>
          </tr>
        ))}
      </table>
    </div>
  );
}
