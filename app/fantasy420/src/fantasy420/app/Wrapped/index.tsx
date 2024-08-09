import React, { ReactNode, useState } from "react";
import { draft_json, normalize } from "../Draft";
import { NFLPlayerType, WrappedType } from "../FetchWrapped";
import wrapped2021 from "./2021.json";
import wrapped2022 from "./2022.json";
import ByeSchedule_ from "./ByeSchedule_";
import DraftValue_ from "./DraftValue_";
import HistoricalAccuracy_ from "./HistoricalAccuracy_";
import _rawWrapped from "./wrapped.json";

export const rawWrapped: WrappedType = _rawWrapped;

var wrapped: WrappedType;

export default function Wrapped() {
  document.title = "Fantasy Wrapped";
  const [yearKey, updateYear] = useState(
    new URLSearchParams(window.location.search).get("year") || ""
  );
  wrapped =
    // { "": rawWrapped }[
    { "2021": wrapped2021, "2022": wrapped2022 }[yearKey] || rawWrapped;
  const toRender: { [key: string]: ReactNode } = Object.fromEntries(
    Object.entries({
      FantasyCalc,
      SqueezesAndStomps,
      WeekTopsAndBottoms,
      DeterminedByDiscreteScoring,
      GooseEggs,
      ChosenWrong,
      Bopped,
      Stacks,
      Negatives,
      UniquesStarted,
      BoomBust,
      OwnedTeams,
      Benchwarmers,
      Injuries,
      BestByPosition,
      ExtremeStuds,
      Matchups,
      HistoricalAccuracy,
      DraftValue,
      ByeSchedule_,
      // PlayoffOutcomes,
      json,
    }).map(([k, v]) => {
      try {
        return [k, v()];
      } catch (e) {
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
        <div>
          year:{" "}
          <select onChange={(e) => updateYear(e.target.value)}>
            {[2023, 2022, 2021].map((y) => (
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
  // clog(printF(FetchWrapped));
  return <pre>{JSON.stringify(wrapped, null, 2)}</pre>;
}

function ChosenWrong() {
  return (
    <div>
      {Object.entries(wrapped.ffMatchups)
        .map(([weekNum, matchups]) => ({ weekNum, matchups }))
        .filter(
          ({ weekNum, matchups }) =>
            weekNum === "9" && wrapped.ffTeams[matchups[0][0]].rosters[weekNum]
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
                ideal: Helpers.getIdeal(
                  team.rosters[weekNum].rostered,
                  team.rosters[weekNum].starting,
                  weekNum
                ),
              }))
              .map((team) => ({
                ...team,
                idealScore: Helpers.toFixed(
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
                text: `[${team.name}] ${Helpers.toFixed(team.score)} -> ${
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

function Bopped() {
  const managerScores = Object.fromEntries(
    Object.values(wrapped.ffTeams).map((o) => [
      o.id,
      Object.fromEntries(
        Object.values(o.rosters).map((oo) => [
          oo.weekNum,
          oo.starting
            .map((id) => wrapped.nflPlayers[id].scores[oo.weekNum]!)
            .reduce((a, b) => a + b, 0),
        ])
      ),
    ])
  );
  const opponents = Object.fromEntries(
    Object.values(wrapped.ffTeams).map((o) => [
      o.id,
      Object.fromEntries(
        Object.entries(wrapped.ffMatchups).map(([weekNum, matchups]) => [
          weekNum,
          matchups
            .find((matchup) => matchup.includes(o.id))!
            .find((teamId) => teamId !== o.id)!,
        ])
      ),
    ])
  );
  const players = Object.values(wrapped.nflPlayers)
    .map((player) => ({
      ...player,
      best: Object.entries(player.scores)
        .map(([weekNum, score]) => ({ weekNum, score: score || 0 }))
        .filter((o) => wrapped.ffMatchups[o.weekNum] !== undefined)
        .sort((a, b) => b.score - a.score)[0],
    }))
    .filter((player) => player.best !== undefined)
    .map((player) => ({
      ...player,
      bestOwner: Object.values(wrapped.ffTeams).find((t) =>
        t.rosters[player.best.weekNum]?.rostered.includes(player.id)
      )!,
    }))
    .filter((player) => player.bestOwner !== undefined)
    .map((player) => ({
      ...player,
      bestOpponentId: !wrapped.ffTeams[player.bestOwner.id].rosters[
        player.best.weekNum
      ].starting.includes(player.id)
        ? null
        : opponents[player.bestOwner.id][player.best.weekNum],
    }))
    .map((player) => ({
      ...player,
      key: player.bestOpponentId || player.bestOwner.id,
    }));
  return (
    <div>
      {Object.values(wrapped.ffTeams).map((t) => (
        <div key={t.id}>
          <div style={bubbleStyle}>
            <h2>
              {t.name} [ benched{" "}
              {
                players
                  .filter((player) => player.key === t.id)
                  .filter((player) => player.bestOpponentId === null).length
              }{" "}
              / got bopped{" "}
              {
                players
                  .filter((player) => player.key === t.id)
                  .filter((player) => player.bestOpponentId !== null).length
              }{" "}
              ]
            </h2>
            <table>
              <thead>
                <tr>
                  <td>matchup outcome</td>
                </tr>
              </thead>
              <tbody>
                {players
                  .filter((player) => player.key === t.id)
                  .sort((a, b) => b.best.score - a.best.score)
                  .map((player) => (
                    <tr key={player.id}>
                      <td style={{ float: "right", marginRight: "2em" }}>
                        {Helpers.toFixed(
                          managerScores[t.id][player.best.weekNum] -
                            managerScores[opponents[t.id][player.best.weekNum]][
                              player.best.weekNum
                            ]
                        )}
                      </td>
                      <td>[{player.name}]</td>
                      <td>blew their load for</td>
                      <td>[{player.best.score}]</td>
                      <td style={{ padding: "0 2em" }}>
                        week [{player.best.weekNum}]
                      </td>
                      <>
                        {player.bestOpponentId === null ? (
                          <td>
                            on the bench vs [
                            {
                              wrapped.ffTeams[
                                opponents[player.key][player.best.weekNum]
                              ].name
                            }
                            ]
                          </td>
                        ) : (
                          <>
                            <td>by [{player.bestOwner.name}]</td>
                          </>
                        )}
                      </>
                    </tr>
                  ))}
              </tbody>
            </table>
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
                  weekNum: parseInt(r.weekNum),
                  rank: draft_json.drafts[0].indexOf(normalize(o.name)),
                  currentScore: o.scores[r.weekNum] || 0,
                  followingScore: o.scores[parseInt(r.weekNum) + 1],
                  ...o,
                }))
                .filter(
                  (o) =>
                    (r.starting.includes(o.id) || o.currentScore !== 0) &&
                    o.followingScore === 0 &&
                    !t.rosters[parseInt(r.weekNum) + 1].starting.includes(o.id)
                )
                .map((o) => ({
                  ...o,
                  rawWeekNums: Object.entries(o.scores)
                    .map(([weekNum, score]) => ({
                      weekNum: parseInt(weekNum),
                      score,
                    }))
                    .sort((a, b) => a.weekNum - b.weekNum)
                    .filter((s) => s.weekNum > o.weekNum),
                }))
                .map((o) => ({
                  ...o,
                  weekNums: o.rawWeekNums
                    .slice(
                      0,
                      o.rawWeekNums
                        .map((s, i) => ({ s, i }))
                        .find(({ s }) => s.score !== 0)?.i
                    )
                    .map((s) => s.weekNum),
                }))
                .map((o) => ({
                  ...o,
                  weekNumsStr:
                    o.weekNums.length === 1
                      ? `week ${o.weekNums[0]}`
                      : `weeks ${o.weekNums[0]}-${
                          o.weekNums[o.weekNums.length - 1]
                        }`,
                }))
            )
            .sort((a, b) => a.rank - b.rank),
        }))
        .map((team) => (
          <div key={team.id} style={bubbleStyle}>
            <h1>
              {team.name} ({team.injuries.length})
            </h1>
            {team.injuries.map((injury, i) => (
              <div key={i}>
                {injury.name} ({injury.rank}) injured {injury.weekNumsStr} after
                scoring {injury.currentScore}
              </div>
            ))}
          </div>
        ))}
    </div>
  );
}

function SqueezesAndStomps() {
  const num = 10;
  const rawPoints = Helpers.sortByKey(
    Object.entries(wrapped.ffMatchups)
      .map(([periodId, matchups]) => ({
        periodId,
        matchups: matchups.map((matchup) =>
          Helpers.sortByKey(
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
  const vals = Object.keys(Object.values(wrapped.ffTeams)[0].rosters)
    .filter((weekNum) => weekNum !== "0")
    .map((weekNum) => {
      const sortedTeams = Helpers.sortByKey(
        Object.values(wrapped.ffTeams)
          .filter((team) => team.rosters[weekNum]) // todo
          .map((team) => ({
            ...team,
            score: team.rosters[weekNum].starting
              .map(
                (playerId) => wrapped.nflPlayers[playerId].scores[weekNum] || 0
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
        weekNum,
      };
      counts[winnerAndLoser.winner.id].tops.push(weekNum);
      counts[winnerAndLoser.loser.id].bottoms.push(weekNum);
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
                week {o.weekNum}: top score {o.winner.score.toFixed(2)}:{" "}
                <b>{o.winner.name}</b>
              </div>
            ))}
          </div>
        </div>
        <div>
          <div style={bubbleStyle}>
            {vals.map((o, i) => (
              <div key={i}>
                week {o.weekNum}: bottom score {o.loser.score.toFixed(2)}{" "}
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
            {Helpers.sortByKey(
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
            teams: Helpers.sortByKey(
              match
                .map((teamId) => wrapped.ffTeams[teamId])
                .filter((team) => team.rosters[periodId])
                .map((team) => ({
                  ...team,
                  score: Helpers.toFixed(
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
            started: Object.values(wrapped.ffTeams).find((t) =>
              t.rosters[weekNum]?.starting.includes(p.id)
            )?.name,
            weekNum,
            score: score!,
          }))
        )
        .filter((p) => p.weekNum !== "0")
        .filter((p) => p.position !== Position[Position.DST])
        .filter((p) => p.score < 0)
        .sort((a, b) => a.score - b.score)
        .map((p, i) => (
          <div key={i}>
            week {p.weekNum} {p.name} scored {p.score}{" "}
            {p.started && `(${p.started})`}
          </div>
        ))}
    </div>
  );
}

function ExtremeStuds() {
  const funcs: {
    [funcName: string]: (playerId: string) =>
      | {
          weekNum: string;
          score: number;
        }
      | undefined;
  } = {
    max: (playerId) =>
      Object.entries(wrapped.nflPlayers[playerId].scores)
        .map(([weekNum, score]) => ({
          weekNum,
          score: score!,
        }))
        .filter(({ weekNum }) => weekNum !== "0")
        .sort((a, b) => b.score - a.score)[0],
    "2nd": (playerId) =>
      Object.entries(wrapped.nflPlayers[playerId].scores)
        .map(([weekNum, score]) => ({
          weekNum,
          score: score!,
        }))
        .filter(({ weekNum }) => weekNum !== "0")
        .sort((a, b) => b.score - a.score)[1],
    min: (playerId) =>
      Object.entries(wrapped.nflPlayers[playerId].scores)
        .map(([weekNum, score]) => ({
          weekNum,
          score: score!,
        }))
        .filter(({ weekNum }) => weekNum !== "0")
        .filter(({ score }) => score !== 0)
        .sort((a, b) => b.score - a.score)
        .reverse()[0],
    average: (playerId) => ({
      weekNum: "avg",
      score: wrapped.nflPlayers[playerId].average,
    }),
  };
  const [funcName, updateFuncName] = useState(Object.keys(funcs)[0]);
  return (
    <div>
      <div>
        <div>
          funcName:{" "}
          <select onChange={(e) => updateFuncName(e.target.value)}>
            {Object.keys(funcs).map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </div>
        {Object.values(wrapped.ffTeams)
          .map((t) => ({
            ...t,
            xroster: Object.fromEntries(
              t.rosters["0"].rostered
                .map((playerId) => [playerId, funcs[funcName](playerId)])
                .filter(([_, xx]) => xx !== undefined)
            ),
          }))
          .map((t) => ({
            ...t,
            xplayers: Object.fromEntries(
              Helpers.getIdealHelper(
                Object.keys(t.xroster),
                Object.entries(t.rosters)
                  .map(([weekNum, roster]) => ({
                    weekNum: parseInt(weekNum),
                    roster,
                  }))
                  .sort((a, b) => b.weekNum - a.weekNum)[0].roster.starting,
                (player) => t.xroster[player.id]?.score || 0
              ).map((playerId) => [playerId, t.xroster[playerId]])
            ),
          }))
          .map((t) => ({
            ...t,
            xtotal: Object.entries(t.xplayers)
              .map(([playerId, o]) => ({ playerId, ...o }))
              .map(({ playerId, score }) => score!)
              .reduce((a, b) => a + b, 0),
          }))
          .sort((a, b) => b.xtotal - a.xtotal)
          .map((t) => (
            <div key={t.id} style={bubbleStyle}>
              <h2>{t.name}</h2>
              <div>{Helpers.toFixed(t.xtotal)}</div>
              {Object.entries(t.xplayers)
                .map(([playerId, o]) => ({
                  player: wrapped.nflPlayers[playerId],
                  o,
                }))
                .map(({ player, o }) => ({
                  player,
                  ...o,
                }))
                .map(({ score, ...o }) => ({ ...o, score: score! }))
                .sort((a, b) => b.score - a.score)
                .map(({ player, weekNum, score }) => (
                  <div key={player.id}>
                    {Helpers.toFixed(score)} week {weekNum} {player.name}
                  </div>
                ))}
            </div>
          ))}
      </div>
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
                      Helpers.countStrings(
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
            valueName: "total",
            getValue: (scores: number[]) => scores.reduce((a, b) => a + b, 0),
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
              [{o.teamName}] bench week {o.weekNum} scored{" "}
              {Helpers.toFixed(o.score)}
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
                Helpers.countStrings(
                  ffTeam.owned.map((o) => o.nflPlayer.nflTeamId)
                )
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
                      {Helpers.toFixed(o.nflPlayer.total)}
                    </div>
                  ))}
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}

function FantasyCalc() {
  const playerToDraftPick = Object.fromEntries(
    draft_json.drafts[0].map((name, i) => [name, i + 1])
  );
  const owned = Object.fromEntries(
    Object.values(wrapped.ffTeams)
      .flatMap((p) => p.rosters["0"].rostered)
      .map((playerId) => [playerId, true])
  );
  return (
    <div>
      <div>https://fantasycalc.com/redraft-rankings</div>
      <div>{new Date(wrapped.fantasyCalc.timestamp).toString()}</div>
      <div style={bubbleStyle}>
        <h1>UNOWNED</h1>
        <div>
          {Object.entries(wrapped.fantasyCalc.players)
            .map(([playerId, value]) => ({
              playerId,
              value,
            }))
            .filter(({ playerId }) => !owned[playerId])
            .sort((a, b) => b.value - a.value)
            .slice(0, 20)
            .map((f) => ({
              ...f,
              name: rawWrapped.nflPlayers[f.playerId]?.name || f.playerId,
            }))
            .map((f) => (
              <div key={f.playerId}>
                {f.value.toFixed(2)} {f.name}
              </div>
            ))}
        </div>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", whiteSpace: "nowrap" }}>
        {Object.values(wrapped.ffTeams)
          .map(({ rosters, ...t }) => ({
            ...t,
            ps: rosters["0"].rostered
              .map((playerId) => wrapped.nflPlayers[playerId])
              .map((p) => ({
                name: p.name,
                value: wrapped.fantasyCalc.players[p.id] || 0,
                draftPick: playerToDraftPick[normalize(p.name)],
              }))
              .sort((a, b) => b.value - a.value),
          }))
          .map((t) => ({
            ...t,
            value: t.ps.map((p) => p.value).reduce((a, b) => a + b, 0),
          }))
          .sort((a, b) => b.value - a.value)
          .map((t) => (
            <div key={t.id} style={bubbleStyle}>
              <h2>{t.name}</h2>
              <h3>{t.value.toFixed(2)}</h3>
              {t.ps.map((p, i) => (
                <div key={i}>
                  {p.value.toFixed(2)} {p.name} ({p.draftPick})
                </div>
              ))}
            </div>
          ))}
      </div>
    </div>
  );
}

function Matchups() {
  return (
    <div>
      {Object.keys(Object.values(wrapped.ffTeams)[0].rosters)
        .flatMap((weekNum) => ({
          weekNum,
          matchups:
            wrapped.ffMatchups[weekNum] ||
            Object.keys(wrapped.ffTeams).map((teamId) => [teamId]),
        }))
        .map(({ weekNum, matchups }) => (
          <div key={weekNum}>
            <div style={bubbleStyle}>week {weekNum}</div>
            <div style={{ display: "flex", overflow: "scroll" }}>
              {matchups.map((matchup, i) => (
                <div key={i} style={bubbleStyle}>
                  <div style={{ display: "flex", whiteSpace: "nowrap" }}>
                    {matchup
                      .map((teamId) => wrapped.ffTeams[teamId])
                      .map((team) => ({
                        ...team,
                        roster: team.rosters[weekNum],
                      }))
                      .map((team) => (
                        <div key={team.id} style={bubbleStyle}>
                          <h2>{team.name}</h2>
                          <h3>
                            {team.roster.starting
                              .map((playerId) => wrapped.nflPlayers[playerId])
                              .map((p) => p.scores[weekNum] || 0)
                              .reduce((a, b) => a + b, 0)
                              .toFixed(2)}
                          </h3>
                          <div>
                            started
                            <div>
                              {team.roster.starting
                                .map((playerId) => wrapped.nflPlayers[playerId])
                                .map((p) => ({
                                  ...p,
                                  score: p.scores[weekNum] || 0,
                                }))
                                .sort((a, b) => b.score - a.score)
                                .map((p) => (
                                  <div key={p.id}>
                                    {p.score.toFixed(2)} {p.name}
                                  </div>
                                ))}
                            </div>
                          </div>
                          <div>
                            bench
                            <div>
                              {team.roster.rostered
                                .filter(
                                  (playerId) =>
                                    !team.roster.starting.includes(playerId)
                                )
                                .map((playerId) => wrapped.nflPlayers[playerId])
                                .map((p) => ({
                                  ...p,
                                  score: p.scores[weekNum] || 0,
                                }))
                                .sort((a, b) => b.score - a.score)
                                .map((p) => (
                                  <div key={p.id}>
                                    {p.score.toFixed(2)} {p.name}
                                  </div>
                                ))}
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
    </div>
  );
}

function Stacks() {
  return (
    <div>
      {Object.values(wrapped.nflPlayers)
        .filter((p) => p.position === "DST")
        .flatMap((p) =>
          Object.keys(p.scores)
            .filter((weekNum) => weekNum !== "0")
            .map((weekNum) => ({
              weekNum,
              ...p,
            }))
        )
        .map(({ weekNum, nflTeamId }) => ({
          weekNum,
          nflTeamId,
          players: Object.values(wrapped.nflPlayers)
            .filter((p) => p.nflTeamId === nflTeamId)
            .map((p) => ({ ...p, score: p.scores[weekNum]! }))
            .filter((p) => p.score !== undefined)
            .sort((a, b) => b.score - a.score)
            .slice(0, 2),
        }))
        .map((o) => ({
          ...o,
          sum: o.players.map((p) => p.score).reduce((a, b) => a + b, 0),
        }))
        .sort((a, b) => b.sum - a.sum)
        .slice(0, 10)
        .map((o, i) => (
          <div key={i}>
            <div style={bubbleStyle}>
              {o.sum.toFixed(2)} week {o.weekNum}
              <div>
                {o.players.map((p) => (
                  <div key={p.id}>
                    {p.name} {p.score.toFixed(2)}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
    </div>
  );
}

function PlayoffOutcomes() {
  const latestPlayedWeek = Object.entries(
    Object.values(wrapped.ffTeams)[0].rosters
  )
    .map(([weekNum, roster]) => ({ weekNum, roster }))
    .filter(({ weekNum, roster }) =>
      roster.rostered.find(
        (p) => (wrapped.nflPlayers[p].scores[weekNum] || 0) > 0
      )
    )
    .map(({ weekNum }) => parseInt(weekNum))
    .sort((a, b) => b - a)[0];
  const alreadyTotals = Object.fromEntries(
    Object.values(wrapped.ffTeams).map((team) => [
      team.id,
      Object.entries(wrapped.ffMatchups)
        .filter(([weekNum]) => parseInt(weekNum) <= latestPlayedWeek)
        .flatMap(([weekNum]) =>
          team.rosters[weekNum].starting.map(
            (playerId) => wrapped.nflPlayers[playerId]!.scores[weekNum] || 0
          )
        )
        .reduce((a, b) => a + b, 0),
    ])
  );
  const div1TeamId = Object.keys(wrapped.ffTeams)[0];
  const divisions = Object.fromEntries(
    Object.keys(wrapped.ffTeams).map((teamId, i) => [
      teamId,
      teamId === div1TeamId ||
        Object.values(wrapped.ffMatchups)
          .flatMap((matchups) => matchups)
          .filter(
            (matchup) =>
              matchup.includes(div1TeamId) && matchup.includes(teamId)
          ).length > 1,
    ])
  );
  const alreadyWins = Object.fromEntries(
    Object.values(wrapped.ffTeams)
      .map((team) => ({
        teamId: team.id,
        wins: Object.entries(wrapped.ffMatchups)
          .filter(([weekNum]) => parseInt(weekNum) <= latestPlayedWeek)
          .map(([weekNum]) => {
            const scores = [
              team.id,
              wrapped.ffMatchups[weekNum]
                .find((matchup) => matchup.includes(team.id))!
                .find((teamId) => teamId !== team.id)!,
            ].map((id) =>
              wrapped.ffTeams[id].rosters[weekNum].starting
                .map(
                  (playerId) =>
                    wrapped.nflPlayers[playerId]!.scores[weekNum] || 0
                )
                .reduce((a, b) => a + b, 0)
            );
            return (scores[0] > scores[1] ? 1 : 0) as number;
          })
          .reduce((a, b) => a + b, 0),
      }))
      .map(({ teamId, wins }) => [teamId, wins])
  );
  const [state, update] = React.useState({
    now: Date.now(),
    state: Object.fromEntries(
      Object.keys(wrapped.ffMatchups)
        .filter((weekNum) => parseInt(weekNum) > latestPlayedWeek)
        .map((weekNum) => [
          weekNum,
          Object.fromEntries(
            wrapped.ffMatchups[weekNum].flatMap((matchup) =>
              matchup.map((teamId) => [
                teamId,
                Helpers.toFixed(alreadyTotals[teamId] / latestPlayedWeek),
              ])
            )
          ),
        ])
    ),
  });
  const totals = Object.fromEntries(
    Object.values(wrapped.ffTeams).map((team) => [
      team.id,
      alreadyTotals[team.id] +
        Object.values(state.state)
          .map((week) => week[team.id])
          .reduce((a, b) => a + b, 0),
    ])
  );
  const wins = Object.fromEntries(
    Object.values(wrapped.ffTeams)
      .map((team) => ({
        teamId: team.id,
        wins: Object.entries(wrapped.ffMatchups)
          .map(([weekNum]) => {
            const scores = [
              team.id,
              wrapped.ffMatchups[weekNum]
                .find((matchup) => matchup.includes(team.id))!
                .find((teamId) => teamId !== team.id)!,
            ].map((id) =>
              parseInt(weekNum) > latestPlayedWeek
                ? state.state[weekNum][id]
                : wrapped.ffTeams[id].rosters[weekNum].starting
                    .map(
                      (playerId) =>
                        wrapped.nflPlayers[playerId]!.scores[weekNum] || 0
                    )
                    .reduce((a, b) => a + b, 0)
            );
            return (scores[0] > scores[1] ? 1 : 0) as number;
          })
          .reduce((a, b) => a + b, 0),
      }))
      .map(({ teamId, wins }) => [teamId, wins])
  );
  type OrderType = { teamId: string; reason: string };
  function getOrder(order: OrderType[], toBeRanked: string[]): OrderType[] {
    if (toBeRanked.length === 0) {
      return order;
    }
    const mostWins = toBeRanked
      .map((teamId) => ({
        wins: wins[teamId],
        teamId,
      }))
      .sort((a, b) => b.wins - a.wins)[0].wins;
    const tiedTeamIds = toBeRanked.filter(
      (teamId) => wins[teamId] === mostWins
    );
    function getNext() {
      if (tiedTeamIds.length === 1) {
        return {
          teamId: tiedTeamIds[0],
          reason: `${wins[tiedTeamIds[0]]} wins`,
        };
      }
      const tiedDivisions = tiedTeamIds
        .map((tiedTeamId) => (divisions[tiedTeamId] ? 1 : -1) as number)
        .reduce((a, b) => a + b, 0);
      if (
        tiedTeamIds.length === Math.abs(tiedDivisions) ||
        tiedDivisions % 2 === 0
      ) {
        const sortedTiedWins = Object.values(wrapped.ffTeams)
          .filter((team) => tiedTeamIds.includes(team.id))
          .map((team) => ({
            teamId: team.id,
            wins: Object.entries(wrapped.ffMatchups)
              .map(([weekNum]) => ({
                weekNum,
                teamIds: [
                  team.id,
                  wrapped.ffMatchups[weekNum]
                    .find((matchup) => matchup.includes(team.id))!
                    .find((teamId) => teamId !== team.id)!,
                ],
              }))
              .map(({ weekNum, teamIds }) => {
                const scores = teamIds.map((id) =>
                  parseInt(weekNum) > latestPlayedWeek
                    ? state.state[weekNum][id]
                    : wrapped.ffTeams[id].rosters[weekNum].starting
                        .map(
                          (playerId) =>
                            wrapped.nflPlayers[playerId]!.scores[weekNum] || 0
                        )
                        .reduce((a, b) => a + b, 0)
                );
                return (
                  tiedTeamIds.includes(teamIds[1]) && scores[0] > scores[1]
                    ? 1
                    : 0
                ) as number;
              })
              .reduce((a, b) => a + b, 0),
          }))
          .sort((a, b) => b.wins - a.wins);
        if (sortedTiedWins[0].wins > sortedTiedWins[1].wins) {
          return {
            teamId: sortedTiedWins[0].teamId,
            reason: `${sortedTiedWins[0].wins} wins among ${tiedTeamIds
              .filter((teamId) => teamId !== sortedTiedWins[0].teamId)
              .map((teamId) => wrapped.ffTeams[teamId].name)
              .join(",")}`,
          };
        }
      }
      const mostTeam = tiedTeamIds
        .map((teamId) => ({
          teamId,
          total: totals[teamId],
        }))
        .sort((a, b) => b.total - a.total)[0].teamId;
      return {
        teamId: mostTeam,
        reason: `${Helpers.toFixed(totals[mostTeam])} points among ${tiedTeamIds
          .filter((teamId) => teamId !== mostTeam)
          .map((teamId) => wrapped.ffTeams[teamId].name)
          .join(",")}`,
      };
    }
    const nextOrder = getNext();
    return getOrder(
      order.concat(nextOrder),
      toBeRanked.filter((nextTeamId) => nextTeamId !== nextOrder.teamId)
    );
  }
  const first = getOrder([], Object.keys(wrapped.ffTeams))[0];
  const second = getOrder(
    [],
    Object.keys(wrapped.ffTeams).filter(
      (teamId) => divisions[teamId] !== divisions[first.teamId]
    )
  )[0];
  const order = getOrder(
    [
      { teamId: first.teamId, reason: `wins overall: ${first.reason}` },
      {
        teamId: second.teamId,
        reason: `wins division ${divisions[second.teamId] ? "A" : "B"}: ${
          second.reason
        }`,
      },
    ],
    Object.keys(wrapped.ffTeams).filter(
      (teamId) => ![first, second].map((o) => o.teamId).includes(teamId)
    )
  );
  return (
    <div>
      <div style={bubbleStyle}>
        <div>{Object.keys(state.state).length} weeks remaining</div>
        <table>
          <tbody>
            {order.map((o, i) => (
              <tr key={o.teamId}>
                <td>{i + 1}</td>
                <td style={{ padding: "0 50px" }}>
                  {alreadyWins[o.teamId]} {"->"} {wins[o.teamId]}
                </td>
                <td style={{ padding: "0 50px" }}>
                  {Helpers.toFixed(totals[o.teamId])}
                </td>
                <td style={{ padding: "0 50px" }}>
                  {wrapped.ffTeams[o.teamId].name}
                </td>
                <td>{o.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div>
        {Object.entries(state.state).map(([weekNum, scores]) => (
          <div key={weekNum}>
            <div style={bubbleStyle}>
              <h2>week {weekNum}</h2>
              <div>
                {wrapped.ffMatchups[weekNum].map((matchup, i) => (
                  <div key={i} style={{ display: "inline" }}>
                    <div style={bubbleStyle}>
                      <table>
                        <tbody>
                          {matchup.map((teamId) => (
                            <tr key={teamId}>
                              <td>
                                <button
                                  onClick={() => {
                                    state.state[weekNum][teamId] -= 5;
                                    update({ ...state, now: Date.now() });
                                  }}
                                >
                                  -
                                </button>
                              </td>
                              <td>
                                <button
                                  onClick={() => {
                                    state.state[weekNum][teamId] += 15;
                                    update({ ...state, now: Date.now() });
                                  }}
                                >
                                  +
                                </button>
                              </td>
                              <td style={{ padding: "0 50px" }}>
                                {state.state[weekNum][teamId]}
                              </td>
                              <td>{wrapped.ffTeams[teamId].name}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

class Helpers {
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
          .map((playerId) => wrapped.nflPlayers[playerId])
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

function HistoricalAccuracy() {
  return <HistoricalAccuracy_ />;
}

function DraftValue() {
  return <DraftValue_ />;
}

function ByeSchedule() {
  return <ByeSchedule_ />;
}
