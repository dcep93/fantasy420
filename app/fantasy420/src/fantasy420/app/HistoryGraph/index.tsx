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
      year: number;
      fullName: string;
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
    // player_games: (year) => ({
    //   QB: Object.values(
    //     Object.values(historyJson[year])
    //       .flatMap((players) => players)
    //       .find((player) => player.fullName === "Eli Manning")?.weeks || {}
    //   ).filter((v) => v).length,
    // }),
    ratio_played_all: (year) =>
      mapDict(clog(historyJson[year]), (players) => {
        const d = clog(
          groupByF(
            players
              .filter((p) => p.weeks["1"])
              .map(
                (p) =>
                  Object.values(p.weeks).filter((played) => !played).length ===
                  0
              ),
            (v) => v.toString()
          )
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
    ratio_games_played: (year) =>
      mapDict(historyJson[year], (players) => {
        const d = groupByF(
          players
            .filter((p) => p.weeks["1"])
            .flatMap((p) => Object.values(p.weeks)),
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
      <div>
        <span>
          regenerate: <input readOnly value={printF(regenerate)} />{" "}
        </span>
        <span>
          {/* input: <input readOnly value={JSON.stringify(historyJson)} />{" "} */}
        </span>
        <span>
          output:
          <input readOnly value={JSON.stringify(clog(data))} />{" "}
        </span>
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
            TE: "#8884d8",
            // K: "#8884d8",
            // DST: "#8884d8",
          }}
        />
      </div>
    </div>
  );
}
