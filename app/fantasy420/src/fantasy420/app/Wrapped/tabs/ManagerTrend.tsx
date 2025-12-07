import { useMemo } from "react";
import type { TooltipProps } from "recharts";
import {
  CartesianGrid,
  DotProps,
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

type ScorePoint = {
  label: string;
  median: number;
  topScore?: number;
  topTeamName?: string;
  bottomScore?: number;
  bottomTeamName?: string;
  opponentName?: string;
  opponentScore?: number;
  score: number;
  week: number;
};

type OpponentOutcome = "beat" | "lost" | "noOpponent";

function opponentOutcome(point: ScorePoint): OpponentOutcome {
  if (typeof point.opponentScore !== "number") return "noOpponent";
  if (point.score > point.opponentScore) return "beat";
  if (point.score < point.opponentScore) return "lost";
  return "noOpponent";
}

type ScoreDotProps = DotProps & { payload?: ScorePoint };

function ResultDot({ cx, cy, payload }: ScoreDotProps) {
  if (typeof cx !== "number" || typeof cy !== "number" || !payload) {
    return <g />;
  }

  const outcome = opponentOutcome(payload);

  if (outcome === "beat") {
    return (
      <circle
        cx={cx}
        cy={cy}
        r={5}
        fill="#1E88E5"
        stroke="#0D47A1"
        strokeWidth={2}
      />
    );
  }

  if (outcome === "lost") {
    return (
      <g>
        <rect
          x={cx - 5}
          y={cy - 5}
          width={10}
          height={10}
          fill="#fff"
          stroke="#E53935"
          strokeWidth={2}
          rx={1.5}
          ry={1.5}
        />
        <line
          x1={cx - 4}
          y1={cy - 4}
          x2={cx + 4}
          y2={cy + 4}
          stroke="#E53935"
          strokeWidth={2}
        />
        <line
          x1={cx + 4}
          y1={cy - 4}
          x2={cx - 4}
          y2={cy + 4}
          stroke="#E53935"
          strokeWidth={2}
        />
      </g>
    );
  }

  return (
    <circle
      cx={cx}
      cy={cy}
      r={5}
      fill="#fff"
      stroke="#1E88E5"
      strokeWidth={2}
    />
  );
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

  const weeklyScores = useMemo(
    () =>
      Object.fromEntries(
        weeks.map((week) => [
          week.toString(),
          teams.map((team) => ({
            teamId: team.id,
            teamName: team.name,
            score: weeklyScore(wrapped, team, week.toString()),
          })),
        ])
      ),
    [teams, weeks, wrapped]
  );

  const weeklyMedians = Object.fromEntries(
    weeks.map((week) => [
      week.toString(),
      median((weeklyScores[week.toString()] ?? []).map((entry) => entry.score)),
    ])
  );

  const weeklyExtremes = Object.fromEntries(
    weeks.map((week) => {
      const weekKey = week.toString();
      const scores = weeklyScores[weekKey] ?? [];
      const sorted = [...scores].sort((a, b) => b.score - a.score);
      const top = sorted[0];
      const bottom = sorted[sorted.length - 1];
      return [
        weekKey,
        {
          topScore: top?.score,
          topTeamName: top?.teamName,
          bottomScore: bottom?.score,
          bottomTeamName: bottom?.teamName,
        },
      ];
    })
  );

  const rows = teams
    .map((team) => {
      const scores = weeks.map((weekNum) => {
        const weekKey = weekNum.toString();
        const weekScores = weeklyScores[weekKey] ?? [];
        const scoreRecord = weekScores.find(
          (entry) => entry.teamId === team.id
        );
        const matchup = wrapped.ffMatchups[weekKey]?.find((matchup) =>
          matchup.includes(team.id)
        );
        const oppId = matchup?.find((id) => id !== team.id);
        const opponent = oppId ? wrapped.ffTeams[oppId] : undefined;
        return {
          week: weekNum,
          label: oppId
            ? opponent?.name || `Week ${weekNum}`
            : `Week ${weekNum}`,
          score: scoreRecord?.score ?? weeklyScore(wrapped, team, weekKey),
          median: weeklyMedians[weekKey],
          topScore: weeklyExtremes[weekKey]?.topScore,
          topTeamName: weeklyExtremes[weekKey]?.topTeamName,
          bottomScore: weeklyExtremes[weekKey]?.bottomScore,
          bottomTeamName: weeklyExtremes[weekKey]?.bottomTeamName,
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
                  <XAxis dataKey="week" tick={false} tickLine={false} />
                  <YAxis />
                  <Tooltip
                    content={({
                      active,
                      payload,
                    }: TooltipProps<number, string>) => {
                      if (!active || !payload?.length) return null;
                      const data = payload[0].payload as ScorePoint;
                      return (
                        <div
                          style={{
                            backgroundColor: "#fff",
                            padding: "0.5em",
                            border: "1px solid #ccc",
                            borderRadius: "0.5em",
                          }}
                        >
                          <div>
                            Median w{data.week}: {data.median.toFixed(2)}
                          </div>
                          <div>
                            {team.name}: {data.score.toFixed(2)}
                          </div>
                          {typeof data.topScore === "number" && (
                            <div>
                              Top: {data.topScore.toFixed(2)} (
                              {data.topTeamName ?? "Unknown"})
                            </div>
                          )}
                          {typeof data.bottomScore === "number" && (
                            <div>
                              Bottom: {data.bottomScore.toFixed(2)} (
                              {data.bottomTeamName ?? "Unknown"})
                            </div>
                          )}
                          {typeof data.opponentScore === "number" && (
                            <div>
                              {(data.opponentName || data.label) ?? "Opponent"}:{" "}
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
                    dot={ResultDot}
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
                  <Line
                    type="monotone"
                    dataKey="topScore"
                    name="Top score"
                    stroke="#43A047"
                    strokeDasharray="4 4"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="bottomScore"
                    name="Bottom score"
                    stroke="#E53935"
                    strokeDasharray="2 6"
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
