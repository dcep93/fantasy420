import { useState } from "react";
import { Position, selectedWrapped } from "..";
import { DraftJsonType, PlayersType, selectedDraft } from "../../Draft";
import Chart, { ChartDataType } from "./Chart";
import distanceCorrelation from "./correlation";

type DataType = {
  [position: string]: {
    [category: string]: ChartDataType;
  };
};

function getComposite(sources: DraftJsonType): PlayersType {
  const sourceRanks = Object.values(sources).map((o) =>
    Object.fromEntries(
      Object.entries(o)
        .map(([playerId, value]) => ({ playerId, value }))
        .sort((a, b) => a.value! - b.value!)
        .map(({ playerId }, i) => [playerId, i])
    )
  );
  return Object.fromEntries(
    Object.keys(
      Object.fromEntries(
        Object.values(sources)
          .flatMap((players) => Object.keys(players))
          .map((playerId) => [playerId, null])
      )
    )
      .map((playerId) => ({
        playerId,
        ranks: Object.values(sourceRanks)
          .map((source) => source[playerId])
          .filter((rank) => rank !== undefined && rank < 200),
      }))
      .filter(({ ranks }) => ranks.length > 0)
      .map(({ playerId, ranks }) => ({
        playerId,
        ranks,
        value: parseFloat(
          (
            ranks.map((r) => r + 1).reduce((a, b) => a + b, 0) / ranks.length
          ).toFixed(2)
        ),
      }))
      .map((o) => {
        if (isNaN(o.value)) console.log(o.playerId, o.ranks);
        return o;
      })
      .map(({ playerId, value }) => [playerId, value])
  );
}

function getData(players: PlayersType, selectedOwner: string): DataType {
  const byPosition = { all: {} } as {
    [position: string]: PlayersType;
  };
  Object.entries(players).forEach(([playerId, value]) => {
    const position = selectedWrapped().nflPlayers[playerId]?.position;
    if (!byPosition[position]) byPosition[position] = {};
    byPosition[position][playerId] = value;
    byPosition.all[playerId] = value;
  });
  const playerIdToOwner = Object.fromEntries(
    Object.values(selectedWrapped().ffTeams).flatMap((t) =>
      t.rosters[0].rostered.map((playerId) => [playerId, t.id])
    )
  );
  const data = Object.fromEntries(
    Object.entries(byPosition).map(([position, players]) => [
      position,
      Object.fromEntries(
        Object.entries({
          fantasycalc: (playerId: string) =>
            selectedWrapped().fantasyCalc.players[playerId] || 0,
          draftKings: (playerId: string) =>
            -selectedDraft()?.draftkings_super?.[playerId] || 0,
          espnprojection: (playerId: string) =>
            Object.values(
              selectedWrapped().nflPlayers[playerId].projectedStats || {}
            ).reduce((a, b) => a + b, 0),
          season_points: (playerId: string) =>
            selectedWrapped().nflPlayers[playerId]?.total,
          average_points: (playerId: string) =>
            selectedWrapped().nflPlayers[playerId]?.average,
        })
          .map(([key, f]) => ({
            key,
            playersData: Object.entries(players)
              .map(([playerId, value]) => ({
                playerId,
                x: value,
                y: f(playerId),
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
                .map((o, i) => [o.playerId, i])
            );
            return [
              key,
              playersData
                .sort((a, b) => a.x - b.x)
                .map((p) => ({ ...p, x: parseFloat(p.x.toFixed(2)) }))
                .map(({ x, y, ...o }, i) => ({
                  fill:
                    (playerIdToOwner[o.playerId] || "") === selectedOwner
                      ? "red"
                      : undefined,
                  x,
                  y,
                  label: `${selectedWrapped().nflPlayers[o.playerId].name}: #${
                    i + 1
                  } ${x < 0 ? `$${-x}` : x} -> #${ranks[o.playerId] + 1} ${y}`,
                })),
            ];
          })
      ),
    ])
  );
  return data;
}

function getCorrelation(data: ChartDataType): number {
  const c = distanceCorrelation(
    data.filter((d) => d.y !== 0).map((o) => [o.x, o.y])
  );
  return c;
}

export default function HistoricalAccuracy() {
  const draft = Object.fromEntries(
    Object.values(selectedWrapped().ffTeams)
      .flatMap((team) => team.draft)
      .filter((p) => p.pickIndex < 40)
      .map((player) => [
        selectedWrapped().nflPlayers[player.playerId].id,
        player.pickIndex,
      ])
  );
  const sources = {
    draft,
    ...(selectedDraft() || {}),
  } as { [k: string]: {} };
  console.log(sources);
  const [source, updateSource] = useState(Object.keys(sources)[0]);
  const owners = Object.values(selectedWrapped().ffTeams)
    .map((t) => t.id)
    .concat("");
  const [selectedOwner, updateSelectedOwner] = useState(owners[0]);
  sources.composite = getComposite(sources);
  const data = getData(sources[source], selectedOwner);
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
            .filter((s) => s.replaceAll("_", "").length !== 0)
            .map((selectSource) => (
              <option key={selectSource} value={selectSource}>
                {selectSource}
              </option>
            ))}
        </select>
      </div>
      <div>
        <select
          defaultValue={selectedOwner}
          onChange={(event) =>
            updateSelectedOwner((event.target as HTMLSelectElement).value)
          }
        >
          {owners.map((s) => (
            <option key={s} value={s}>
              {selectedWrapped().ffTeams[s]?.name || "<UNOWNED>"}
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
