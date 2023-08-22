import { useState } from "react";
import { normalize } from "../Draft";
import Chart from "./Chart";
import raw_accuracy_json from "./accuracy.json";
import distanceCorrelation from "./correlation";

const default_year = "2022";

type EspnPlayerType = {
  position: string;
  adp: number | null;
  auction: number | null;
  season_points: number;
  average_points: number;
};

type SourcesType = {
  [source: string]: { [normalizedPlayerName: string]: number | null };
};

type AccuracyJsonType = {
  [year: string]: {
    espn: {
      [playerName: string]: EspnPlayerType;
    };
    sources: SourcesType;
  };
};

export type ChartDataType = { x: number; y: number; label: string }[];

type DataType = {
  [position: string]: {
    [category: string]: ChartDataType;
  };
};

function getSources(year: string): SourcesType {
  const accuracy_json = raw_accuracy_json as AccuracyJsonType;
  const accuracy_year = accuracy_json[year];
  const sources = Object.fromEntries(
    Object.entries(accuracy_year.sources).map(([source, data]) => [
      source,
      Object.fromEntries(
        Object.entries(data).map(([playerName, value]) => [
          normalize(playerName),
          value,
        ])
      ),
    ])
  );
  sources.espn_auction = Object.fromEntries(
    Object.entries(accuracy_year.espn)
      .filter(([playerName, o]) => o.auction !== null && o.auction <= -0.5)
      .map(([playerName, o]) => [normalize(playerName), o.auction])
  );
  sources.espn_adp = Object.fromEntries(
    Object.entries(accuracy_year.espn)
      .filter(([playerName, o]) => o.adp !== null && o.adp < 168)
      .map(([playerName, o]) => [normalize(playerName), o.adp])
  );
  const source_ranks = Object.fromEntries(
    Object.entries(sources).map(([s, o]) => [
      s,
      Object.fromEntries(
        Object.entries(o)
          .map(([playerName, value]) => ({ playerName, value }))
          .filter(({ value }) => value !== null)
          .sort((a, b) => a.value! - b.value!)
          .map(({ playerName }, i) => [playerName, i + 1])
      ),
    ])
  );
  sources.composite = Object.fromEntries(
    Object.keys(accuracy_year.espn)
      .map((playerName) => normalize(playerName))
      .map((playerName) => ({
        playerName,
        ranks: Object.values(source_ranks)
          .map((source) => source[playerName])
          .filter((rank) => rank !== undefined),
      }))
      .filter(({ ranks }) => ranks.length > 0)
      .map(({ playerName, ranks }) => ({
        playerName,
        ranks,
        value: parseFloat(
          (ranks.reduce((a, b) => a + b, 0) / ranks.length).toFixed(2)
        ),
      }))
      .map((o) => {
        if (isNaN(o.value)) console.log(o.playerName, o.ranks);
        return o;
      })
      .map(({ playerName, value }) => [playerName, value])
  );
  return sources;
}

function getData(year: string, source: string, sources: SourcesType): DataType {
  const accuracy_json = raw_accuracy_json as AccuracyJsonType;
  const accuracy_year = accuracy_json[year];
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
              x: sources[source][normalize(playerName)]!,
              y: f(o),
              ...o,
            }))
            .filter(({ x }) => x !== null && x !== undefined)
            .map(({ ...o }) => ({
              ...o,
              y: parseFloat(o.y.toFixed(2)),
              labelX: o.x < 0 ? `$${-o.x}` : o.x,
            }))
            .sort((a, b) => a.x - b.x)
            .map(({ x, y, ...o }, i) => ({
              x,
              y,
              label: `#${i + 1} ${o.playerName}: ${o.labelX} -> ${y}`,
            }))
            .sort((a, b) => a.x - b.x),
        ])
      ),
    ])
  );
  return data;
}

function getCorrelation(data: ChartDataType): number {
  const c = distanceCorrelation(data.map((o) => [o.x, o.y]));
  return c;
}

function getIR(position_data: { [category: string]: ChartDataType }): number {
  const GAMES_PER_SEASON = 17;
  const CUTOFF_RATIO = 0.8;
  const points = Object.fromEntries(
    Object.entries(position_data).map(([category, data]) => [
      category,
      data
        .map(({ ...point }, i) => ({ i, ...point }))
        .filter(({ i }) => i <= data.length * CUTOFF_RATIO)
        .map((point) => point.y)
        .reduce((a, b) => a + b, 0),
    ])
  );
  const played = points["season_points"] / points["average_points"];
  return parseFloat((GAMES_PER_SEASON - played).toFixed(2));
}

export default function Accuracy() {
  const accuracy_json = raw_accuracy_json as AccuracyJsonType;
  const [year, updateYear] = useState(default_year);
  const [source, updateSource] = useState("composite");
  const sources = getSources(year);
  const data = getData(year, source, sources);
  return (
    <div>
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
          {Object.keys(sources)
            .reverse()
            .map((select_source) => (
              <option key={select_source} value={select_source}>
                {select_source}
              </option>
            ))}
        </select>
      </div>
      <div>
        {Object.entries(data).map(([position, o]) => (
          <div
            key={position}
            style={{
              border: "2px solid black",
              borderRadius: "20px",
              margin: "20px",
              padding: "20px",
            }}
          >
            <h1>
              {position} avg missed : {getIR(o)}
            </h1>
            <div style={{ display: "flex" }}>
              {Object.entries(o).map(([category, oo]) => (
                <div key={category} style={{ flexGrow: 1 }}>
                  <div style={{ padding: "0 20px" }}>
                    <h2>
                      {category} r2 :{" "}
                      {parseFloat(getCorrelation(oo).toFixed(4))}
                    </h2>
                    <Chart data={oo} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
