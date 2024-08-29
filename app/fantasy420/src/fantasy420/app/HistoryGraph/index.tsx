import { useState } from "react";
import { printF } from "..";
import { clog, groupByF, mapDict } from "../Wrapped";
import Chart from "./Chart";
import rawHistoryJson from "./history.json";
import regenerate from "./regenerate";

// @ts-ignore
const historyJson: {
  [year: string]: {
    [position: string]: {
      year: string;
      defence?: {
        [weekNum: string]: { yardsAllowed: number; pointsAllowed: number };
      };
      weeks: { [weekNum: string]: boolean };
    }[];
  };
} = rawHistoryJson;

export default function HistoryGraph() {
  const fs: {
    [key: string]: (year: string) => { [position: string]: number };
  } = {
    ratio_games_played: (year) =>
      mapDict(historyJson[year], (players) => {
        const d = groupByF(
          players.flatMap((p) => Object.values(p.weeks).slice(1)),
          (v) => v.toString()
        );
        return parseFloat(
          (
            d[true.toString()]?.length /
            Object.values(d)
              .map((v) => v.length)
              .reduce((a, b) => a + b, 0)
          ).toFixed(2)
        );
      }),
  };
  const [f, update] = useState(Object.keys(fs)[0]);
  const data = Object.keys(historyJson)
    .map((year) => ({
      name: year,
      ys: Object.fromEntries(
        Object.entries(fs[f](year)).filter(([_k, v]) => !Number.isNaN(v))
      ),
    }))
    .filter(({ ys }) => Object.keys(ys).length > 0);
  return (
    <div>
      <div hidden>
        regenerate: <input readOnly value={printF(regenerate)} /> input:{" "}
        <input readOnly value={JSON.stringify(historyJson)} /> output:
        <input readOnly value={JSON.stringify(clog(data))} />
      </div>
      <div>
        <select defaultValue={f} onChange={(e) => update(e.target.value)}>
          {Object.keys(fs).map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>
      <div>
        <Chart
          data={data}
          keys={{
            QB: "red",
            RB: "purple",
            WR: "green",
            // TE: "#8884d8",
            // K: "#8884d8",
            // DST: "#8884d8",
          }}
        />
      </div>
    </div>
  );
}
