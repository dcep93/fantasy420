import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import css from "./index.module.css";
import all_data from "./wrapped.json";

enum Position {
  QB = 1,
  RB = 2,
  WR = 3,
  TE = 4,
  K = 5,
  DST = 16,
  FLEX = -1,
}

function Wrapped() {
  document.title = "Fantasy Wrapped";
  // console.log(`(${generate_wrapped.toString().replaceAll("\n", "")})()`);
  const [toRenderKey, update] = useState(window.location.hash.substring(1));
  const [searchParams] = useSearchParams();
  const leagueId = searchParams.get("league_id") || 203836968;
  const data: WrappedType | undefined = (all_data as any)[leagueId];
  if (!data) return <>no data found for league {leagueId}</>;
  const toRender: { [key: string]: any } = {
    StudsStarted: StudsStarted(data),
    WeekTopsAndBottoms: WeekWinnersAndLosers(data),
    SqueezesAndStomps: SqueezesAndStomps(data),
    BestByPosition: BestByStreamingPosition(data),
    DeterminedByDiscreteScoring: GamesDeterminedByDiscreteScoring(data),
    ChosenWrong: TimesChosenWrong(data),
    GooseEggs: GooseEggs(data),
    BoomBust: BoomBust(data),
    "raw_data.json": JSON.stringify(data),
  };
  const defaultToRenderKey = Object.keys(toRender)[0]!;
  if (toRenderKey === "") update(defaultToRenderKey);
  return (
    <div className={css.wrapped}>
      <div
        className={[css.flex, css.grey].join(" ")}
        style={{ overflow: "scroll" }}
      >
        {Object.keys(toRender).map((key, i) => (
          <div key={i} className={css.bubble} onClick={() => update(key)}>
            {key}
          </div>
        ))}
      </div>
      <div>
        <h1 className={css.bubble}>
          {toRenderKey} - league {leagueId}
        </h1>
        <div>{toRender[toRenderKey]}</div>
      </div>
    </div>
  );
}

function StudsStarted(data: WrappedType) {
  const rawTeams = data.weeks
    .flatMap((week) => week.matches)
    .flatMap((match) => match);
  const teams = data.teamNames
    .map((teamName, i) => ({ teamName, i }))
    .map((obj) => ({
      ...obj,
      players: Object.entries(
        Object.fromEntries(
          rawTeams
            .filter((t) => t.teamIndex === obj.i)
            .flatMap((team) => team.lineup)
            .map((playerId) => [playerId, true])
        )
      ).map(([playerId]) => data.players[playerId]),
    }));
  return (
    <div>
      {teams.map((obj, i) => (
        <div className={css.bubble} key={i}>
          <div>{obj.teamName}</div>
          {Object.values(Position)
            .filter((p) => Number.isInteger(p))
            .filter((p) => p !== Position.FLEX)
            .map((p) => p as Position)
            .map((p) => ({
              p,
              players: obj.players
                .filter((player) => player.position === p)
                .map((player) => player.name),
            }))
            .map(({ p, players }, j) => (
              <div key={j}>
                {Position[p]} ({players.length}): {players.join(" , ")}
              </div>
            ))}
        </div>
      ))}
    </div>
  );
}

function GamesDeterminedByDiscreteScoring(data: WrappedType) {
  function calculateDSTDifference(
    team: TeamType,
    boxscores: BoxscoreType[],
    differences: string[]
  ): number {
    const started =
      data.players[
        team.lineup.find(
          (playerId) => data.players[playerId].position === Position.DST
        )!
      ];
    const offense = boxscores.find(
      (boxscore) => boxscore.team === started.team
    )!;
    const yards = offense.yardsAllowed;
    var superscore = 0;
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
    differences.push(`${started.name} ${superscore.toFixed(2)}`);
    return superscore;
  }
  function calculateKDifference(
    team: TeamType,
    fieldgoals: FieldGoalType[],
    differences: string[]
  ): number {
    const started =
      data.players[
        team.lineup.find(
          (playerId) => data.players[playerId].position === Position.K
        )!
      ];
    const headlines = fieldgoals.find(
      (fieldgoal) => fieldgoal.team === started.team
    )!.fieldgoals;
    const superscore = headlines
      .map((headline) => {
        if (headline.indexOf(started.name) !== 0) return 0;
        const yards = parseInt(
          headline.split(" Yd Field Goal")[0].split(" ").reverse()[0]
        );
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
    differences.push(`${started.name} ${superscore.toFixed(2)}`);
    return superscore;
  }
  return (
    <div>
      {data.weeks
        .flatMap((week) => week.matches.map((match) => ({ week, match })))
        .map((match) => {
          if (match.match[1].score - match.match[0].score > 10) return null;
          const mapped = match.match.map((team) => {
            const differences: string[] = [];
            const superscore = (
              team.score +
              calculateDSTDifference(team, match.week.boxscores, differences) +
              calculateKDifference(team, match.week.fieldgoals, differences)
            ).toFixed(2);
            return {
              name: data.teamNames[team.teamIndex],
              score: team.score,
              differences,
              superscore,
            };
          });
          return { week: match.week, loser: mapped[0], winner: mapped[1] };
        })
        .filter(
          (match) =>
            match !== null && match.loser.superscore > match.winner.superscore
        )
        .map(
          (match, i) =>
            match && (
              <div key={i}>
                <div className={css.bubble}>
                  <div>week {match.week.number}:</div>
                  <div>
                    <b>{match.loser.name}</b> {match.loser.score} (ss{" "}
                    {match.loser.superscore})
                  </div>
                  <div>would have beaten</div>
                  <div>
                    <b>{match.winner.name}</b> {match.winner.score} (ss{" "}
                    {match.winner.superscore})
                  </div>
                  <div>if K and DST used continuous scoring:</div>
                  <div className={css.bubble}>
                    <div>{match.loser.differences.join(" ")}</div>
                    <div>{match.winner.differences.join(" ")}</div>
                  </div>
                </div>
              </div>
            )
        )}
    </div>
  );
}

function TimesChosenWrong(data: WrappedType) {
  const wrongChoices = data.weeks.flatMap((week) =>
    week.matches
      .map((teams) =>
        teams.map((team) => {
          var superscore = team.score;
          const betterStarts = [
            {
              [Position.QB]: 1,
            },
            {
              [Position.DST]: 1,
            },
            {
              [Position.K]: 1,
            },
            {
              [Position.RB]: 2,
              [Position.WR]: 2,
              [Position.TE]: 1,
              [Position.FLEX]: 2,
            },
          ]
            .map((choices) => {
              const bestIds: string[] = [];
              const filteredRoster = sortByKey(
                Object.keys(team.roster).filter(
                  (playerId) => choices[data.players[playerId].position]
                ),
                (playerId) => -team.roster[playerId]
              );
              Object.keys(choices)
                .map((position) => parseInt(position) as Position)
                .filter((position) => position !== Position.FLEX)
                .forEach((position) => {
                  const subFilteredRoster = filteredRoster.filter(
                    (playerId) => data.players[playerId].position === position
                  );
                  Array.from(new Array(choices[position])).forEach(() => {
                    const bestId = subFilteredRoster.find(
                      (playerId) => !bestIds.includes(playerId)
                    )!;
                    if (bestId) bestIds.push(bestId);
                  });
                });
              Array.from(new Array(choices[Position.FLEX] || 0)).forEach(() => {
                const bestId = filteredRoster.find(
                  (playerId) => !bestIds.includes(playerId)
                )!;
                bestIds.push(bestId);
              });
              const betterStartIds = bestIds.filter(
                (playerId) => !team.lineup.includes(playerId)
              );
              if (betterStartIds.length === 0) return null;
              const bestStarts = betterStartIds.map((id) => {
                const score = team.roster[id];
                superscore += score;
                return `${data.players[id].name} ${score}`;
              });
              const startedStarts = team.lineup
                .filter((playerId) => choices[data.players[playerId].position])
                .filter((playerId) => !bestIds.includes(playerId))
                .map((id) => {
                  const score = team.roster[id];
                  superscore -= score;
                  return `${data.players[id].name} ${score}`;
                });
              return [bestStarts, startedStarts]
                .map((s) => s.join(","))
                .join(" / ");
            })
            .filter((i) => i);

          const teamData = {
            name: data.teamNames[team.teamIndex],
            teamIndex: team.teamIndex,
            superscore,
            betterStarts,
            score: team.score,
          };
          return teamData;
        })
      )
      .filter((teams) => teams[0].superscore > teams[1].score)
      .map((teams) => ({ teams, week: week.number }))
  );
  const [filterTeam, update] = useState(-1);
  return (
    <div>
      <div>
        <div className={css.bubble}>
          {data.teamNames
            .map((teamName, index) => ({
              teamName,
              index,
              wrong: wrongChoices
                .filter((choice) => choice.teams[0].teamIndex === index)
                .map((choice) => choice.week),
            }))
            .map((obj, i) => (
              <div key={i}>
                <b
                  className={[
                    css.hover,
                    filterTeam === obj.index && css.grey,
                  ].join(" ")}
                  onClick={() =>
                    update(filterTeam === obj.index ? -1 : obj.index)
                  }
                >
                  {obj.teamName}
                </b>{" "}
                chose wrong weeks ({obj.wrong.join(",")})
              </div>
            ))}
        </div>
      </div>
      {wrongChoices
        .filter(
          (choice) =>
            filterTeam === -1 ||
            choice.teams.map((team) => team.teamIndex).includes(filterTeam)
        )
        .map((choice, i) => (
          <div key={i}>
            <div className={css.bubble}>
              <div>week {choice.week}:</div>
              <b>{choice.teams[0].name}</b> {choice.teams[0].score} (ss{" "}
              {choice.teams[0].superscore.toFixed(2)})
              <div>could have beaten</div>
              <div>
                <b>{choice.teams[1].name}</b> {choice.teams[1].score} (ss{" "}
                {choice.teams[1].superscore.toFixed(2)})
              </div>
              <div>if they had started</div>
              <div className={css.bubble}>
                {choice.teams[0].betterStarts.map((betterStart, j) => (
                  <div key={j}>{betterStart}</div>
                ))}
              </div>
            </div>
          </div>
        ))}
    </div>
  );
}

function GooseEggs(data: WrappedType) {
  return (
    <div>
      {data.teamNames.map((teamName, teamIndex) => (
        <div key={teamIndex}>
          <div className={css.bubble}>
            <h4>{teamName}</h4>
            <div>
              {Object.entries(
                data.weeks
                  .flatMap((week, weekNum) =>
                    week.matches
                      .flatMap((teams) => teams)
                      .filter((team) => team.teamIndex === teamIndex)
                      .flatMap((team) =>
                        Object.entries(team.roster).filter(([id, _]) =>
                          team.lineup.includes(id)
                        )
                      )
                      .filter(([id, score]) => score <= 0)
                      .map(([id, score]) => id)
                      .map((id) => ({ id, weekNum }))
                  )
                  .reduce((prev, current) => {
                    if (!prev[current.id]) prev[current.id] = [];
                    prev[current.id].push(current.weekNum + 1);
                    return prev;
                  }, {} as { [id: string]: number[] })
              )
                .map(([id, weeks]) => ({ id, weeks }))
                .sort((a, b) => b.weeks.length - a.weeks.length)
                .map(({ id, weeks }) => `${data.players[id].name} -> ${weeks}`)
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

function BestByStreamingPosition(data: WrappedType) {
  return (
    <div>
      {[Position.QB, Position.DST, Position.K, Position.TE].map(
        (position, i) => (
          <div key={i} className={css.bubble}>
            <h3>{Position[position]}</h3>
            {sortByKey(
              data.teamNames.map((teamName, index) => ({
                teamName,
                score: data.weeks
                  .flatMap((week) => week.matches)
                  .flatMap((teams) => teams)
                  .filter((team) => team.teamIndex === index)
                  .flatMap((team) =>
                    team.lineup
                      .filter(
                        (playerId) =>
                          data.players[playerId].position === position
                      )
                      .map((playerId) => team.roster[playerId])
                  )
                  .reduce((a, b) => a + b, 0),
              })),
              (obj) => -obj.score
            ).map((obj, i) => (
              <div key={i}>
                ({i + 1}) {obj.score.toFixed(2)} <b>{obj.teamName}</b>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}

function SqueezesAndStomps(data: WrappedType) {
  const num = 5;
  const rawPoints = sortByKey(
    data.weeks.flatMap((week) =>
      week.matches.map((teams) => ({
        week: week.number,
        diff: teams[1].score - teams[0].score,
        winner: teams[1].teamIndex,
        loser: teams[0].teamIndex,
      }))
    ),
    (match) => match.diff
  );
  return (
    <div>
      <div>
        <div className={css.bubble}>
          {rawPoints.slice(0, num).map((point, i) => (
            <div key={i}>
              week {point.week}: {point.diff.toFixed(2)} point squeeze /{" "}
              <b>{data.teamNames[point.winner]}</b> beat{" "}
              <b>{data.teamNames[point.loser]}</b>
            </div>
          ))}
        </div>
      </div>
      <div>
        <div className={css.bubble}>
          {rawPoints
            .slice(-num)
            .reverse()
            .map((point, i) => (
              <div key={i}>
                week {point.week}: {point.diff.toFixed(2)} point stomp /{" "}
                <b>{data.teamNames[point.winner]}</b> beat{" "}
                <b>{data.teamNames[point.loser]}</b>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}

function WeekWinnersAndLosers(data: WrappedType) {
  const counts = Array.from(new Array(data.teamNames.length)).map((_, i) => ({
    tops: [] as number[],
    bottoms: [] as number[],
  }));
  const vals = data.weeks.map((week, i) => {
    const sortedTeams: TeamType[] = sortByKey(
      week.matches.flatMap((match) => match.flatMap((team) => team)),
      (team) => team.score
    );
    const winnerAndLoser: any = {
      loser: sortedTeams[0],
      winner: sortedTeams[sortedTeams.length - 1],
      number: week.number,
    };
    counts[winnerAndLoser.winner.teamIndex].tops.push(week.number);
    counts[winnerAndLoser.loser.teamIndex].bottoms.push(week.number);
    return winnerAndLoser;
  });
  return (
    <div>
      <div className={css.flexx}>
        <table className={css.bubble}>
          <thead>
            <td></td>
            <td>tops</td>
            <td>bottoms</td>
          </thead>
          <tbody>
            {counts.map((count, i) => (
              <tr key={i}>
                <td>
                  <b>{data.teamNames[i]}</b>
                </td>
                <td>{count.tops.join(",")}</td>
                <td>{count.bottoms.join(",")}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div>
          <div className={css.bubble}>
            {vals.map((week, i) => (
              <div key={i}>
                week {week.number}: top score {week.winner.score.toFixed(2)}:{" "}
                <b>{data.teamNames[week.winner.teamIndex]}</b>
              </div>
            ))}
          </div>
        </div>
        <div>
          <div className={css.bubble}>
            {vals.map((week, i) => (
              <div key={i}>
                week {week.number}: bottom score {week.loser.score.toFixed(2)}{" "}
                <b>{data.teamNames[week.loser.teamIndex]}</b>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function BoomBust(data: WrappedType) {
  function getStdDev(scores: number[]): number {
    scores = scores.filter((s) => s !== 0);
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
      <div>
        <div className={css.bubble}>only includes rostered weeks</div>
        <div className={css.bubble}>ignores kickers</div>
      </div>
      {[
        { valueName: "stddev / mean", getValue: getStdDev },
        {
          valueName: "-stddev / mean",
          getValue: (scores: number[]) => -getStdDev(scores),
          filter: (scores: number[]) =>
            scores.length > 1 && scores.filter((s) => s !== 0).length > 0,
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
          valueName: "min non-zero",
          getValue: (scores: number[]) =>
            Math.min(...scores.filter((s) => s !== 0)),
        },
      ].map(({ valueName, getValue, ...extra }, i) => (
        <div key={i} className={css.bubble}>
          <table>
            <thead>
              <tr>
                <th colSpan={2}>{valueName}</th>
                <th>scores</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(
                data.weeks
                  .flatMap((week) => week.matches)
                  .flatMap((match) => match)
                  .flatMap((team) => Object.entries(team.roster))
                  .map(([playerId, score]) => ({ playerId, score }))
                  .reduce((prev, obj) => {
                    if (!prev[obj.playerId]) prev[obj.playerId] = [];
                    prev[obj.playerId].push(obj.score);
                    return prev;
                  }, {} as { [playerId: string]: number[] })
              )
                .map(([playerId, scores]) => ({
                  playerId,
                  scores,
                  value: getValue(scores),
                }))
                .filter(
                  ({ playerId }) =>
                    data.players[playerId].position !== Position.K
                )
                .filter(({ value }) => isFinite(value))
                .filter(({ scores }) => !extra.filter || extra.filter(scores))
                .sort((a, b) => b.value - a.value)
                .slice(0, 20)
                .map((obj, j) => (
                  <tr key={j}>
                    <td>{obj.value.toFixed(2)}</td>
                    <td>{data.players[obj.playerId].name}</td>
                    {obj.scores.map((s, k) => (
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
  );
}

function sortByKey<T>(arr: T[], f: (t: T) => number): T[] {
  return arr
    .map((obj) => ({ obj, v: f(obj) }))
    .sort((a, b) => a.v - b.v)
    .map((w) => w.obj);
}

export type WrappedType = {
  teamNames: string[];
  weeks: WeekType[];
  players: { [playerId: string]: PlayerType };
};

export type WeekType = {
  number: number;
  matches: TeamType[][];
  boxscores: BoxscoreType[];
  fieldgoals: FieldGoalType[];
};

export type BoxscoreType = {
  team: string;
  pointsAllowed: number;
  yardsAllowed: number;
};

export type FieldGoalType = { team: string; fieldgoals: string[] };

export type TeamType = {
  teamIndex: number;
  score: number;
  lineup: string[];
  roster: { [playerId: string]: number };
};

export type PlayerType = {
  name: string;
  position: Position;
  team: string;
};

export default Wrapped;
