import { useMemo, useState } from "react";
import { getWrapped, NFLPlayerType, WrappedType } from "../FetchWrapped";
import allWrapped from "./allWrapped";
import ErrorBoundary from "./ErrorBoundary";
import AllTimeRecords from "./tabs/AllTimeRecords";
import Benchwarmers from "./tabs/Benchwarmers";
import BestByPosition from "./tabs/BestByPosition";
import BoomBust from "./tabs/BoomBust";
import Bopped from "./tabs/Bopped";
import ChosenWrong from "./tabs/ChosenWrong";
import ConsistentlyAverage from "./tabs/ConsistentlyAverage";
import DeterminedByDiscreteScoring from "./tabs/DeterminedByDiscreteScoring";
import DraftBoard from "./tabs/DraftBoard";
import DraftValue from "./tabs/DraftValue";
import ExtremeStuds from "./tabs/ExtremeStuds";
import FantasyCalc from "./tabs/FantasyCalc";
import GooseEggs from "./tabs/GooseEggs";
import HeadToHead from "./tabs/HeadToHead";
import Injuries from "./tabs/Injuries";
import ManagerPlot from "./tabs/ManagerPlot";
import Negatives from "./tabs/Negatives";
import OwnedTeams from "./tabs/OwnedTeams";
import Performance from "./tabs/Performance";
import PerformanceTotals from "./tabs/PerformanceTotals";
import PlayerPlot from "./tabs/PlayerPlot";
import PlayerStats from "./tabs/PlayerStats";
import PointsAgainst from "./tabs/PointsAgainst";
import Punts from "./tabs/Punts";
import SecondLost from "./tabs/SecondLost";
import Simps from "./tabs/Simps";
import SqueezesAndStomps from "./tabs/SqueezesAndStomps";
import Stacks from "./tabs/Stacks";
import StrengthOfSeason from "./tabs/StrengthOfSeason";
import Trades from "./tabs/Trades";
import UniquesRostered from "./tabs/UniquesRostered";
import UniquesStarted from "./tabs/UniquesStarted";
import WeekTopsAndBottoms from "./tabs/WeekTopsAndBottoms";
import WhatIf from "./tabs/WhatIf";

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
  const [fetched, updateFetched] = useState(false);
  useMemo(
    () =>
      Promise.resolve()
        .then(getWrapped)
        .then((wrapped) => (allWrapped[currentYear] = wrapped))
        .then(() => updateFetched(true)),
    []
  );
  return <SubWrapped key={fetched.toString()} />;
}

function SubWrapped() {
  document.title = "Fantasy Wrapped";
  const [yearKey, updateYear] = useState(selectedYear);
  selectedYear = yearKey;
  const toRender: { [key: string]: () => JSX.Element } = {
    StrengthOfSeason,
    FantasyCalc,
    PlayerPlot,
    PlayerStats,
    ManagerPlot,
    Trades,
    WeekTopsAndBottoms,
    SqueezesAndStomps,
    GooseEggs,
    Bopped,
    ChosenWrong,
    DraftValue,
    DraftBoard,
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
    SecondLost,
    WhatIf,
    ConsistentlyAverage,
    Simps,
    Punts,
    json,
  };
  var hashKey = window.location.hash.substring(1);
  if (!toRender[hashKey]) {
    window.location.hash = "";
    hashKey = "";
  }
  const [toRenderKey, update] = useState(hashKey || Object.keys(toRender)[0]!);
  const Tab = toRender[toRenderKey];
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
        <div>
          <ErrorBoundary>
            <Tab />
          </ErrorBoundary>
        </div>
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

function json() {
  return <pre>{JSON.stringify(selectedWrapped(), null, 2)}</pre>;
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
