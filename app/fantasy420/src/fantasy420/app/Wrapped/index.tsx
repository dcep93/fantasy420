import { ReactNode, useMemo, useState } from "react";
import { getWrapped, NFLPlayerType, WrappedType } from "../FetchWrapped";
import allWrapped from "./allWrapped";
import Benchwarmers from "./tabs/Benchwarmers";
import BestByPosition from "./tabs/BestByPosition";
import BoomBust from "./tabs/BoomBust";
import Bopped from "./tabs/Bopped";
import ByeSchedule from "./tabs/ByeSchedule";
import ChosenWrong from "./tabs/ChosenWrong";
import DeterminedByDiscreteScoring from "./tabs/DeterminedByDiscreteScoring";
import DraftValueStateful from "./tabs/DraftValue";
import ExtremeStuds from "./tabs/ExtremeStuds";
import FantasyCalc from "./tabs/FantasyCalc";
import GooseEggs from "./tabs/GooseEggs";
import Injuries from "./tabs/Injuries";
import Negatives from "./tabs/Negatives";
import OwnedTeams from "./tabs/OwnedTeams";
import PerformanceTotals from "./tabs/PerformanceTotals";
import PlayerPlotStateful from "./tabs/PlayerPlot";
import PointsAgainstStateful from "./tabs/PointsAgainst";
import PointsForStateful from "./tabs/PointsFor";
import PuntsStateful from "./tabs/Punts";
import SecondLost from "./tabs/SecondLost";
import SimpsStateful from "./tabs/Simps";
import SqueezesAndStomps from "./tabs/SqueezesAndStomps";
import Stacks from "./tabs/Stacks";
import Trades from "./tabs/Trades";
import UniquesRostered from "./tabs/UniquesRostered";
import UniquesStarted from "./tabs/UniquesStarted";
import WeekTopsAndBottoms from "./tabs/WeekTopsAndBottoms";

export const currentYear = "2025";

export var selectedYear =
  new URLSearchParams(window.location.search).get("year") || currentYear;
export function selectedWrapped(): WrappedType {
  return allWrapped[selectedYear];
}

export const newManagers: { [teamId: string]: string[] } = {
  "4": ["2022"],
  "2": ["2024", "2025"],
};

export default function Wrapped() {
  document.title = "Fantasy Wrapped";
  const [yearKey, updateYear] = useState(selectedYear);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_, updateFetched] = useState(false);
  useMemo(
    () =>
      Promise.resolve()
        .then(getWrapped)
        .then((wrapped) => (allWrapped[currentYear] = wrapped))
        .then(() => updateFetched(true)),
    []
  );
  selectedYear = yearKey;
  const toRender: { [key: string]: ReactNode } = Object.fromEntries(
    Object.entries({
      FantasyCalc,
      PlayerPlot,
      ManagerPlot,
      Trades,
      WeekTopsAndBottoms,
      SqueezesAndStomps,
      GooseEggs,
      Bopped,
      ChosenWrong,
      DraftValue,
      Performance,
      PerformanceTotals,
      DeterminedByDiscreteScoring,
      Stacks,
      Negatives,
      PointsAgainst,
      UniquesStarted,
      UniquesRostered,
      BoomBust,
      OwnedTeams,
      Benchwarmers,
      Injuries,
      BestByPosition,
      ExtremeStuds,
      AllTimeRecords,
      HeadToHead,
      ByeSchedule,
      SecondLost,
      WhatIf,
      ConsistentlyAverage,
      Simps,
      Punts,
      json,
    }).map(([k, v]) => {
      try {
        return [k, v()];
      } catch (e) {
        if (process.env.NODE_ENV === "development") throw e;
        return [k, <pre>{(e as Error).stack}</pre>];
      }
    })
  );
  var hashKey = window.location.hash.substring(1);
  if (!toRender[hashKey]) {
    window.location.hash = "";
    hashKey = "";
  }
  const [toRenderKey, update] = useState(hashKey || Object.keys(toRender)[0]!);
  return (
    <div style={{ fontFamily: "'Courier New', Courier, monospace" }}>
      <div
        style={{ display: "flex", backgroundColor: "grey", overflow: "scroll" }}
      >
        {Object.keys(toRender).map((key, i) => (
          <div
            key={i}
            style={{ ...bubbleStyle, whiteSpace: "nowrap" }}
            onClick={() => {
              window.location.hash = key;
              update(key);
            }}
          >
            {i + 1}
            {")"} {key}
          </div>
        ))}
      </div>
      <div style={{ overflow: "scroll" }}>
        <div>
          year:{" "}
          <select
            onChange={(e) => updateYear(e.target.value)}
            defaultValue={yearKey}
          >
            {Object.keys(allWrapped).map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
        <h1 style={bubbleStyle}>{toRenderKey}</h1>
        <div>{toRender[toRenderKey]}</div>
      </div>
    </div>
  );
}

export enum Position {
  QB = 1,
  RB = 2,
  WR = 3,
  TE = 4,
  K = 5,
  DST = 16,
  FLEX = -1,
  SUPERFLEX = -2,
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function clog<T>(t: T): T {
  console.log(t);
  return t;
}

export function groupByF<T>(
  ts: T[],
  f: (t: T) => string
): { [key: string]: T[] } {
  return ts.reduce((prev, curr) => {
    const key = f(curr);
    if (!prev[key]) prev[key] = [];
    prev[key]!.push(curr);
    return prev;
  }, {} as { [key: string]: T[] });
}

export function mapDict<T, U>(
  d: { [key: string]: T },
  f: (t: T) => U,
  g: (key: string, t: T) => boolean = () => true
) {
  return Object.fromEntries(
    Object.entries(d)
      .filter(([key, t]) => g(key, t))
      .map(([key, t]) => [key, f(t)])
  );
}

export const bubbleStyle = {
  backgroundColor: "white",
  display: "inline-block",
  borderRadius: "1em",
  border: "2px solid black",
  padding: "0.7em",
  margin: "0.5em",
};

//

function json() {
  return <pre>{JSON.stringify(selectedWrapped(), null, 2)}</pre>;
}

function PointsAgainst() {
  return <PointsAgainstStateful />;
}

export class Helpers {
  static toFixed(n: number, d: number = 2): number {
    return parseFloat(n.toFixed(d));
  }

  static countStrings(arr: string[]): { [key: string]: number } {
    const c: { [key: string]: number } = {};
    arr.forEach((k) => {
      c[k] = (c[k] || 0) + 1;
    });
    return c;
  }

  static sortByKey<T>(arr: T[], f: (t: T) => number): T[] {
    return arr
      .map((obj) => ({ obj, v: f(obj) }))
      .sort((a, b) => a.v - b.v)
      .map((w) => w.obj);
  }

  static _startables = {
    [Position.QB]: 1,
    [Position.WR]: 2,
    [Position.RB]: 2,
    [Position.TE]: 1,
    [Position.K]: 1,
    [Position.DST]: 1,
    [Position.FLEX]: 1,
    [Position.SUPERFLEX]: 0,
  };

  static getIdeal(
    rostered: string[],
    started: string[],
    weekNum: string
  ): string[] {
    return Helpers.getIdealHelper(
      rostered,
      started,
      (player) => player.scores[weekNum] || 0
    );
  }

  static getIdealHelper(
    rostered: string[],
    started: string[],
    getScore: (player: NFLPlayerType) => number
  ): string[] {
    const ideal = [] as string[];
    const startables = { ...Helpers._startables };
    if (started.length >= 10) {
      startables[Position.FLEX]++;
    }
    if (started.length >= 11) {
      startables[Position.SUPERFLEX]++;
    }
    Object.entries(startables)
      .flatMap(([position, count]) =>
        Array.from(new Array(count)).map((_) => parseInt(position) as Position)
      )
      .map((position) =>
        position === Position.FLEX
          ? [Position.WR, Position.RB, Position.TE]
          : position === Position.SUPERFLEX
          ? [Position.QB, Position.WR, Position.RB, Position.TE]
          : [position]
      )
      .map((positionChoices) => {
        const idealPlayer = rostered
          .filter((playerId) => !ideal.includes(playerId))
          .map((playerId) => selectedWrapped().nflPlayers[playerId])
          .filter((player) =>
            positionChoices.includes(
              Position[player.position as any] as unknown as Position
            )
          )
          .map((player) => ({ ...player, score: getScore(player) }))
          .sort((player) => (started.includes(player.id) ? -1 : 1))
          .sort((a, b) => b.score - a.score)[0];
        if (idealPlayer) {
          ideal.push(idealPlayer.id);
        }
        return idealPlayer;
      });
    return ideal;
  }
}

function AllTimeRecords() {
  return (
    <div>
      {Object.entries({
        // interceptions: (year, wrapped) =>
        //   Object.values(wrapped.nflTeams).flatMap((t) =>
        //     Object.entries(t.nflGamesByScoringPeriod).map(([weekNum, obj]) => ({
        //       year,
        //       weekNum,
        //       name: t.name,
        //       value: (obj?.drives || []).filter(
        //         (drive) => drive?.toLowerCase() === "interception"
        //       ).length,
        //     }))
        //   ),
        // fumbles: (year, wrapped) =>
        //   Object.values(wrapped.nflTeams).flatMap((t) =>
        //     Object.entries(t.nflGamesByScoringPeriod).map(([weekNum, obj]) => ({
        //       year,
        //       weekNum,
        //       name: t.name,
        //       value: (obj?.drives || []).filter(
        //         (drive) => drive?.toLowerCase() === "fumble"
        //       ).length,
        //     }))
        //   ),
        manager_score: (year, wrapped) =>
          Object.values(wrapped.ffTeams).flatMap((t) =>
            Object.values(t.rosters)
              .map(({ weekNum, starting }) => ({
                year,
                weekNum,
                name: t.name,
                value: starting
                  .map(
                    (playerId) =>
                      wrapped.nflPlayers[playerId].scores[weekNum] || 0
                  )
                  .reduce((a, b) => a + b, 0),
              }))
              .filter(({ value }) => value !== 0)
          ),
        started_player_season_score: (year, wrapped) =>
          Object.values(wrapped.nflPlayers)
            .filter((p) =>
              Object.values(wrapped.ffTeams)
                .flatMap((t) =>
                  Object.values(t.rosters).flatMap((r) => r.starting)
                )
                .includes(p.id)
            )
            .map((p) => ({
              year,
              weekNum: "0",
              name: p.name,
              value: p.scores["0"],
            })),
        player_week_score: (year, wrapped) =>
          Object.values(wrapped.nflPlayers)
            .filter((p) => p.position !== "DST")
            .flatMap((p) =>
              Object.entries(p.scores)
                .map(([weekNum, score]) => ({
                  year,
                  weekNum,
                  name: p.name,
                  value: score,
                }))
                .filter(({ weekNum }) => weekNum !== "0")
            ),
        dst_week_score: (year, wrapped) =>
          Object.values(wrapped.nflPlayers)
            .filter((p) => p.position === "DST")
            .flatMap((p) =>
              Object.entries(p.scores)
                .map(([weekNum, score]) => ({
                  year,
                  weekNum,
                  name: p.name,
                  value: score,
                }))
                .filter(({ weekNum }) => weekNum !== "0")
            ),
      } as {
        [recordName: string]: (
          year: string,
          wrapped: WrappedType
        ) => { year: string; weekNum: string; name: string; value: number }[];
      })
        .map(([recordName, f]) => ({
          recordName,
          sorted: Object.entries(allWrapped)
            .flatMap(([year, yearWrapped]) => f(year, yearWrapped))
            .sort((a, b) => b.value - a.value)
            .map((o, i) => ({ ...o, i })),
        }))
        .map(({ recordName, sorted }) => (
          <div key={recordName} style={bubbleStyle}>
            <h1>{recordName}</h1>
            <table>
              <tbody>
                {[sorted.slice(0, 20), [null], sorted.slice(-20)]
                  .flatMap((s) => s)
                  .map((o, i) => (
                    <tr key={i}>
                      {o === null ? (
                        <td>----</td>
                      ) : (
                        <>
                          <td>#{o.i + 1}</td>
                          <td style={{ padding: "0 30px" }}>
                            {o.year} w{o.weekNum}
                          </td>
                          <td style={{ padding: "0 30px" }}>
                            {o.value.toFixed(2)}
                          </td>
                          <td>{o.name}</td>
                        </>
                      )}
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        ))}
    </div>
  );
}

function HeadToHead() {
  return Object.values(selectedWrapped().ffTeams)
    .map((t) => ({
      t,
      allMatchups: Object.entries(allWrapped)
        .flatMap(([year, oldWrapped]) =>
          Object.entries(oldWrapped.ffMatchups).map(([weekNum, matchups]) => ({
            year,
            weekNum,
            opponent: matchups
              .find((teamIds) => teamIds.includes(t.id))!
              .find((teamId) => teamId !== t.id)!,
          }))
        )
        .filter((m) => allWrapped[m.year].ffTeams[t.id])
        .filter((m) => !(m.year < newManagers[t.id]?.slice().reverse()[0]))
        .filter(
          (m) => !(m.year < newManagers[m.opponent]?.slice().reverse()[0])
        )
        .map((obj) => ({
          ...obj,
          myTotal: (
            allWrapped[obj.year].ffTeams[t.id].rosters[obj.weekNum]?.starting ||
            []
          )
            .map(
              (playerId) =>
                allWrapped[obj.year].nflPlayers[playerId].scores[obj.weekNum] ||
                0
            )
            .reduce((a, b) => a + b, 0),
          oppTotal: (
            allWrapped[obj.year].ffTeams[obj.opponent].rosters[obj.weekNum]
              ?.starting || []
          )
            .map(
              (playerId) =>
                allWrapped[obj.year].nflPlayers[playerId].scores[obj.weekNum] ||
                0
            )
            .reduce((a, b) => a + b, 0),
        }))
        .filter(({ myTotal }) => myTotal > 0),
    }))
    .map((obj) => ({
      ...obj,
      wins: obj.allMatchups.filter((m) => m.myTotal > m.oppTotal).length,
    }))
    .map((obj) => ({
      ...obj,
      ratio: obj.wins / obj.allMatchups.length,
    }))
    .sort((a, b) => b.ratio - a.ratio)
    .map((obj) => (
      <div key={obj.t.id}>
        <div style={bubbleStyle}>
          <h1>: {obj.t.name}</h1>
          <h3>
            wins: {obj.wins}/{obj.allMatchups.length} = {obj.ratio.toFixed(4)}{" "}
            .. PF-PA:{" "}
            {obj.allMatchups
              .map((m) => m.myTotal)
              .reduce((a, b) => a + b, 0)
              .toFixed(2)}
            -
            {obj.allMatchups
              .map((m) => m.oppTotal)
              .reduce((a, b) => a + b, 0)
              .toFixed(2)}
          </h3>
          <div>
            {Object.entries(groupByF(obj.allMatchups, (m) => m.opponent)).map(
              ([oppId, ms]) => (
                <div
                  key={oppId}
                  title={ms
                    .map(
                      (m) =>
                        `${m.year} w${m.weekNum} ${m.myTotal.toFixed(
                          2
                        )}-${m.oppTotal.toFixed(2)}`
                    )
                    .join("\n")}
                >
                  {ms.filter((m) => m.myTotal > m.oppTotal).length}/{ms.length}{" "}
                  ..{" "}
                  {ms
                    .map((m) => m.myTotal)
                    .reduce((a, b) => a + b, 0)
                    .toFixed(2)}
                  -
                  {ms
                    .map((m) => m.oppTotal)
                    .reduce((a, b) => a + b, 0)
                    .toFixed(2)}{" "}
                  .. {selectedWrapped().ffTeams[oppId].name}
                </div>
              )
            )}
          </div>
        </div>
      </div>
    ));
}

function WhatIf() {
  const [diff, updateDiff] = useState(10);
  return (
    <div>
      <div>
        what would the standings be if every matchup within X points were
        flipped? hypotheticalWins(realWins)
      </div>
      <div>
        pointsDiff:{" "}
        <input
          defaultValue={diff.toFixed(1)}
          onChange={(e) =>
            setTimeout(() => updateDiff(parseFloat(e.target!.value)))
          }
          type="number"
        />
      </div>
      <div style={bubbleStyle}>
        {Object.values(selectedWrapped().ffTeams)
          .map((t) => ({
            t,
            advantages: Object.entries(selectedWrapped().ffMatchups)
              .filter(
                ([weekNum]) => selectedWrapped().ffTeams[t.id].rosters[weekNum]
              )
              .map(([weekNum, teamIds]) =>
                teamIds
                  .find((teamIds) => teamIds.includes(t.id))!
                  .sort((a, b) => (a === t.id ? 1 : -1))
                  .map((teamId) =>
                    selectedWrapped()
                      .ffTeams[teamId].rosters[weekNum].starting.map(
                        (playerId) =>
                          selectedWrapped().nflPlayers[playerId].scores[weekNum]
                      )
                      .reduce((a, b) => a + b, 0)
                  )
              )
              .map((scores) => scores[1] - scores[0]),
          }))
          .map((o) => ({
            ...o,
            wins: o.advantages.filter((a) => a > 0).length,
            altWins: o.advantages
              .map((a) => (Math.abs(a) < diff ? -a : a))
              .filter((a) => a > 0).length,
          }))
          .sort((a, b) => b.altWins - a.altWins)
          .map((o) => (
            <div key={o.t.id}>
              <div>
                {o.altWins}({o.wins}) {o.t.name}
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}

function ConsistentlyAverage() {
  return (
    <div>
      <div>
        <div>
          how many wins would each manager have if every player scored X, where
          X is their mean score on the season
        </div>
        <div style={bubbleStyle}>
          {Object.values(selectedWrapped().ffTeams)
            .map((t) => ({
              t,
              advantages: Object.entries(selectedWrapped().ffMatchups)
                .filter(
                  ([weekNum]) =>
                    selectedWrapped().ffTeams[t.id].rosters[weekNum]
                )
                .map(([weekNum, teamIds]) =>
                  teamIds
                    .find((teamIds) => teamIds.includes(t.id))!
                    .sort((a, b) => (a === t.id ? 1 : -1))
                    .map((teamId) =>
                      selectedWrapped()
                        .ffTeams[teamId].rosters[weekNum].starting.map(
                          (playerId) =>
                            selectedWrapped().nflPlayers[playerId].average
                        )
                        .reduce((a, b) => a + b, 0)
                    )
                )
                .map((scores) => scores[1] - scores[0]),
            }))
            .map((o) => ({
              ...o,
              wins: o.advantages.filter((a) => a > 0).length,
            }))
            .sort((a, b) => b.wins - a.wins)
            .map((o) => (
              <div key={o.t.id}>
                <div>
                  {o.wins} {o.t.name}
                </div>
              </div>
            ))}
        </div>
      </div>
      <div>
        <div>...thus far week on week</div>
        <div style={bubbleStyle}>
          {Object.values(selectedWrapped().ffTeams)
            .map((t) => ({
              t,
              advantages: Object.entries(selectedWrapped().ffMatchups)
                .filter(
                  ([weekNum]) =>
                    selectedWrapped().ffTeams[t.id].rosters[weekNum]
                )
                .map(([weekNum, teamIds]) =>
                  teamIds
                    .find((teamIds) => teamIds.includes(t.id))!
                    .sort((a, b) => (a === t.id ? 1 : -1))
                    .map((teamId) =>
                      selectedWrapped()
                        .ffTeams[teamId].rosters[weekNum].starting.map(
                          (playerId) =>
                            Object.entries(
                              selectedWrapped().nflPlayers[playerId].scores
                            )
                              .filter(
                                ([iWeekNum, _]) =>
                                  iWeekNum !== "0" &&
                                  parseInt(iWeekNum) <= parseInt(weekNum)
                              )
                              .map(([_, score]) => score)
                        )
                        .map(
                          (scores) =>
                            scores.reduce((a, b) => a + b, 0) / scores.length
                        )
                        .reduce((a, b) => a + b, 0)
                    )
                )
                .map((scores) => scores[1] - scores[0]),
            }))
            .map((o) => ({
              ...o,
              wins: o.advantages.filter((a) => a > 0).length,
            }))
            .sort((a, b) => b.wins - a.wins)
            .map((o) => (
              <div key={o.t.id}>
                <div>
                  {o.wins} {o.t.name}
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}

function Punts() {
  return <PuntsStateful />;
}

function PlayerPlot() {
  return <PlayerPlotStateful />;
}

function DraftValue() {
  return <DraftValueStateful />;
}

function ManagerPlot() {
  return <PointsForStateful />;
}

function Simps() {
  return <SimpsStateful />;
}
