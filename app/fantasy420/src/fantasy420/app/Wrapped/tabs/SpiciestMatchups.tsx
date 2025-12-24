import { useEffect, useMemo, useState } from "react";
import { bubbleStyle, selectedWrapped, selectedYear } from "..";

const DATA_CACHE = "data_v6";
const GAME_MINUTES = 180;

interface TeamSummary {
  name: string;
}

interface Game {
  gameId: number;
  timestamp: number;
  week: number;
  teams: TeamSummary[];
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
}

type TimelinePoint = { minute: number; scores: [number, number] };

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
            return (b.lastLeadChangeMinute ?? -Infinity) - (a.lastLeadChangeMinute ?? -Infinity);
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
              Lead changes: {matchup.leadChanges} (late: {matchup.lateLeadChanges})
            </div>
            <div>Final: {matchup.finalScore}</div>
            <div style={{ fontSize: "0.9em", marginTop: "0.2em" }}>
              {matchup.description}
            </div>
            {matchup.lastLeadChangeMinute !== null && (
              <div>
                Last projected flip ~ minute {Math.round(matchup.lastLeadChangeMinute)}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }, [error, matchups]);

  return (
    <div>
      <h2 style={bubbleStyle}>Top spicy fantasy matchups of {numericYear}</h2>
      <p style={{ maxWidth: "60ch" }}>
        Spiciness is driven by projected winner flips across the full fantasy week. Player
        production is spread over their NFL game window using kickoff timestamps from
        data_v6 (each quarter is 45 real minutes). Lead changes during the final sliver of
        the week count extra.
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
      const timeline = buildMatchupTimeline(wrapped, week, homeId, awayId, weekSchedule);
      if (!timeline.length) return;

      const lateStart = (timeline[timeline.length - 1]?.minute ?? GAME_MINUTES) - 45;
      let leader = getLeader(timeline[0].scores);
      let leadChanges = 0;
      let lateLeadChanges = 0;
      let lastLeadChangeMinute: number | null = null;

      timeline.slice(1).forEach((entry) => {
        const nextLeader = getLeader(entry.scores);
        if (nextLeader !== leader && !(leader === null && nextLeader === null)) {
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
        finalScore: `${homeName}: ${homeFinal.toFixed(2)} — ${awayName}: ${awayFinal.toFixed(2)}`,
        leadChanges,
        lateLeadChanges,
        score: leadChanges + lateLeadChanges * 0.5,
        lastLeadChangeMinute,
        description: describeMatchup(leadChanges, lateLeadChanges, lastLeadChangeMinute),
      });
    });
  });

  return matchupTimelines;
}

function buildMatchupTimeline(
  wrapped: ReturnType<typeof selectedWrapped>,
  week: number,
  homeId: string,
  awayId: string,
  weekSchedule: Map<string, number>
): TimelinePoint[] {
  const homeRoster = wrapped.ffTeams[homeId]?.rosters?.[week];
  const awayRoster = wrapped.ffTeams[awayId]?.rosters?.[week];
  if (!homeRoster || !awayRoster) return [];

  const teamMinutes = new Set<number>([0]);
  const homePlayers = buildPlayerWindows(wrapped, week, homeRoster.starting, weekSchedule, teamMinutes);
  const awayPlayers = buildPlayerWindows(wrapped, week, awayRoster.starting, weekSchedule, teamMinutes);

  if (!homePlayers.length || !awayPlayers.length) return [];

  const sortedMinutes = Array.from(teamMinutes).sort((a, b) => a - b);
  const timeline: TimelinePoint[] = sortedMinutes.map((minute) => ({
    minute,
    scores: [
      sumPlayerProgress(homePlayers, minute),
      sumPlayerProgress(awayPlayers, minute),
    ],
  }));

  return timeline;
}

function buildPlayerWindows(
  wrapped: ReturnType<typeof selectedWrapped>,
  week: number,
  playerIds: string[],
  weekSchedule: Map<string, number>,
  minutes: Set<number>
) {
  const players: { start: number; end: number; points: number }[] = [];

  playerIds.forEach((playerId) => {
    const player = wrapped.nflPlayers[playerId];
    if (!player) return;
    const points = player.scores?.[week] ?? 0;
    if (points === 0) return;

    const teamName = wrapped.nflTeams[player.nflTeamId]?.name;
    const teamKickoff = teamName ? weekSchedule.get(teamName) : undefined;
    const kickoff = typeof teamKickoff === "number" ? teamKickoff : 0;
    const start = kickoff;
    const end = kickoff + GAME_MINUTES;
    minutes.add(start);
    minutes.add(end);
    players.push({ start, end, points });
  });

  return players;
}

function sumPlayerProgress(
  players: { start: number; end: number; points: number }[],
  minute: number
): number {
  return players
    .map(({ start, end, points }) => {
      if (minute <= start) return 0;
      if (minute >= end) return points;
      const progress = (minute - start) / (end - start);
      return points * progress;
    })
    .reduce((a, b) => a + b, 0);
}

function buildWeekSchedule(data: DataV6): Map<number, Map<string, number>> {
  const schedule = new Map<number, Map<string, number>>();

  const gamesByWeek = data.games.reduce(
    (acc, game) => {
      if (!acc[game.week]) acc[game.week] = [];
      acc[game.week]!.push(game);
      return acc;
    },
    {} as { [week: number]: Game[] }
  );

  Object.entries(gamesByWeek).forEach(([weekStr, games]) => {
    const week = parseInt(weekStr);
    const baseline = Math.min(...games.map((g) => g.timestamp));
    const map = new Map<string, number>();
    games.forEach((game) => {
      const kickoffMinute = (game.timestamp - baseline) / (1000 * 60);
      game.teams.forEach((team) => {
        map.set(team.name, kickoffMinute);
      });
    });
    schedule.set(week, map);
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
      ? ` Last projected swing landed around minute ${Math.round(lastLeadChangeMinute)}.`
      : "";
  return `Projected leader flipped ${leadChanges} times.${lateNote}${timingNote}`;
}

// Example spicy matchup: Week 12, TacoCorp vs Vandelay Industries had five projected
// swings with the final flip in the Sunday night window after both QBs wrapped up.
