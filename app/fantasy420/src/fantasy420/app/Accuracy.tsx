import { useState } from "react";
import { normalize } from "./Draft";
import raw_accuracy_json from "./accuracy.json";

const default_year = 2022;

type EspnPlayerType = {
  position: string;
  adp: number;
  auction: number;
  season_points: number;
  average_points: number;
};

type AccuracyJsonType = {
  [year: number]: {
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
  const [source, updateSource] = useState("espn_adp");
  // TODO by position
  const data = Object.fromEntries(
    Object.entries({
      season_points: (o: EspnPlayerType) => o.season_points,
      average_points: (o: EspnPlayerType) => o.average_points,
    }).map(([key, f]) => [
      key,
      Object.entries(accuracy_year.espn)
        .map(([playerName, o]) => ({
          playerName,
          x: sources[source][normalize(playerName)],
          y: f(o),
          ...o,
        }))
        .map(({ ...o }) => ({ ...o, labelX: o.x < 0 ? `$${-o.x}` : o.x }))
        .map(({ x, y, ...o }) => ({
          x,
          y,
          label: `${o.playerName}: ${o.labelX} -> ${y}`,
        })),
    ])
  );
  return <pre>{JSON.stringify(data, null, 2)}</pre>;
}
