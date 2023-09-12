import { ReactNode, useState } from "react";
import Accuracy from "../Accuracy";
import { printF } from "../Fetch";
import FetchWrapped, { WrappedType } from "./FetchWrapped";
import rawWrapped from "./wrapped.json";

export const wrapped: WrappedType = rawWrapped;

export default function Wrapped() {
  document.title = "Fantasy Wrapped";
  const toRender: { [key: string]: ReactNode } = Object.fromEntries(
    Object.entries({
      SqueezesAndStomps,
      WeekTopsAndBottoms,
      BestByPosition,
      DeterminedByDiscreteScoring,
      GooseEggs,
      UniquesStarted,
      BoomBust,
      Accuracy,
      json,
    }).map(([k, v]) => [k, v()])
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
        <div>{toRender[toRenderKey]}</div>
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

function toFixed(n: number, d: number = 2): number {
  return parseFloat(n.toFixed(d));
}

function countStrings(arr: string[]): { [key: string]: number } {
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
  const num = 10;
  const rawPoints = sortByKey(
    Object.entries(wrapped.ffMatchups)
      .map(([periodId, matchups]) => ({
        periodId,
        matchups: matchups.map((matchup) =>
          sortByKey(
            matchup
              .map((teamId) => wrapped.ffTeams[teamId])
              .filter((team) => team.rosters[periodId])
              .map((team) => ({
                ...team,
                score: team.rosters[periodId].starting
                  .map(
                    (playerId) =>
                      wrapped.nflPlayers[playerId].scores[periodId] || 0
                  )
                  .reduce((a, b) => a + b, 0),
              })),
            (p) => p.score
          )
        ),
      }))
      .flatMap(({ periodId, matchups }) =>
        matchups
          .filter((teams) => teams[0]?.score)
          .map((teams) => ({
            periodId,
            diff: teams[1].score - teams[0].score,
            winner: teams[1].name,
            loser: teams[0].name,
          }))
      ),
    (match) => match.diff
  );
  return (
    <div>
      <div>
        <div style={bubbleStyle}>
          {rawPoints.slice(0, num).map((point, i) => (
            <div key={i}>
              week {point.periodId}: {point.diff.toFixed(2)} point squeeze /{" "}
              <b>{point.winner}</b> beat <b>{point.loser}</b>
            </div>
          ))}
        </div>
      </div>
      <div>
        <div style={bubbleStyle}>
          {rawPoints
            .slice(-num)
            .reverse()
            .map((point, i) => (
              <div key={i}>
                week {point.periodId}: {point.diff.toFixed(2)} point stomp /{" "}
                <b>{point.winner}</b> beat <b>{point.loser}</b>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
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
  return (
    <div>
      {Object.values(Position)
        .filter((p) => Number.isInteger(p))
        .map((p) => p as Position)
        .map((position, i) => (
          <div key={i} style={bubbleStyle}>
            <h3>{Position[position]}</h3>
            {sortByKey(
              Object.values(wrapped.ffTeams).map((team) => ({
                ...team,
                score: Object.entries(team.rosters)
                  .flatMap(([scoringPeriod, rosters]) =>
                    rosters.starting.map((playerId) => ({
                      scoringPeriod,
                      ...wrapped.nflPlayers[playerId],
                    }))
                  )
                  .filter((p) => p.position === Position[position])
                  .map((p) => p.scores[p.scoringPeriod]!)
                  .reduce((a, b) => a + b, 0),
              })),
              (obj) => -obj.score
            ).map((obj, i) => (
              <div key={i}>
                ({i + 1}) {obj.score.toFixed(2)} <b>{obj.name}</b>
              </div>
            ))}
          </div>
        ))}
    </div>
  );
}

function DeterminedByDiscreteScoring() {
  function calculateDSTDifference(
    teamId: string,
    periodId: string
  ): { superscore: number; msg: string } {
    const started = wrapped.ffTeams[teamId].rosters[periodId].starting
      .map((playerId) => wrapped.nflPlayers[playerId])
      .find((p) => p.position === Position[Position.DST]);
    if (!started) return { superscore: 0, msg: "NO DST STARTED" };
    const offense =
      wrapped.nflTeams[started.nflTeamId].nflGamesByScoringPeriod[periodId]!;
    var superscore = 0;
    const yards = offense.yardsAllowed;
    if (yards >= 550) {
      superscore += -6 - 1 * ((yards - 500) / 50);
      superscore -= -7;
    } else if (yards >= 500) {
      superscore += -6 - 1 * ((yards - 500) / 50);
      superscore -= -6;
    } else if (yards >= 450) {
      superscore += -5 - 1 * ((yards - 450) / 50);
      superscore -= -5;
    } else if (yards >= 400) {
      superscore += -3 - 2 * ((yards - 400) / 50);
      superscore -= -3;
    } else if (yards >= 350) {
      superscore += -1 - 2 * ((yards - 350) / 50);
      superscore -= -1;
    } else if (yards >= 300) {
      superscore += 0 - 1 * ((yards - 300) / 50);
      superscore -= 0;
    } else if (yards >= 200) {
      superscore += 2 - 2 * ((yards - 200) / 100);
      superscore -= 2;
    } else if (yards >= 100) {
      superscore += 3 - 1 * ((yards - 100) / 100);
      superscore -= 3;
    } else {
      superscore += 5 - 2 * (yards / 100);
      superscore -= 5;
    }
    if (offense.pointsAllowed >= 46) {
      superscore += -3 - 2 * ((offense.pointsAllowed - 35) / 11);
      superscore -= -5;
    } else if (offense.pointsAllowed >= 35) {
      superscore += -3 - 2 * ((offense.pointsAllowed - 35) / 11);
      superscore -= -3;
    } else if (offense.pointsAllowed >= 28) {
      superscore += -1 - 2 * ((offense.pointsAllowed - 28) / 7);
      superscore -= -1;
    } else if (offense.pointsAllowed >= 14) {
      superscore += 1 - 2 * ((offense.pointsAllowed - 14) / 14);
      superscore -= 1;
    } else if (offense.pointsAllowed >= 7) {
      superscore += 3 - 2 * ((offense.pointsAllowed - 7) / 7);
      superscore -= 3;
    } else if (offense.pointsAllowed >= 1) {
      superscore += 4 - 1 * ((offense.pointsAllowed - 1) / 6);
      superscore -= 4;
    } else {
      superscore += 5 - (1 * (offense.pointsAllowed - 0)) / 1;
      superscore -= 5;
    }
    return { superscore, msg: `${started.name} ${superscore.toFixed(2)}` };
  }
  function calculateKDifference(
    teamId: string,
    periodId: string
  ): { superscore: number; msg: string } {
    const started = wrapped.ffTeams[teamId].rosters[periodId].starting
      .map((playerId) => wrapped.nflPlayers[playerId])
      .find((p) => p.position === Position[Position.K]);
    if (!started) return { superscore: 0, msg: "NO K STARTED" };
    const offense =
      wrapped.nflTeams[started.nflTeamId].nflGamesByScoringPeriod[periodId]!;
    const superscore = offense.fieldGoals
      .map((yards) => {
        var points = yards / 10;
        if (yards >= 60) {
          points -= 6;
        } else if (yards >= 50) {
          points -= 5;
        } else if (yards >= 40) {
          points -= 4;
        } else {
          points -= 3;
        }
        return points;
      })
      .reduce((a, b) => a + b, 0);
    return { superscore, msg: `${started.name} ${superscore.toFixed(2)}` };
  }
  return (
    <div>
      {Object.entries(wrapped.ffMatchups)
        .flatMap(([periodId, matchup]) =>
          matchup.map((match) => ({
            periodId,
            teams: sortByKey(
              match
                .map((teamId) => wrapped.ffTeams[teamId])
                .filter((team) => team.rosters[periodId])
                .map((team) => ({
                  ...team,
                  score: toFixed(
                    team.rosters[periodId].starting
                      .map(
                        (playerId) =>
                          wrapped.nflPlayers[playerId].scores[periodId]!
                      )
                      .reduce((a, b) => a + b, 0)
                  ),
                }))
                .map((team) => {
                  const ds = [
                    calculateDSTDifference(team.id, periodId),
                    calculateKDifference(team.id, periodId),
                  ];
                  return {
                    ...team,
                    msgs: ds.map((d) => d.msg),
                    superscore:
                      team.score +
                      ds.map((d) => d.superscore).reduce((a, b) => a + b, 0),
                  };
                }),
              (team) => -team.score
            ),
          }))
        )
        .map(({ teams, ...match }) =>
          teams.length === 0
            ? null
            : {
                ...match,
                winner: teams[0],
                loser: teams[1],
              }
        )
        .filter((match) => match !== null)
        .map((match) => match!)
        .filter((match) => match.loser.superscore > match.winner.superscore)
        .map((match, i) => (
          <div key={i}>
            <div style={bubbleStyle}>
              <div>week {match.periodId}:</div>
              <div>
                <b>{match.loser.name}</b> {match.loser.score} (ss{" "}
                {match.loser.superscore.toFixed(2)})
              </div>
              <div>would have beaten</div>
              <div>
                <b>{match.winner.name}</b> {match.winner.score} (ss{" "}
                {match.winner.superscore.toFixed(2)})
              </div>
              <div>if K and DST used continuous scoring:</div>
              <div style={bubbleStyle}>
                <div>{match.loser.msgs.join(" ")}</div>
                <div>{match.winner.msgs.join(" ")}</div>
              </div>
            </div>
          </div>
        ))}
    </div>
  );
}

function GooseEggs() {
  return (
    <div>
      {Object.values(wrapped.ffTeams).map((team, teamIndex) => (
        <div key={teamIndex}>
          <div style={bubbleStyle}>
            <h4>{team.name}</h4>
            <div>
              {Object.keys(
                countStrings(
                  Object.values(team.rosters).flatMap(
                    (roster) => roster.starting
                  )
                )
              )
                .map((playerId) => wrapped.nflPlayers[playerId])
                .map((p) => ({
                  ...p,
                  gooseEggs: Object.entries(p.scores)
                    .filter(([_, score]) => score! <= 0)
                    .map(([periodId]) => periodId)
                    .filter((periodId) => periodId !== "0"),
                }))
                .filter((p) => p.gooseEggs.length > 0)
                .sort((a, b) => b.gooseEggs.length - a.gooseEggs.length)
                .map((p) => `${p.name} -> ${p.gooseEggs}`)
                .map((str, i) => (
                  <div key={i}>{str}</div>
                ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
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
                      countStrings(
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
