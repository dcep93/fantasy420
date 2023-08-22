import { useState } from "react";
import { normalize } from "../Draft";
import raw_accuracy_json from "./accuracy.json";

const default_year = "2022";

type EspnPlayerType = {
  position: string;
  adp: number;
  auction: number;
  season_points: number;
  average_points: number;
};

type AccuracyJsonType = {
  [year: string]: {
    espn: {
      [playerName: string]: EspnPlayerType;
    };
    sources: { [source: string]: { [normalizedPlayerName: string]: number } };
  };
};

export default function Accuracy() {
  const accuracy_json = raw_accuracy_json as AccuracyJsonType;
  const [year, updateYear] = useState(default_year);
  const accuracy_year = accuracy_json[year];
  const sources = Object.assign({}, accuracy_year.sources);
  sources.espn_adp = Object.fromEntries(
    Object.entries(accuracy_year.espn).map(([playerName, o]) => [
      normalize(playerName),
      o.adp,
    ])
  );
  sources.espn_auction = Object.fromEntries(
    Object.entries(accuracy_year.espn).map(([playerName, o]) => [
      normalize(playerName),
      -o.auction,
    ])
  );
  const source_ranks = Object.fromEntries(
    Object.entries(sources).map(([s, o]) => [
      s,
      Object.fromEntries(
        Object.entries(o)
          .map(([playerName, value]) => ({ playerName, value }))
          .sort((a, b) => a.value - b.value)
          .map(({ playerName }, i) => [playerName, i + 1])
      ),
    ])
  );
  sources.composite = Object.fromEntries(
    Object.keys(accuracy_year.espn)
      .map((playerName) => normalize(playerName))
      .map((playerName) => ({
        playerName,
        ranks: Object.values(source_ranks).map((source) => source[playerName]),
      }))
      .map(({ playerName, ranks }) => [
        playerName,
        parseFloat(
          (ranks.reduce((a, b) => a + b, 0) / ranks.length).toFixed(2)
        ),
      ])
  );
  const [source, updateSource] = useState("composite");
  const by_position = {} as {
    [position: string]: { [playerName: string]: EspnPlayerType };
  };
  Object.entries(accuracy_year.espn).forEach(([playerName, o]) => {
    if (!by_position[o.position]) by_position[o.position] = {};
    by_position[o.position][playerName] = o;
  });
  const data = Object.fromEntries(
    Object.entries(by_position).map(([position, players]) => [
      position,
      Object.fromEntries(
        Object.entries({
          season_points: (o: EspnPlayerType) => o.season_points,
          average_points: (o: EspnPlayerType) => o.average_points,
        }).map(([key, f]) => [
          key,
          Object.entries(players)
            .map(([playerName, o]) => ({
              playerName,
              x: sources[source][normalize(playerName)],
              y: f(o),
              ...o,
            }))
            .map(({ ...o }) => ({
              ...o,
              y: parseFloat(o.y.toFixed(2)),
              labelX: o.x < 0 ? `$${-o.x}` : o.x,
            }))
            .map(({ x, y, ...o }) => ({
              x,
              y,
              label: `${o.playerName}: ${o.labelX} -> ${y}`,
            }))
            .sort((a, b) => a.x - b.x),
        ])
      ),
    ])
  );
  return (
    <div>
      <select
        defaultValue={year}
        onChange={(event) =>
          updateYear((event.target as HTMLSelectElement).value)
        }
      >
        {Object.keys(accuracy_json).map((select_year) => (
          <option key={select_year} value={select_year}>
            {select_year}
          </option>
        ))}
      </select>
      <select
        defaultValue={source}
        onChange={(event) =>
          updateSource((event.target as HTMLSelectElement).value)
        }
      >
        {Object.keys(sources).map((select_source) => (
          <option key={select_source} value={select_source}>
            {select_source}
          </option>
        ))}
      </select>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
}
