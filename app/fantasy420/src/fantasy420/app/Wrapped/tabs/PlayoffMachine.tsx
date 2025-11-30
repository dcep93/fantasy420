import { useMemo, useState } from "react";

import { bubbleStyle, Helpers, selectedWrapped } from "..";

type HeadToHeadRecord = {
  games: number;
  wins: number;
};

type SimulatedSelections = {
  [weekNum: string]: {
    [matchupIndex: number]: string;
  };
};

type ManualPoints = { [teamId: string]: number };

export default function PlayoffMachine() {
  const wrapped = selectedWrapped();
  const latestCompleteWeek = wrapped.latestScoringPeriod!;
  const upcomingWeeks = useMemo(
    () =>
      Object.keys(wrapped.ffMatchups)
        .map((w) => parseInt(w))
        .filter((w) => w > latestCompleteWeek)
        .sort((a, b) => a - b),
    [wrapped.ffMatchups, latestCompleteWeek]
  );

  const [selections, updateSelections] = useState<SimulatedSelections>(() =>
    Object.fromEntries(
      upcomingWeeks.map((weekNum) => [
        weekNum.toString(),
        Object.fromEntries(
          wrapped.ffMatchups[weekNum.toString()].map(
            (matchup, matchupIndex) => [matchupIndex, matchup[0]]
          )
        ),
      ])
    )
  );

  const [manualPoints, updateManualPoints] = useState<ManualPoints>({});

  const basePoints = useMemo(
    () =>
      Object.fromEntries(
        Object.values(wrapped.ffTeams).map((team) => [
          team.id,
          Object.entries(team.rosters)
            .filter(([weekNum]) => weekNum !== "0")
            .map(([weekNum, roster]) =>
              roster.starting
                .map(
                  (playerId) =>
                    wrapped.nflPlayers[playerId]?.scores[weekNum] || 0
                )
                .reduce((a, b) => a + b, 0)
            )
            .reduce((a, b) => a + b, 0),
        ])
      ),
    [wrapped.ffTeams, wrapped.nflPlayers]
  );

  const seasonResults = useMemo(() => {
    const wins: { [teamId: string]: number } = Object.fromEntries(
      Object.keys(wrapped.ffTeams).map((teamId) => [teamId, 0])
    );
    const headToHead: {
      [teamId: string]: { [oppId: string]: HeadToHeadRecord };
    } = {};

    function recordMatchup(teamA: string, teamB: string, result: number) {
      headToHead[teamA] = headToHead[teamA] || {};
      headToHead[teamB] = headToHead[teamB] || {};
      headToHead[teamA][teamB] = headToHead[teamA][teamB] || {
        games: 0,
        wins: 0,
      };
      headToHead[teamB][teamA] = headToHead[teamB][teamA] || {
        games: 0,
        wins: 0,
      };
      headToHead[teamA][teamB].games += 1;
      headToHead[teamB][teamA].games += 1;
      if (result > 0) {
        wins[teamA] += 1;
        headToHead[teamA][teamB].wins += 1;
      } else if (result < 0) {
        wins[teamB] += 1;
        headToHead[teamB][teamA].wins += 1;
      } else {
        wins[teamA] += 0.5;
        wins[teamB] += 0.5;
      }
    }

    Object.entries(wrapped.ffMatchups)
      .map(([weekNum, matchups]) => ({ weekNum: parseInt(weekNum), matchups }))
      .filter(({ weekNum }) => weekNum <= latestCompleteWeek)
      .forEach(({ weekNum, matchups }) => {
        matchups.forEach(([teamA, teamB]) => {
          const scoreA = getScore(teamA, weekNum.toString());
          const scoreB = getScore(teamB, weekNum.toString());
          if (scoreA === undefined || scoreB === undefined) return;
          recordMatchup(teamA, teamB, scoreA - scoreB);
        });
      });

    upcomingWeeks.forEach((weekNum) => {
      wrapped.ffMatchups[weekNum.toString()].forEach(
        (matchup, matchupIndex) => {
          const winnerId = selections[weekNum.toString()]?.[matchupIndex];
          if (!winnerId) return;
          const [teamA, teamB] = matchup;
          const result = winnerId === teamA ? 1 : winnerId === teamB ? -1 : 0;
          recordMatchup(teamA, teamB, result);
        }
      );
    });

    return { wins, headToHead };
  }, [wrapped.ffMatchups, latestCompleteWeek, upcomingWeeks, selections]);

  const standings = useMemo(() => {
    const pointsWithAdjustments = Object.fromEntries(
      Object.entries(basePoints).map(([teamId, pf]) => [
        teamId,
        pf + (manualPoints[teamId] || 0),
      ])
    );

    const groupedByWins = Object.values(wrapped.ffTeams).reduce((acc, team) => {
      const wins = seasonResults.wins[team.id] || 0;
      acc[wins] = acc[wins] || [];
      acc[wins].push({
        team,
        wins,
        pointsFor: pointsWithAdjustments[team.id] || 0,
      });
      return acc;
    }, {} as { [wins: number]: { team: (typeof wrapped.ffTeams)[string]; wins: number; pointsFor: number }[] });

    const sortedWins = Object.keys(groupedByWins)
      .map((w) => parseFloat(w))
      .sort((a, b) => b - a);

    const tiebreakExplanations: string[] = [];

    const entries = sortedWins.flatMap((winsKey) => {
      const group = groupedByWins[winsKey]!;
      const pairCounts = new Set<number>();
      group.forEach(({ team }) => {
        group.forEach(({ team: opp }) => {
          if (team.id === opp.id) return;
          pairCounts.add(
            seasonResults.headToHead[team.id]?.[opp.id]?.games || 0
          );
        });
      });
      const useHeadToHead =
        pairCounts.size === 1 && Array.from(pairCounts.values())[0]! > 0;

      const tiebreakWinsLabel = Number.isInteger(winsKey)
        ? winsKey.toString()
        : Helpers.toFixed(winsKey, 2);
      if (group.length > 1) {
        const groupNames = group.map(({ team }) => team.name).join(" and ");
        const hasAnyMatchups = Array.from(pairCounts).some(
          (count) => count > 0
        );
        if (useHeadToHead) {
          tiebreakExplanations.push(
            `${groupNames} all have ${tiebreakWinsLabel} wins and have played each other an equal number of times, so head-to-head record is used before points for.`
          );
        } else {
          tiebreakExplanations.push(
            `${groupNames} each have ${tiebreakWinsLabel} wins, but ${
              hasAnyMatchups
                ? "have not played an equal number of times"
                : "have not played each other"
            }, so points for is used.`
          );
        }
      }

      return group.sort((a, b) => {
        if (useHeadToHead) {
          const aRecord = getHeadToHeadRecord(
            a.team.id,
            group.map((g) => g.team.id)
          );
          const bRecord = getHeadToHeadRecord(
            b.team.id,
            group.map((g) => g.team.id)
          );
          if (aRecord !== bRecord) return bRecord - aRecord;
        }
        if (a.pointsFor !== b.pointsFor) return b.pointsFor - a.pointsFor;
        return a.team.name.localeCompare(b.team.name);
      });
    });

    return { entries, tiebreakExplanations };
  }, [basePoints, manualPoints, wrapped.ffTeams, seasonResults]);

  function getScore(teamId: string, weekNum: string) {
    const roster = wrapped.ffTeams[teamId]?.rosters[weekNum];
    if (!roster) return undefined;
    return roster.starting
      .map((playerId) => wrapped.nflPlayers[playerId]?.scores[weekNum] || 0)
      .reduce((a, b) => a + b, 0);
  }

  function getHeadToHeadRecord(teamId: string, groupIds: string[]) {
    const totals = groupIds
      .filter((oppId) => oppId !== teamId)
      .map(
        (oppId) =>
          seasonResults.headToHead[teamId]?.[oppId] || { games: 0, wins: 0 }
      )
      .reduce(
        (acc, curr) => ({
          games: acc.games + curr.games,
          wins: acc.wins + curr.wins,
        }),
        { games: 0, wins: 0 }
      );
    if (totals.games === 0) return -Infinity;
    return totals.wins / totals.games;
  }

  function adjustPoints(teamId: string, delta: number) {
    updateManualPoints((prev) => ({
      ...prev,
      [teamId]: (prev[teamId] || 0) + delta,
    }));
  }

  function renderStandings() {
    return (
      <div style={{ marginBottom: "1em" }}>
        <h2>Standings (with simulations)</h2>
        {standings.tiebreakExplanations.length > 0 && (
          <div style={{ ...bubbleStyle, marginBottom: "0.5em" }}>
            <div style={{ fontWeight: 600 }}>Tiebreak explanations</div>
            <ul style={{ margin: 0 }}>
              {standings.tiebreakExplanations.map((note, i) => (
                <li key={i}>{note}</li>
              ))}
            </ul>
          </div>
        )}
        {standings.entries.map((entry, index) => (
          <div style={bubbleStyle} key={entry.team.id}>
            <div>
              {index + 1}) {entry.team.name} – {Helpers.toFixed(entry.wins, 2)}{" "}
              wins
            </div>
            <div>Points For: {Helpers.toFixed(entry.pointsFor, 2)}</div>
            <div>
              <button onClick={() => adjustPoints(entry.team.id, 1000)}>
                +1000 PF
              </button>
              <button onClick={() => adjustPoints(entry.team.id, -1000)}>
                -1000 PF
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  }

  function renderWeek(weekNum: number) {
    const matchups = wrapped.ffMatchups[weekNum.toString()] || [];
    return (
      <div style={bubbleStyle} key={weekNum}>
        <h3>Week {weekNum}</h3>
        {matchups.map((matchup, matchupIndex) => {
          const selected = selections[weekNum.toString()]?.[matchupIndex];
          return (
            <div key={matchupIndex} style={{ marginBottom: "0.5em" }}>
              <div>Matchup {matchupIndex + 1}</div>
              <div style={{ display: "flex", gap: "0.5em", flexWrap: "wrap" }}>
                {matchup.map((teamId) => (
                  <label key={teamId} style={{ cursor: "pointer" }}>
                    <input
                      type="radio"
                      name={`week-${weekNum}-matchup-${matchupIndex}`}
                      checked={selected === teamId}
                      onChange={() =>
                        updateSelections((prev) => ({
                          ...prev,
                          [weekNum]: {
                            ...prev[weekNum],
                            [matchupIndex]: teamId,
                          },
                        }))
                      }
                    />
                    {wrapped.ffTeams[teamId]?.name || "TBD"}
                  </label>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div>
      {renderStandings()}
      <div>
        {upcomingWeeks.length === 0 && (
          <div style={bubbleStyle}>All weeks have finalized scoring.</div>
        )}
        {upcomingWeeks.map(renderWeek)}
      </div>
    </div>
  );
}
