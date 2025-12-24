import { useEffect, useMemo, useState } from "react";
import { bubbleStyle, selectedWrapped, selectedYear } from "..";

const DATA_CACHE = "data_v6";
const GAME_MINUTES = 180;

interface TeamSummary {
  name: string;
}

interface Play {
  type: string;
  down: number;
  text: string;
  clock: string;
  distance: number;
  startYardsToEndzone: number;
}

interface Drive {
  team: string;
  description: string;
  result: string;
  plays: Play[];
  scores: [number, number];
}

interface Game {
  gameId: number;
  timestamp: number;
  week: number;
  teams: TeamSummary[];
  drives: Drive[];
  scores: [number, number];
}

interface DataV6 {
  year: number;
  games: Game[];
}

interface MatchupSpiciness {
  id: string;
  week: number;
  title: string;
  finalScore: string;
  leadChanges: number;
  lateLeadChanges: number;
  score: number;
  lastLeadChangeMinute: number | null;
  description: string;
  probabilityLine: ProbabilityPoint[];
}

type TimelinePoint = { minute: number; scores: [number, number] };
type ProbabilityPoint = { minute: number; probability: number; timestamp: number };
type WeekSchedule = {
  kickoffMinutes: Map<string, number>;
  baseline: number;
  gamesByTeam: Map<string, Game>;
};
type PlayerMoment = {
  minute: number;
  timestamp: number;
  projected: number;
  scored: number;
  injured: boolean;
};
type PlayerWindow = {
  playerId: string;
  moments: PlayerMoment[];
  finalPoints: number;
};
type TimelineBundle = {
  timeline: TimelinePoint[];
  homePlayers: PlayerWindow[];
  awayPlayers: PlayerWindow[];
};

function ProbabilityChart({ points }: { points: ProbabilityPoint[] }) {
  if (!points.length) return null;

  const width = 360;
  const height = 180;
  const padding = 36;
  const minTime = Math.min(...points.map((p) => p.timestamp));
  const maxTime = Math.max(...points.map((p) => p.timestamp));
  const timeRange = Math.max(1, maxTime - minTime);
  const usableWidth = width - padding * 2;
  const usableHeight = height - padding * 1.5;

  const startLabel = new Date(minTime).toLocaleString(undefined, {
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
  });
  const endLabel = new Date(maxTime).toLocaleString(undefined, {
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
  });

  const path = points
    .map((point, idx) => {
      const x =
        padding + ((point.timestamp - minTime) / timeRange) * usableWidth;
      const y =
        height - padding - point.probability * usableHeight;
      const command = idx === 0 ? "M" : "L";
      return `${command}${x},${y}`;
    })
    .join(" ");

  return (
    <svg
      width={width}
      height={height}
      role="img"
      aria-label="Home win probability over time"
      style={{ marginTop: "0.4em" }}
    >
      <line
        x1={padding}
        x2={width - padding}
        y1={height - padding}
        y2={height - padding}
        stroke="#ccc"
      />
      <line
        x1={padding}
        x2={width - padding}
        y1={height - padding - usableHeight / 2}
        y2={height - padding - usableHeight / 2}
        stroke="#e0e0e0"
        strokeDasharray="4 4"
      />
      <path d={path} fill="none" stroke="#f1636b" strokeWidth={2} />
      {points.map((point, idx) => {
        const x =
          padding + ((point.timestamp - minTime) / timeRange) * usableWidth;
        const y = height - padding - point.probability * usableHeight;
        return <circle key={idx} cx={x} cy={y} r={2} fill="#f1636b" />;
      })}
      <text x={padding} y={height - padding + 18} fontSize={10} fill="#555">
        {startLabel}
      </text>
      <text
        x={width - padding}
        y={height - padding + 18}
        fontSize={10}
        fill="#555"
        textAnchor="end"
      >
        {endLabel}
      </text>
      <text
        x={padding - 10}
        y={height - padding - usableHeight + 8}
        fontSize={10}
        fill="#555"
        textAnchor="end"
      >
        Home win probability
      </text>
    </svg>
  );
}

export default function SpiciestMatchups() {
  const [matchups, setMatchups] = useState<MatchupSpiciness[]>([]);
  const [error, setError] = useState<string | null>(null);
  const numericYear = useMemo(() => parseInt(selectedYear), [selectedYear]);
  const wrapped = selectedWrapped();

  useEffect(() => {
    setError(null);
    setMatchups([]);
    if (Number.isNaN(numericYear)) {
      setError("Select a numeric year to fetch matchups.");
      return;
    }

    fetchSeasonData(numericYear)
      .then((data) => computeSpiciestMatchups(wrapped, data))
      .then((computed) =>
        computed
          .sort((a, b) => {
            const diff = b.score - a.score;
            if (diff !== 0) return diff;
            return (
              (b.lastLeadChangeMinute ?? -Infinity) -
              (a.lastLeadChangeMinute ?? -Infinity)
            );
          })
          .slice(0, 10)
      )
      .then(setMatchups)
      .catch((e) => setError(e.message || String(e)));
  }, [numericYear, wrapped]);

  const content = useMemo(() => {
    if (error) {
      return <div style={bubbleStyle}>Failed to load data: {error}</div>;
    }
    if (!matchups.length) {
      return <div style={bubbleStyle}>Loading spiciest matchups...</div>;
    }
    return (
      <div style={bubbleStyle}>
        {matchups.map((matchup, idx) => (
          <div key={matchup.id} style={{ marginBottom: "0.7em" }}>
            <div>
              {idx + 1}. Week {matchup.week}: {matchup.title}
            </div>
            <div>Spice score: {matchup.score.toFixed(2)}</div>
            <div>
              Lead changes: {matchup.leadChanges} (late:{" "}
              {matchup.lateLeadChanges})
            </div>
            <div>Final: {matchup.finalScore}</div>
            <div style={{ fontSize: "0.9em", marginTop: "0.2em" }}>
              {matchup.description}
            </div>
            {matchup.lastLeadChangeMinute !== null && (
              <div>
                Last projected flip ~ minute{" "}
                {Math.round(matchup.lastLeadChangeMinute)}
              </div>
            )}
            <ProbabilityChart points={matchup.probabilityLine} />
          </div>
        ))}
      </div>
    );
  }, [error, matchups]);

  return (
    <div>
      <h2 style={bubbleStyle}>Top spicy fantasy matchups of {numericYear}</h2>
      <p style={{ maxWidth: "60ch" }}>
        Spiciness is driven by projected winner flips across the full fantasy
        week. Player production is spread over their NFL game window using
        kickoff timestamps from data_v6 (each quarter is 45 real minutes). Lead
        changes during the final sliver of the week count extra.
      </p>
      {content}
    </div>
  );
}

async function fetchSeasonData(year: number): Promise<DataV6> {
  const cache = await caches.open(DATA_CACHE);
  const cacheKey = `data_v6_${year}`;
  const url = `https://dcep93.github.io/nflquery/data_v6/${year}.json`;

  const cached = await cache.match(cacheKey);
  if (cached?.url === url) {
    return cached.json();
  }

  const response = await fetch(url, { cache: "no-cache" });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${year}`);
  }
  await cache.put(cacheKey, response.clone());
  return response.json();
}

function computeSpiciestMatchups(
  wrapped: ReturnType<typeof selectedWrapped>,
  data: DataV6
): MatchupSpiciness[] {
  const schedule = buildWeekSchedule(data);
  const matchupTimelines: MatchupSpiciness[] = [];

  Object.entries(wrapped.ffMatchups).forEach(([weekStr, matchups]) => {
    const week = parseInt(weekStr);
    const weekSchedule = schedule.get(week);
    if (!weekSchedule) return;

    matchups.forEach(([homeId, awayId]) => {
      const { timeline, homePlayers, awayPlayers } = buildMatchupTimeline(
        wrapped,
        data,
        week,
        homeId,
        awayId,
        weekSchedule
      );
      if (!timeline.length) return;

      const probabilityLine = buildProbabilityLine(
        timeline,
        weekSchedule.baseline,
        homePlayers,
        awayPlayers
      );

      const lateStart =
        (timeline[timeline.length - 1]?.minute ?? GAME_MINUTES) - 45;
      let leader = getLeader(timeline[0].scores);
      let leadChanges = 0;
      let lateLeadChanges = 0;
      let lastLeadChangeMinute: number | null = null;

      timeline.slice(1).forEach((entry) => {
        const nextLeader = getLeader(entry.scores);
        if (
          nextLeader !== leader &&
          !(leader === null && nextLeader === null)
        ) {
          leadChanges++;
          if (entry.minute >= lateStart) lateLeadChanges++;
          lastLeadChangeMinute = entry.minute;
        }
        leader = nextLeader;
      });

      const finalScores = timeline[timeline.length - 1]?.scores ?? [0, 0];
      const [homeFinal, awayFinal] = finalScores;
      const homeName = wrapped.ffTeams[homeId]?.name ?? "Home";
      const awayName = wrapped.ffTeams[awayId]?.name ?? "Away";

      matchupTimelines.push({
        id: `${week}-${homeId}-${awayId}`,
        week,
        title: `${homeName} vs ${awayName}`,
        finalScore: `${homeName}: ${homeFinal.toFixed(
          2
        )} — ${awayName}: ${awayFinal.toFixed(2)}`,
        leadChanges,
        lateLeadChanges,
        score: leadChanges + lateLeadChanges * 0.5,
        lastLeadChangeMinute,
        description: describeMatchup(
          leadChanges,
          lateLeadChanges,
          lastLeadChangeMinute
        ),
        probabilityLine,
      });
    });
  });

  return matchupTimelines;
}

function buildMatchupTimeline(
  wrapped: ReturnType<typeof selectedWrapped>,
  _data: DataV6,
  week: number,
  homeId: string,
  awayId: string,
  weekSchedule: WeekSchedule
): TimelineBundle {
  const homeRoster = wrapped.ffTeams[homeId]?.rosters?.[week];
  const awayRoster = wrapped.ffTeams[awayId]?.rosters?.[week];
  if (!homeRoster || !awayRoster)
    return { timeline: [], homePlayers: [], awayPlayers: [] };

  const teamMinutes = new Set<number>([0]);
  const homePlayers = buildPlayerWindows(
    wrapped,
    _data,
    week,
    homeRoster.starting,
    homeRoster.projections,
    weekSchedule,
    teamMinutes
  );
  const awayPlayers = buildPlayerWindows(
    wrapped,
    _data,
    week,
    awayRoster.starting,
    awayRoster.projections,
    weekSchedule,
    teamMinutes
  );

  if (!homePlayers.length || !awayPlayers.length)
    return { timeline: [], homePlayers: [], awayPlayers: [] };

  const sortedMinutes = Array.from(teamMinutes).sort((a, b) => a - b);
  const timeline: TimelinePoint[] = sortedMinutes.map((minute) => ({
    minute,
    scores: [
      sumPlayerProgress(homePlayers, minute),
      sumPlayerProgress(awayPlayers, minute),
    ],
  }));

  return { timeline, homePlayers, awayPlayers };
}

function buildPlayerWindows(
  wrapped: ReturnType<typeof selectedWrapped>,
  _data: DataV6,
  week: number,
  playerIds: string[],
  projections: { [id: string]: number } | undefined,
  weekSchedule: WeekSchedule,
  minutes: Set<number>
) {
  const players: PlayerWindow[] = [];

  playerIds.forEach((playerId) => {
    const player = wrapped.nflPlayers[playerId];
    if (!player) return;
    const finalPoints = player.scores?.[week] ?? 0;
    const startingProjection =
      projections?.[playerId] ?? player.projection ?? player.average ?? 0;

    const teamName = wrapped.nflTeams[player.nflTeamId]?.name;
    const teamKickoff = teamName
      ? weekSchedule.kickoffMinutes.get(teamName)
      : undefined;
    const kickoff = typeof teamKickoff === "number" ? teamKickoff : 0;
    const game = teamName ? weekSchedule.gamesByTeam.get(teamName) : null;

    const plays = game
      ? game.drives.flatMap((drive) => drive.plays)
      : ([] as Play[]);
    const distributionPlays = plays.length || 1;
    const involvedPlays = plays.filter((play) =>
      matchesPlayer(player.name, play.text)
    ).length;
    const scoringBuckets = involvedPlays || distributionPlays;

    let scoredSoFar = 0;
    let injured = false;
    const moments: PlayerMoment[] = [];

    if (!plays.length) {
      const startTimestamp = weekSchedule.baseline + kickoff * 60 * 1000;
      const endMinute = kickoff + GAME_MINUTES;
      const endTimestamp = weekSchedule.baseline + endMinute * 60 * 1000;
      minutes.add(kickoff);
      minutes.add(endMinute);
      moments.push({
        minute: kickoff,
        timestamp: startTimestamp,
        projected: startingProjection,
        scored: 0,
        injured: false,
      });
      moments.push({
        minute: endMinute,
        timestamp: endTimestamp,
        projected: finalPoints,
        scored: finalPoints,
        injured: false,
      });
    } else {
      plays.forEach((play, idx) => {
        const minuteIntoGame = clockToGameMinute(play.clock);
        const minute = kickoff + minuteIntoGame;
        const timestamp = weekSchedule.baseline + minute * 60 * 1000;
        const text = play.text || "";
        const nameMatch = matchesPlayer(player.name, text);
        const injuryMention = nameMatch && /injur/i.test(text);
        const returnMention = nameMatch && /return/i.test(text);
        const timeRatio = Math.min(1, minuteIntoGame / GAME_MINUTES);

        if (injuryMention) {
          injured = true;
        } else if (returnMention) {
          injured = false;
        }

        if (scoringBuckets > 0 && (nameMatch || involvedPlays === 0)) {
          scoredSoFar = Math.min(
            finalPoints,
            scoredSoFar + finalPoints / scoringBuckets
          );
        }

        const projected = injured
          ? scoredSoFar
          : scoredSoFar +
            Math.max(0, startingProjection - scoredSoFar) * (1 - timeRatio);

        moments.push({
          minute,
          timestamp,
          projected,
          scored: scoredSoFar,
          injured,
        });
        minutes.add(minute);

        // ensure the final play hits the final fantasy score
        if (idx === plays.length - 1 && scoredSoFar < finalPoints) {
          scoredSoFar = finalPoints;
        }
      });

      const finalMinute = kickoff + GAME_MINUTES;
      const finalTimestamp = weekSchedule.baseline + finalMinute * 60 * 1000;
      if (!moments.length || moments[moments.length - 1]!.minute < finalMinute) {
        minutes.add(finalMinute);
        moments.push({
          minute: finalMinute,
          timestamp: finalTimestamp,
          projected: scoredSoFar,
          scored: scoredSoFar,
          injured,
        });
      }
    }

    players.push({ playerId, moments, finalPoints });
  });

  return players;
}

function sumPlayerProgress(
  players: PlayerWindow[],
  minute: number
): number {
  return players
    .map((player) => scoredAtMinute(player, minute))
    .reduce((a, b) => a + b, 0);
}

function sumRemainingPoints(players: PlayerWindow[], minute: number): number {
  return players
    .map((player) => Math.max(0, player.finalPoints - scoredAtMinute(player, minute)))
    .reduce((a, b) => a + b, 0);
}

function buildProbabilityLine(
  timeline: TimelinePoint[],
  baseline: number,
  homePlayers: PlayerWindow[],
  awayPlayers: PlayerWindow[]
): ProbabilityPoint[] {
  return timeline.map((entry) => {
    const [homeScore, awayScore] = entry.scores;
    const remainingHome = sumRemainingPoints(homePlayers, entry.minute);
    const remainingAway = sumRemainingPoints(awayPlayers, entry.minute);
    const lead = homeScore - awayScore;
    const remainingTotal = remainingHome + remainingAway;
    const scale = Math.max(1, remainingTotal / 6);
    const probability = clamp(1 / (1 + Math.exp(-lead / scale)), 0, 1);

    const timestamp = baseline + entry.minute * 60 * 1000;

    return {
      minute: entry.minute,
      probability,
      timestamp,
    };
  });
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function scoredAtMinute(player: PlayerWindow, minute: number): number {
  if (!player.moments.length) return 0;
  let lastKnown = player.moments[0];
  for (const moment of player.moments) {
    if (moment.minute > minute) break;
    lastKnown = moment;
  }
  return lastKnown.minute > minute ? 0 : lastKnown.scored;
}

function clockToGameMinute(clock: string): number {
  const match = clock.match(/Q(\d)\s+(\d{1,2}):(\d{2})/);
  if (!match) return 0;
  const quarter = parseInt(match[1]);
  const minutes = parseInt(match[2]);
  const seconds = parseInt(match[3]);
  const elapsedInQuarter = (900 - (minutes * 60 + seconds)) / 900;
  const minuteOffset = (quarter - 1) * (GAME_MINUTES / 4);
  return minuteOffset + elapsedInQuarter * (GAME_MINUTES / 4);
}

function matchesPlayer(playerName: string, playText: string): boolean {
  const lastName = playerName.split(" ").slice(-1)[0];
  const escapedLast = escapeRegExp(lastName);
  const lastNameRegex = new RegExp(`\\b${escapedLast}\\b`, "i");
  if (lastNameRegex.test(playText)) return true;

  const [first] = playerName.split(" ");
  if (first) {
    const short = `${first[0]}.${lastName}`;
    const escapedShort = escapeRegExp(short);
    const shortRegex = new RegExp(escapedShort, "i");
    if (shortRegex.test(playText)) return true;
  }

  return false;
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildWeekSchedule(data: DataV6): Map<number, WeekSchedule> {
  const schedule = new Map<number, WeekSchedule>();

  const gamesByWeek = data.games.reduce((acc, game) => {
    if (!acc[game.week]) acc[game.week] = [];
    acc[game.week]!.push(game);
    return acc;
  }, {} as { [week: number]: Game[] });

  Object.entries(gamesByWeek).forEach(([weekStr, games]) => {
    const week = parseInt(weekStr);
    const baseline = Math.min(...games.map((g) => g.timestamp));
    const map = new Map<string, number>();
    const gamesByTeam = new Map<string, Game>();
    games.forEach((game) => {
      const kickoffMinute = (game.timestamp - baseline) / (1000 * 60);
      game.teams.forEach((team) => {
        map.set(team.name, kickoffMinute);
        gamesByTeam.set(team.name, game);
      });
    });
    schedule.set(week, { kickoffMinutes: map, baseline, gamesByTeam });
  });

  return schedule;
}

function getLeader(scores: [number, number]): number | null {
  if (scores[0] === scores[1]) return null;
  return scores[0] > scores[1] ? 0 : 1;
}

function describeMatchup(
  leadChanges: number,
  lateLeadChanges: number,
  lastLeadChangeMinute: number | null
): string {
  if (leadChanges === 0) return "One-sided from kickoff to final whistle.";
  const lateNote =
    lateLeadChanges > 0
      ? ` ${lateLeadChanges} flips came after most rosters were nearly done.`
      : "";
  const timingNote =
    lastLeadChangeMinute !== null
      ? ` Last projected swing landed around minute ${Math.round(
          lastLeadChangeMinute
        )}.`
      : "";
  return `Projected leader flipped ${leadChanges} times.${lateNote}${timingNote}`;
}
