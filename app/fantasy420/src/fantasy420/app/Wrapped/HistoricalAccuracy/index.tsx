import { useState } from "react";
import { Position, selectedWrapped, selectedYear } from "..";
import { DraftJsonType, normalize, PlayersType } from "../../Draft";
import Chart, { ChartDataType } from "./Chart";
import distanceCorrelation from "./correlation";

import _2023 from "../../Draft/2023.json";
import _2024 from "../../Draft/2024.json";

export const allDrafts: { [year: string]: DraftJsonType } = {
  2023: _2023,
  2024: _2024,
};

type DataType = {
  [position: string]: {
    [category: string]: ChartDataType;
  };
};

function getComposite(sources: {
  [sourceName: string]: PlayersType;
}): PlayersType {
  const source_ranks = Object.values(sources).map((o) =>
    Object.fromEntries(
      Object.entries(o)
        .map(([playerName, value]) => ({ playerName, value }))
        .filter(({ value }) => value !== null)
        .sort((a, b) => a.value! - b.value!)
        .map(({ playerName }, i) => [normalize(playerName), i + 1])
    )
  );
  return Object.fromEntries(
    Object.keys(
      Object.fromEntries(
        Object.values(sources)
          .flatMap((players) => Object.keys(players))
          .map((playerName) => [normalize(playerName), null])
      )
    )
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
}

function getData(players: PlayersType): DataType {
  const normalizedPlayers = Object.fromEntries(
    Object.values(selectedWrapped.nflPlayers).map((player) => [
      normalize(player.name),
      player,
    ])
  );
  const by_position = {} as {
    [position: string]: PlayersType;
  };
  Object.entries(players).forEach(([playerName, value]) => {
    const normalized = normalize(playerName);
    const position = normalizedPlayers[normalize(playerName)]?.position;
    if (position === undefined) return;
    if (!by_position[position]) by_position[position] = {};
    by_position[position][normalized] = value;
  });
  const data = Object.fromEntries(
    Object.entries(by_position).map(([position, players]) => [
      position,
      Object.fromEntries(
        Object.entries({
          season_points: (playerName: string) =>
            normalizedPlayers[normalize(playerName)].total,
          average_points: (playerName: string) =>
            normalizedPlayers[normalize(playerName)].average,
        })
          .map(([key, f]) => ({
            key,
            playersData: Object.entries(players)
              .map(([playerName, value]) => ({
                playerName,
                x: value,
                y: f(playerName),
              }))
              .filter(({ x }) => x !== null && x !== undefined)
              .map(({ ...o }) => ({
                ...o,
                y: parseFloat(o.y?.toFixed(2)),
              })),
          }))
          .map(({ key, playersData }) => {
            const ranks = Object.fromEntries(
              playersData
                .sort((a, b) => b.y - a.y)
                .map((o, i) => [o.playerName, i])
            );
            return [
              key,
              playersData
                .sort((a, b) => a.x - b.x)
                .map(({ x, y, ...o }, i) => ({
                  x,
                  y,
                  label: `${o.playerName}: #${i + 1} ${
                    x < 0 ? `$${-x}` : x
                  } -> #${ranks[o.playerName] + 1} ${y}`,
                })),
            ];
          })
      ),
    ])
  );
  return data;
}

function getCorrelation(data: ChartDataType): number {
  const c = distanceCorrelation(data.map((o) => [o.x, o.y]));
  return c;
}

export default function HistoricalAccuracy() {
  const [source, updateSource] = useState("composite");
  const draftData = allDrafts[selectedYear];
  const sources = Object.assign({}, draftData.extra);
  sources.espn_adp = draftData.espn.pick;
  sources.espn_auction = draftData.espn.auction;
  sources.composite = getComposite(sources);
  const data = getData(sources[source]);
  return (
    <div>
      <div>
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
        {Object.entries(data)
          .map(([position, o]) => ({
            position,
            o,
            sort: Position[position as any] as unknown as number,
          }))
          .sort((a, b) => a.sort - b.sort)
          .map(({ position, o }) => (
            <div
              key={position}
              style={{
                border: "2px solid black",
                borderRadius: "20px",
                margin: "20px",
                padding: "20px",
              }}
            >
              <h1>{position}</h1>
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
