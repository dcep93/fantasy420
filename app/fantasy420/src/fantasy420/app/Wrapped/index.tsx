import { ReactNode, useState } from "react";
import { printF } from "../Fetch";
import FetchWrapped, { WrappedType } from "./FetchWrapped";
import rawWrapped from "./wrapped.json";

export const wrapped: WrappedType = rawWrapped;

export default function Wrapped() {
  document.title = "Fantasy Wrapped";
  const toRender: { [key: string]: () => ReactNode } = {
    SqueezesAndStomps,
    WeekTopsAndBottoms,
    BestByPosition,
    DeterminedByDiscreteScoring,
    ChosenWrong,
    GooseEggs,
    UniquesStarted,
    BoomBust,
    json,
  };
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
            style={bubbleStyle}
            onClick={() => {
              window.location.hash = key;
              update(key);
            }}
          >
            {key}
          </div>
        ))}
      </div>
      <div>
        <h1 style={bubbleStyle}>{toRenderKey}</h1>
        <div>{toRender[toRenderKey]!()}</div>
      </div>
    </div>
  );
}

enum Position {
  QB = 1,
  RB = 2,
  WR = 3,
  TE = 4,
  K = 5,
  DST = 16,
}

function count(arr: string[]): { [key: string]: number } {
  const c: { [key: string]: number } = {};
  arr.forEach((k) => {
    c[k] = (c[k] || 0) + 1;
  });
  return c;
}

function sortByKey<T>(arr: T[], f: (t: T) => number): T[] {
  return arr
    .map((obj) => ({ obj, v: f(obj) }))
    .sort((a, b) => a.v - b.v)
    .map((w) => w.obj);
}

const bubbleStyle = {
  backgroundColor: "white",
  display: "inline-block",
  borderRadius: "1em",
  border: "2px solid black",
  padding: "0.7em",
  margin: "0.5em",
};

//

function json() {
  return (
    <pre onClick={() => console.log(printF(FetchWrapped))}>
      {JSON.stringify(wrapped, null, 2)}
    </pre>
  );
}

function SqueezesAndStomps() {
  return <div></div>;
}

function WeekTopsAndBottoms() {
  const counts = Object.fromEntries(
    Object.values(wrapped.ffTeams).map((p) => [
      p.id,
      { ...p, tops: [] as string[], bottoms: [] as string[] },
    ])
  );
  const vals = Object.entries(wrapped.ffMatchups)
    .map(([periodId, matchups]) => {
      const sortedTeams = sortByKey(
        matchups
          .flatMap((match) => match.map((teamId) => wrapped.ffTeams[teamId]))
          .filter((team) => team.rosters[periodId]) // todo
          .map((team) => ({
            ...team,
            score: team.rosters[periodId].starting
              .map(
                (playerId) => wrapped.nflPlayers[playerId].scores[periodId] || 0
              )
              .reduce((a, b) => a + b, 0),
          })),
        (team) => -team.score
      );
      if (sortedTeams.length === 0) return undefined;
      if (sortedTeams[0].score === 0) return undefined;
      const winnerAndLoser = {
        loser: sortedTeams[sortedTeams.length - 1],
        winner: sortedTeams[0],
        periodId,
      };
      counts[winnerAndLoser.winner.id].tops.push(periodId);
      counts[winnerAndLoser.loser.id].bottoms.push(periodId);
      return winnerAndLoser;
    })
    .filter((v) => v !== undefined)
    .map((v) => v!);
  return (
    <div>
      <div>
        <table style={bubbleStyle}>
          <thead>
            <tr>
              <td></td>
              <td>tops</td>
              <td>bottoms</td>
            </tr>
          </thead>
          <tbody>
            {Object.values(counts).map((p, i) => (
              <tr key={i}>
                <td>
                  <b>{p.name}</b>
                </td>
                <td>{p.tops.join(",")}</td>
                <td>{p.bottoms.join(",")}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div>
          <div style={bubbleStyle}>
            {vals.map((o, i) => (
              <div key={i}>
                week {o.periodId}: top score {o.winner.score.toFixed(2)}:{" "}
                <b>{o.winner.name}</b>
              </div>
            ))}
          </div>
        </div>
        <div>
          <div style={bubbleStyle}>
            {vals.map((o, i) => (
              <div key={i}>
                week {o.periodId}: bottom score {o.loser.score.toFixed(2)}{" "}
                <b>{o.loser.name}</b>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function BestByPosition() {
  return <div></div>;
}

function DeterminedByDiscreteScoring() {
  return <div></div>;
}

function ChosenWrong() {
  return <div></div>;
}

function GooseEggs() {
  return <div></div>;
}

function UniquesStarted() {
  return (
    <div>
      {Object.values(Position)
        .filter((p) => Number.isInteger(p))
        .map((p) => p as Position)
        .map((p) => (
          <div key={p}>
            <div style={bubbleStyle}>
              {Position[p]}
              <div>
                {Object.values(wrapped.ffTeams)
                  .map((ffTeam) => ({
                    teamName: ffTeam.name,
                    started: Object.entries(
                      count(
                        Object.values(ffTeam.rosters).flatMap(
                          (roster) => roster.starting
                        )
                      )
                    )
                      .map(([playerId, c]) => ({
                        player: wrapped.nflPlayers[playerId],
                        c,
                      }))
                      .filter(({ player }) => player?.position === Position[p])
                      .map(({ player, c }) => `${player.name}: ${c}`),
                  }))
                  .sort((a, b) => a.started.length - b.started.length)
                  .map(({ teamName, started }, i) => (
                    <div key={i}>
                      <b>
                        {teamName}: ({started.length})
                      </b>{" "}
                      - {started.join(" , ")}
                    </div>
                  ))}
              </div>
            </div>
          </div>
        ))}
    </div>
  );
}

function BoomBust() {
  function getStdDevOverMean(scores: number[]): number {
    if (scores.length <= 1) return NaN;
    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    return (
      Math.pow(
        scores
          .map((s) => mean - s)
          .map((s) => Math.pow(s, 2))
          .reduce((a, b) => a + b, 0) / scores.length,
        0.5
      ) / mean
    );
  }
  return (
    <div>
      <div style={bubbleStyle}>ignores zeroes</div>
      <div>
        {[
          { valueName: "stddev / mean", getValue: getStdDevOverMean },
          {
            valueName: "-stddev / mean",
            getValue: (scores: number[]) => -getStdDevOverMean(scores),
          },
          {
            valueName: "max",
            getValue: (scores: number[]) => Math.max(...scores),
          },
          {
            valueName: "p75",
            getValue: (scores: number[]) =>
              scores.slice().sort((a, b) => a - b)[
                Math.ceil(scores.length * 0.75 - 1)
              ],
          },
          {
            valueName: "p50",
            getValue: (scores: number[]) =>
              scores.slice().sort((a, b) => a - b)[
                Math.ceil(scores.length * 0.5 - 1)
              ],
          },
          {
            valueName: "p25",
            getValue: (scores: number[]) =>
              scores.slice().sort((a, b) => a - b)[
                Math.ceil(scores.length * 0.25 - 1)
              ],
          },
          {
            valueName: "min",
            getValue: (scores: number[]) => Math.min(...scores),
          },
        ].map(({ valueName, getValue, ...extra }, i) => (
          <div key={i} style={bubbleStyle}>
            <table>
              <thead>
                <tr>
                  <th colSpan={2}>{valueName}</th>
                  <th>scores</th>
                </tr>
              </thead>
              <tbody>
                {Object.values(wrapped.nflPlayers)
                  .map((p) => ({
                    ...p,
                    scoresArr: Object.entries(p.scores)
                      .filter(([scoringPeriod]) => scoringPeriod !== "0")
                      .map(([_, p]) => p)
                      .filter((s) => s !== undefined) as number[],
                  }))
                  .map((p) => ({
                    value: getValue(p.scoresArr.filter((s) => s !== 0)),
                    ...p,
                  }))
                  .filter(({ value }) => isFinite(value))
                  .sort((a, b) => b.value - a.value)
                  .slice(0, 20)
                  .map((p, j) => (
                    <tr key={j}>
                      <td>{p.value.toFixed(2)}</td>
                      <td>{p.name}</td>
                      {p.scoresArr.map((s, k) => (
                        <td key={k} style={{ paddingLeft: "20px" }}>
                          {s}
                        </td>
                      ))}
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </div>
  );
}
