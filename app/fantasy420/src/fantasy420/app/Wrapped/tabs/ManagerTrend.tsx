import { useMemo } from "react";
import type { TooltipProps } from "recharts";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { bubbleStyle, selectedWrapped, selectedYear } from "..";
import { FFTeamType, NFLPlayerType, WrappedType } from "../../FetchWrapped";
import allWrapped from "../allWrapped";

function weeklyScore(
  wrapped: WrappedType,
  team: FFTeamType,
  weekNum: string
): number {
  const roster = team.rosters[weekNum];
  if (!roster) return 0;
  return roster.starting
    .map(
      (playerId) => wrapped.nflPlayers[playerId] as NFLPlayerType | undefined
    )
    .filter((player): player is NFLPlayerType => Boolean(player))
    .map((player) => player.scores[weekNum] || 0)
    .reduce((a, b) => a + b, 0);
}

function median(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

function average(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function stddev(values: number[]): number {
  if (!values.length) return 0;
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  const variance =
    values.reduce((total, value) => total + (value - avg) ** 2, 0) /
    values.length;
  return Math.sqrt(variance);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export default function ManagerTrend() {
  const wrapped = selectedWrapped();
  const teams = Object.values(wrapped.ffTeams);
  const weeks = Object.keys(teams[0].rosters)
    .filter((week) => week !== "0")
    .map((week) => parseInt(week))
    .filter(
      (week) =>
        week <= (wrapped.latestScoringPeriod || Number.POSITIVE_INFINITY)
    )
    .sort((a, b) => a - b);

  const historyRatios = useMemo(() => {
    const ratios: number[] = [];
    Object.values(allWrapped).forEach((season) => {
      Object.values(season.ffTeams).forEach((team) => {
        const scores = Object.keys(team.rosters)
          .filter((weekNum) => weekNum !== "0")
          .map((weekNum) => weeklyScore(season, team, weekNum));
        const teamMedian = median(scores);
        const teamStdDev = stddev(scores);
        if (teamMedian > 0) {
          ratios.push(teamStdDev / teamMedian);
        }
      });
    });
    return ratios;
  }, []);

  const historicalMean = useMemo(() => average(historyRatios), [historyRatios]);
  const historicalStd = useMemo(() => stddev(historyRatios), [historyRatios]);

  const weeklyMedians = Object.fromEntries(
    weeks.map((week) => [
      week.toString(),
      median(teams.map((team) => weeklyScore(wrapped, team, week.toString()))),
    ])
  );

  const rows = teams
    .map((team) => {
      const scores = weeks.map((weekNum) => {
        const weekKey = weekNum.toString();
        const matchup = wrapped.ffMatchups[weekKey]?.find((matchup) =>
          matchup.includes(team.id)
        );
        const oppId = matchup?.find((id) => id !== team.id);
        const opponent = oppId ? wrapped.ffTeams[oppId] : undefined;
        return {
          week: weekNum,
          label: oppId ? opponent?.name || `Week ${weekNum}` : `Week ${weekNum}`,
          score: weeklyScore(wrapped, team, weekKey),
          median: weeklyMedians[weekKey],
          opponentName: opponent?.name,
          opponentScore: opponent
            ? weeklyScore(wrapped, opponent, weekKey)
            : undefined,
        };
      });
      const scoresOnly = scores.map((entry) => entry.score);
      const teamMedian = median(scoresOnly);
      const teamStdDev = stddev(scoresOnly);
      const baseRatio = teamMedian === 0 ? 0 : teamStdDev / teamMedian;
      const boomBust = clamp(
        0.5 +
          (baseRatio - historicalMean) *
            (historicalStd === 0 ? 0 : 0.25 / historicalStd),
        0,
        0.9999
      );
      const beatMedianCount = scores.filter(
        (entry) => entry.score > entry.median
      ).length;

      return {
        team,
        scores,
        boomBust,
        beatMedianCount,
      };
    })
    .sort((a, b) => b.boomBust - a.boomBust);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "1em",
        width: "100vw",
        boxSizing: "border-box",
        padding: "0 0.5em",
      }}
    >
      {rows.map(({ team, scores, boomBust, beatMedianCount }) => {
        const labelByWeek = Object.fromEntries(
          scores.map(({ week, label }) => [week, label])
        );
        return (
          <div
            key={team.id}
            style={{
              ...bubbleStyle,
              width: "100%",
              boxSizing: "border-box",
              margin: 0,
              display: "block",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "1em" }}>
              <h2 style={{ margin: 0 }}>{team.name}</h2>
              <div style={{ display: "flex", gap: "1em", flexWrap: "wrap" }}>
                <div>
                  <strong>Boom/bust:</strong> {boomBust.toFixed(3)}
                </div>
                <div>
                  <strong>Beat median:</strong> {beatMedianCount} times
                </div>
              </div>
            </div>
            <div style={{ width: "100%", height: "20em" }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={scores} margin={{ left: 16, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="week"
                    tickFormatter={(week) =>
                      labelByWeek[week] || `Week ${week}`
                    }
                  />
                  <YAxis />
                  <Tooltip
                    content={({ active, payload }: TooltipProps<number, string>) => {
                      if (!active || !payload?.length) return null;
                      const data = payload[0].payload as {
                        median: number;
                        score: number;
                        label: string;
                        opponentName?: string;
                        opponentScore?: number;
                      };
                      return (
                        <div
                          style={{
                            backgroundColor: "#fff",
                            padding: "0.5em",
                            border: "1px solid #ccc",
                            borderRadius: "0.5em",
                          }}
                        >
                          <div>Median: {data.median.toFixed(2)}</div>
                          <div>
                            {team.name}: {data.score.toFixed(2)}
                          </div>
                          {typeof data.opponentScore === "number" && (
                            <div>
                              {(data.opponentName || data.label) ?? "Opponent"}: {" "}
                              {data.opponentScore.toFixed(2)}
                            </div>
                          )}
                        </div>
                      );
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="score"
                    name="Started score"
                    stroke="#1E88E5"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="median"
                    name="Median"
                    stroke="#757575"
                    strokeDasharray="5 5"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        );
      })}
      <div style={{ fontSize: "small" }}>
        Historical scaling uses past boom/bust ratios to center around 0.5 with
        a league-wide spread near 0.25. Year: {selectedYear}
      </div>
    </div>
  );
}
