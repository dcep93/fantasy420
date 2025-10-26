import { useState } from "react";
import { bubbleStyle, Helpers, mapDict, selectedWrapped } from "..";

export default function StandingsPrediction() {
  const [elasticity, updateElasticity] = useState(0.5);
  const dataA = mapDict(selectedWrapped().ffTeams, (t) => ({
    t,
    weeks: mapDict(
      mapDict(
        t.rosters,
        (w) => ({
          weekNum: parseInt(w.weekNum),
          opp: selectedWrapped()
            .ffMatchups[w.weekNum]?.find((m) => m.includes(t.id))
            ?.find((id) => id !== t.id),
          total: w.starting
            .map(
              (playerId) =>
                selectedWrapped().nflPlayers[playerId].scores[w.weekNum] || 0
            )
            .reduce((a, b) => a + b, 0),
        }),
        (weekNum) => weekNum !== "0"
      ),
      (o) => o
    ),
  }));

  const latestWeek = parseInt(
    Object.keys(Object.values(selectedWrapped().ffTeams)[0].rosters).at(-1)!
  );

  const byTeam = Object.values(selectedWrapped().ffTeams).map((team) => ({
    ...team,
    matchups: Object.entries(selectedWrapped().ffMatchups)
      .map(([weekNum, matchups]) => ({
        weekNum,
        teamIds: matchups
          .find((m) => m.includes(team.id))!
          .slice()
          .sort((a, b) => (a !== team.id ? 1 : -1)),
      }))
      .filter(
        ({ weekNum }) =>
          parseInt(weekNum) >=
          (selectedWrapped().currentScoringPeriodId ?? latestWeek + 1)
      )
      .map((obj) => ({
        ...obj,
        byes: obj.teamIds
          .filter((teamId) => teamId !== "")
          .map((teamId) => selectedWrapped().ffTeams[teamId!].rosters)
          .map((rosters) => rosters[obj.weekNum] || rosters["0"])
          .map((weekRoster) =>
            weekRoster.rostered.map(
              (playerId) => selectedWrapped().nflPlayers[playerId]
            )
          )
          .map((byePlayers, ffTeamIndex) =>
            byePlayers
              .filter(
                (byePlayer) =>
                  selectedWrapped().nflTeams[byePlayer.nflTeamId].byeWeek ===
                  parseInt(obj.weekNum)
              )
              .map((byePlayer) => ({
                name: byePlayer.name,
                score: byePlayer.scores[obj.weekNum],
                rawValue:
                  selectedWrapped().fantasyCalc?.players[byePlayer.id] || 0,
              }))
              .sort((a, b) => b.rawValue - a.rawValue)
              .map(({ rawValue, ...obj }) => ({
                ...obj,
                value: rawValue * (ffTeamIndex === 0 ? 1 : -1),
              }))
          ),
      })),
  }));
  const teamToTotal = Object.fromEntries(
    byTeam
      .map((team) => ({
        team,
        byeValues: Object.fromEntries(
          team.matchups.map((matchup) => [
            matchup.weekNum,
            matchup.byes[0]
              .map((byePlayer) => byePlayer.value)
              .reduce((a, b) => a + b, 0),
          ])
        ),
        total: Object.values(team.rosters[0].rostered)
          .map(
            (playerId) => selectedWrapped().fantasyCalc?.players[playerId] || 0
          )
          .reduce((a, b) => a + b),
      }))
      .map((o) => ({
        ...o,
        weeklyTotal: Object.fromEntries(
          Object.entries(o.byeValues).map(([weekNum, byeValues]) => [
            weekNum,
            Helpers.toFixed(o.total - byeValues),
          ])
        ),
      }))
      .map((o) => [o.team.id, o])
  );

  const dataB = mapDict(
    mapDict(dataA, (o) => ({
      ...o,
      weeks: mapDict(o.weeks, (w) => ({
        ...w,
        oppTotal: w.opp === undefined ? 0 : dataA[w.opp].weeks[w.weekNum].total,
      })),
    })),
    (o) => ({
      t: o.t,
      wins: Object.values(o.weeks)
        .filter(
          (oo) =>
            oo.weekNum <
            (selectedWrapped().currentScoringPeriodId ||
              Number.POSITIVE_INFINITY)
        )
        .map((w) => (w.total < w.oppTotal ? 0 : 1) as number)
        .reduce((a, b) => a + b, 0),
      future: Object.entries(teamToTotal[o.t.id].weeklyTotal)
        .map(([weekNum, myTotal]) => ({
          myTotal,
          oppTotal:
            teamToTotal[
              teamToTotal[o.t.id].team.matchups.find(
                (m) => m.weekNum === weekNum
              )?.teamIds[1]!
            ].weeklyTotal[weekNum],
          oppName:
            selectedWrapped().ffTeams[
              teamToTotal[o.t.id].team.matchups.find(
                (m) => m.weekNum === weekNum
              )?.teamIds[1]!
            ].name,
        }))
        .map((oo) => ({
          ...oo,
          odds: getOdds(oo.myTotal, oo.oppTotal, elasticity),
        })),
    })
  );
  const dataC = Object.values(dataB)
    .map((o) => ({
      ...o,
      prediction:
        o.wins + o.future.map((oo) => oo.odds).reduce((a, b) => a + b, 0),
    }))
    .sort((a, b) => b.prediction - a.prediction);
  return (
    <div>
      <div>
        elasticity:
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={elasticity}
          onChange={(e) => updateElasticity(parseFloat(e.target.value))}
        />
        <span>{elasticity.toFixed(2)}</span>
      </div>
      <div>
        {dataC.map((o) => (
          <div key={o.t.id}>
            <div style={bubbleStyle}>
              {o.t.name} {o.wins} -&gt; {Helpers.toFixed(o.prediction)}
              <div>
                <div style={bubbleStyle}>
                  <div>future: </div>
                  {o.future.map((oo, i) => (
                    <div key={i}>
                      {oo.myTotal} vs {oo.oppTotal} ({Helpers.toFixed(oo.odds)}){" "}
                      {oo.oppName}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function getOdds(
  myTotal: number,
  oppTotal: number,
  elasticity: number
): number {
  elasticity = Math.max(0, Math.min(1, elasticity));

  // Difference between expected totals
  const diff = myTotal - oppTotal;

  // Deterministic odds if elasticity = 0
  if (elasticity === 0) return diff > 0 ? 1 : diff < 0 ? 0 : 0.5;

  // Compute base logistic odds ignoring elasticity
  const base = 1 / (1 + Math.exp(-diff / 10)); // the "10" just sets slope scale

  // Blend between deterministic (0 or 1) and pure random (0.5)
  // As elasticity → 1, odds → 0.5
  // As elasticity → 0, odds → base (effectively 0 or 1 for large diff)
  const odds = 0.5 + (base - 0.5) * (1 - elasticity);

  return odds;
}
