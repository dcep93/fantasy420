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
      Negatives,
      UniquesStarted,
      BoomBust,
      Accuracy,
      OwnedTeams,
      Benchwarmers,
      Injuries,
      ChosenWrong,
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

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function clog<T>(t: T): T {
  console.log(t);
  return t;
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

function ChosenWrong() {
  const startables = {
    [Position.QB]: 1,
    [Position.WR]: 2,
    [Position.RB]: 2,
    [Position.TE]: 1,
    [Position.K]: 1,
    [Position.DST]: 1,
    [Position.FLEX]: 2,
    [Position.SUPERFLEX]: 1,
  };
  function getIdeal(rostered: string[], weekNum: string): string[] {
    const ideal = [] as string[];
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
          .map((playerId) => wrapped.nflPlayers[playerId])
          .filter((player) =>
            positionChoices.includes(
              Position[player.position as any] as unknown as Position
            )
          )
          .map((player) => ({ ...player, score: player.scores[weekNum] || 0 }))
          .sort((a, b) => b.score - a.score)[0];
        if (idealPlayer) {
          ideal.push(idealPlayer.id);
        }
        return idealPlayer;
      });
    return ideal;
  }
  return (
    <div>
      {Object.entries(wrapped.ffMatchups)
        .map(([weekNum, matchups]) => ({ weekNum, matchups }))
        .filter(
          ({ weekNum, matchups }) =>
            wrapped.ffTeams[matchups[0][0]].rosters[weekNum]
        )
        .flatMap(({ weekNum, matchups }) =>
          matchups.map((matchup) => ({
            weekNum,
            teams: matchup
              .map((m) => wrapped.ffTeams[m])
              .filter((team) => team.rosters[weekNum])
              .map((team) => ({
                ...team,
                score: team.rosters[weekNum].starting
                  .map(
                    (playerId) =>
                      wrapped.nflPlayers[playerId].scores[weekNum] || 0
                  )
                  .reduce((a, b) => a + b, 0),
                ideal: getIdeal(team.rosters[weekNum].rostered, weekNum),
              }))
              .map((team) => ({
                ...team,
                idealScore: toFixed(
                  team.ideal
                    .map(
                      (playerId) =>
                        wrapped.nflPlayers[playerId].scores[weekNum] || 0
                    )
                    .reduce((a, b) => a + b, 0)
                ),
              }))
              .map((team) => ({
                ...team,
                text: `[${team.name}] ${toFixed(team.score)} -> ${
                  team.idealScore
                }`,
              }))
              .sort((a, b) => a.score - b.score),
          }))
        )
        .filter(
          (matchup) => matchup.teams[0].idealScore > matchup.teams[1].score
        )
        .map((matchup, i) => (
          <div key={i}>
            <div style={bubbleStyle}>
              <div>week {matchup.weekNum}</div>
              <div>{matchup.teams[0].text}</div>
              <div>would have beaten</div>
              <div>{matchup.teams[1].text}</div>
              <div>if they had started</div>
              <div>---</div>
              <div>
                {matchup.teams[0].ideal
                  .filter(
                    (playerId) =>
                      !matchup.teams[0].rosters[
                        matchup.weekNum
                      ].starting.includes(playerId)
                  )
                  .map((playerId) => wrapped.nflPlayers[playerId])
                  .map((player) => (
                    <div key={player.id}>
                      {player.name} {player.scores[matchup.weekNum]}
                    </div>
                  ))}
              </div>
              <div>---</div>
              <div>instead of</div>
              <div>---</div>
              <div>
                {matchup.teams[0].rosters[matchup.weekNum].starting
                  .filter(
                    (playerId) => !matchup.teams[0].ideal.includes(playerId)
                  )
                  .map((playerId) => wrapped.nflPlayers[playerId])
                  .map((player) => (
                    <div key={player.id}>
                      {player.name} {player.scores[matchup.weekNum]}
                    </div>
                  ))}
              </div>
            </div>
          </div>
        ))}
    </div>
  );
}

function Injuries() {
  return (
    <div style={{ display: "flex", flexWrap: "wrap" }}>
      {Object.values(wrapped.ffTeams)
        .map((t) => ({
          ...t,
          injuries: Object.values(t.rosters)
            .filter((r) => r.weekNum !== "0")
            .flatMap((r) =>
              r.rostered
                .map((playerId) => wrapped.nflPlayers[playerId])
                .map((o) => ({
                  playerId: o.id,
                  name: o.name,
                  weekNum: r.weekNum,
                  currentScore: o.scores[r.weekNum],
                  followingScore: o.scores[parseInt(r.weekNum) + 1],
                }))
                .filter(
                  (o) =>
                    (r.starting.includes(o.playerId) || o.currentScore !== 0) &&
                    o.followingScore === 0
                )
            ),
        }))
        .map((team) => (
          <div key={team.id} style={bubbleStyle}>
            <h1>{team.name}</h1>
            {team.injuries.map((injury, i) => (
              <div key={i}>
                {injury.name} injured week {injury.weekNum} after scoring{" "}
                {injury.currentScore}
              </div>
            ))}
          </div>
        ))}
    </div>
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
        .filter((p) => p > 0)
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
                  .map((p) => p.scores[p.scoringPeriod] || 0)
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
  ): { superscore: number; msg: string } | null {
    const started = wrapped.ffTeams[teamId].rosters[periodId].starting
      .map((playerId) => wrapped.nflPlayers[playerId])
      .find((p) => p.position === Position[Position.DST]);
    if (!started) return { superscore: 0, msg: "NO DST STARTED" };
    const offense =
      wrapped.nflTeams[started.nflTeamId].nflGamesByScoringPeriod[periodId];
    if (!offense) return null;
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
  ): { superscore: number; msg: string } | null {
    const started = wrapped.ffTeams[teamId].rosters[periodId].starting
      .map((playerId) => wrapped.nflPlayers[playerId])
      .find((p) => p.position === Position[Position.K]);
    if (!started) return { superscore: 0, msg: "NO K STARTED" };
    const offense =
      wrapped.nflTeams[started.nflTeamId].nflGamesByScoringPeriod[periodId];
    if (!offense) return null;
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
                  ].filter((o) => o !== null);
                  return {
                    ...team,
                    msgs: ds.map((d) => d!.msg),
                    superscore:
                      team.score +
                      ds.map((d) => d!.superscore).reduce((a, b) => a + b, 0),
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

function Negatives() {
  return (
    <div>
      {Object.values(wrapped.nflPlayers)
        .flatMap((p) =>
          Object.entries(p.scores).map(([weekNum, score]) => ({
            ...p,
            weekNum,
            score,
          }))
        )
        .filter((p) => p.weekNum !== "0")
        .filter((p) => p.score! < 0)
        .filter((p) => !["K", "DST"].includes(p.position))
        .map((p, i) => (
          <div key={i}>
            {p.name} scored {p.score} week {p.weekNum}
          </div>
        ))}
    </div>
  );
}

function GooseEggs() {
  return (
    <div style={{ display: "flex", flexWrap: "wrap" }}>
      {Object.values(wrapped.ffTeams).map((team, teamIndex) => (
        <div key={teamIndex}>
          <div style={bubbleStyle}>
            <h4>{team.name}</h4>
            <div>
              {Object.entries(
                Object.entries(team.rosters)
                  .flatMap(([weekNum, r]) =>
                    r.starting.map((playerId) => ({
                      weekNum,
                      p: wrapped.nflPlayers[playerId],
                    }))
                  )
                  .map((o) => ({ ...o, score: o.p.scores[o.weekNum]! }))
                  .filter(({ score }) => score <= 0)
                  .reduce((prev, curr) => {
                    prev[curr.p.name] = (prev[curr.p.name] || []).concat(
                      curr.weekNum
                    );
                    return prev;
                  }, {} as { [name: string]: string[] })
              )
                .map(([name, gooseEggs]) => ({ name, gooseEggs }))
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
        .filter((p) => p > 0)
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

function Benchwarmers() {
  const weeks = Object.keys(Object.values(wrapped.ffTeams)[0].rosters).filter(
    (weekNum) => weekNum !== "0"
  );
  return (
    <div>
      <div style={bubbleStyle}>
        {weeks
          .flatMap((weekNum) =>
            Object.values(wrapped.ffTeams).map((team) => ({
              teamName: team.name,
              weekNum,
              score: team.rosters[weekNum].rostered
                .filter(
                  (playerId) =>
                    !team.rosters[weekNum].starting.includes(playerId)
                )
                .map(
                  (playerId) =>
                    wrapped.nflPlayers[playerId].scores[weekNum] || 0
                )
                .reduce((a, b) => a + b, 0),
            }))
          )
          .sort((a, b) => b.score - a.score)
          .map((o, i) => (
            <div key={i}>
              [{o.teamName}] bench week {o.weekNum} scored {toFixed(o.score)}
            </div>
          ))}
      </div>
      <div style={bubbleStyle}>
        {weeks
          .flatMap((weekNum) =>
            Object.values(wrapped.ffTeams).flatMap((team) =>
              team.rosters[weekNum].rostered
                .filter(
                  (playerId) =>
                    !team.rosters[weekNum].starting.includes(playerId)
                )
                .map((playerId) => ({
                  teamName: team.name,
                  weekNum,
                  player: wrapped.nflPlayers[playerId],
                }))
            )
          )
          .map((o) => ({ ...o, score: o.player.scores[o.weekNum]! }))
          .sort((a, b) => b.score - a.score)
          .slice(0, weeks.length * Object.keys(wrapped.ffTeams).length)
          .map((o, i) => (
            <div key={i}>
              [{o.teamName}]: [{o.player.name}] week {o.weekNum}: {o.score}
            </div>
          ))}
      </div>
    </div>
  );
}

function OwnedTeams() {
  const byNFLTeam = Object.fromEntries(
    Object.values(wrapped.nflTeams)
      .map((nflTeam) => ({
        owned: Object.values(wrapped.ffTeams).flatMap((ffTeam) =>
          ffTeam.rosters["0"].rostered
            .map((playerId) => wrapped.nflPlayers[playerId])
            .filter((p) => p.nflTeamId === nflTeam.id)
            .map((nflPlayer) => ({ ffTeam, nflPlayer }))
        ),
        ...nflTeam,
      }))
      .map((o) => [o.id, o])
  );
  const byFFTeam = Object.values(wrapped.ffTeams).map((ffTeam) => ({
    owned: Object.values(wrapped.nflTeams).flatMap((nflTeam) =>
      ffTeam.rosters["0"].rostered
        .map((playerId) => wrapped.nflPlayers[playerId])
        .filter((p) => p.nflTeamId === nflTeam.id)
        .map((nflPlayer) => ({ ffTeam, nflPlayer }))
    ),
    ...ffTeam,
  }));
  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap" }}>
        {byFFTeam.map((ffTeam) => (
          <div key={ffTeam.id}>
            <div style={bubbleStyle}>
              <h2>{ffTeam.name}</h2>
              {Object.entries(
                countStrings(ffTeam.owned.map((o) => o.nflPlayer.nflTeamId))
              )
                .map(([nflTeamId, c]) => ({ nflTeamId, c }))
                .sort((a, b) => b.c - a.c)
                .map((o) => (
                  <div
                    key={o.nflTeamId}
                    title={ffTeam.owned
                      .filter((oo) => oo.nflPlayer.nflTeamId === o.nflTeamId)
                      .map((oo) => oo.nflPlayer.name)
                      .join("\n")}
                  >
                    {wrapped.nflTeams[o.nflTeamId].name}: {o.c}/
                    {byNFLTeam[o.nflTeamId].owned.length}
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>
      <div style={bubbleStyle}></div>
      <div>
        {Object.values(byNFLTeam)
          .sort((a, b) => a.owned.length - b.owned.length)
          .reverse()
          .map((t) => (
            <div key={t.id} style={bubbleStyle}>
              <h1>
                {t.name} {t.owned.length}
              </h1>
              <div>
                {t.owned
                  .sort((a, b) => b.nflPlayer.total - a.nflPlayer.total)
                  .map((o, i) => (
                    <div key={i}>
                      {o.ffTeam.name}: {o.nflPlayer.name}{" "}
                      {toFixed(o.nflPlayer.total)}
                    </div>
                  ))}
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
