import type { WrappedType } from "../../FetchWrapped";

import { lookupTeamAbbreviation } from "./nflTeamAbbreviations";
export { lookupTeamAbbreviation } from "./nflTeamAbbreviations";

const GAME_MINUTES = 180;

export type SeasonGame = {
  timestamp: number;
  week: number;
  teams: { name: string }[];
  drives: { plays: { clock: string; text: string }[] }[];
};
export type SeasonData = { year: number; games: SeasonGame[] };
export type TimelinePoint = { minute: number; scores: [number, number] };
export type LeadPoint = TimelinePoint & { timestamp: number };
type WeekSchedule = {
  baseline: number;
  gamesByTeam: Map<string, SeasonGame>;
};
export type MatchupSpiciness = {
  id: string;
  week: number;
  homeName: string;
  awayName: string;
  finalScores: [number, number];
  leadChanges: number;
  lateLeadChanges: number;
  lastLeadChangeTimestamp: number | null;
  score: number;
  points: LeadPoint[];
};

type PlayerWindow = { moments: { minute: number; scored: number }[] };

export function buildWeekSchedule(data: SeasonData): Map<number, WeekSchedule> {
  const schedule = new Map<number, WeekSchedule>();
  for (const game of data.games) {
    if (!Number.isFinite(game.timestamp)) continue;
    let week = schedule.get(game.week);
    if (!week) {
      week = { baseline: game.timestamp, gamesByTeam: new Map() };
      schedule.set(game.week, week);
    }
    week.baseline = Math.min(week.baseline, game.timestamp);
    for (const team of game.teams) {
      const abbr = lookupTeamAbbreviation(team.name);
      if (abbr) week.gamesByTeam.set(abbr, game);
    }
  }
  return schedule;
}

export function summarizeLeadChanges(timeline: TimelinePoint[]) {
  const lateStart = (timeline[timeline.length - 1]?.minute ?? GAME_MINUTES) - 45;
  let leader: number | null = null;
  let leadChanges = 0;
  let lateLeadChanges = 0;
  let lastLeadChangeMinute: number | null = null;
  for (const entry of timeline) {
    // Round to scoring precision so floating-point accumulation cannot break a tie.
    const difference = Math.round((entry.scores[0] - entry.scores[1]) * 100);
    if (difference === 0) continue;
    const nextLeader = difference > 0 ? 0 : 1;
    if (leader !== null && nextLeader !== leader) {
      leadChanges++;
      if (entry.minute >= lateStart) lateLeadChanges++;
      lastLeadChangeMinute = entry.minute;
    }
    leader = nextLeader;
  }
  return {
    leadChanges,
    lateLeadChanges,
    lastLeadChangeMinute,
    score: leadChanges + lateLeadChanges * 0.5,
  };
}

export function computeSpiciestMatchups(wrapped: WrappedType, data: SeasonData): MatchupSpiciness[] {
  const schedule = buildWeekSchedule(data);
  const results: MatchupSpiciness[] = [];
  for (const [weekString, matchups] of Object.entries(wrapped.ffMatchups)) {
    const week = Number(weekString);
    if (week <= 0 || week > (wrapped.latestScoringPeriod ?? Infinity)) continue;
    const weekSchedule = schedule.get(week);
    if (!weekSchedule) continue;
    for (const [homeId, awayId] of matchups) {
      const home = wrapped.ffTeams[homeId];
      const away = wrapped.ffTeams[awayId];
      const homeRoster = home?.rosters[week];
      const awayRoster = away?.rosters[week];
      if (!homeRoster || !awayRoster) continue;
      const minutes = new Set<number>([0]);
      const homePlayers = buildPlayerWindows(wrapped, week, homeRoster.starting, weekSchedule, minutes);
      const awayPlayers = buildPlayerWindows(wrapped, week, awayRoster.starting, weekSchedule, minutes);
      if (!homePlayers.length || !awayPlayers.length) continue;
      const points: LeadPoint[] = [...minutes].sort((a, b) => a - b).map(minute => ({
        minute,
        timestamp: weekSchedule.baseline + minute * 60_000,
        scores: [sumAtMinute(homePlayers, minute), sumAtMinute(awayPlayers, minute)],
      }));
      const summary = summarizeLeadChanges(points);
      const starterTotal = (ids: string[]) => ids.reduce((sum, id) =>
        sum + (wrapped.nflPlayers[id]?.scores[week] ?? 0), 0);
      results.push({
        id: `${week}-${homeId}-${awayId}`,
        week,
        homeName: home.name,
        awayName: away.name,
        finalScores: [starterTotal(homeRoster.starting), starterTotal(awayRoster.starting)],
        leadChanges: summary.leadChanges,
        lateLeadChanges: summary.lateLeadChanges,
        score: summary.score,
        lastLeadChangeTimestamp: summary.lastLeadChangeMinute === null ? null :
          weekSchedule.baseline + summary.lastLeadChangeMinute * 60_000,
        points,
      });
    }
  }
  return results.sort((a, b) => b.score - a.score ||
    (b.lastLeadChangeTimestamp ?? -Infinity) - (a.lastLeadChangeTimestamp ?? -Infinity) ||
    b.week - a.week || a.id.localeCompare(b.id));
}

function buildPlayerWindows(
  wrapped: WrappedType, week: number, ids: string[], schedule: WeekSchedule, minutes: Set<number>
): PlayerWindow[] {
  return ids.flatMap(id => {
    const player = wrapped.nflPlayers[id];
    if (!player) return [];
    const finalPoints = player.scores[week] ?? 0;
    const abbr = lookupTeamAbbreviation(wrapped.nflTeams[player.nflTeamId]?.name);
    const game = abbr ? schedule.gamesByTeam.get(abbr) : undefined;
    const kickoff = game ? (game.timestamp - schedule.baseline) / 60_000 : 0;
    const plays = (game?.drives ?? []).flatMap(drive => drive.plays)
      .map(play => ({ ...play, minute: clockToGameMinute(play.clock) }))
      .filter((play): play is typeof play & { minute: number } => play.minute !== null)
      .sort((a, b) => a.minute - b.minute);
    const involved = plays.filter(play => matchesPlayer(player.name, play.text));
    const scoringPlays = involved.length ? involved : plays;
    const end = kickoff + Math.max(GAME_MINUTES, ...plays.map(play => play.minute));
    const moments = [{ minute: kickoff, scored: 0 }];
    // Retrospective approximation: spread the final total evenly across matching
    // plays (all plays if there are no matches). This is not live fantasy scoring.
    scoringPlays.forEach((play, index) => {
      moments.push({ minute: kickoff + play.minute, scored: finalPoints * (index + 1) / scoringPlays.length });
    });
    // Always finish at the recorded total, including negative scores and overtime.
    moments.push({ minute: end, scored: finalPoints });
    moments.forEach(moment => minutes.add(moment.minute));
    return [{ moments }];
  });
}

function sumAtMinute(players: PlayerWindow[], minute: number): number {
  return players.reduce((sum, player) => {
    let score = 0;
    for (const moment of player.moments) {
      if (moment.minute > minute) break;
      score = moment.scored;
    }
    return sum + score;
  }, 0);
}

function clockToGameMinute(clock: string): number | null {
  const match = clock.match(/Q(\d)\s+(\d{1,2}):(\d{2})/);
  if (!match) return null;
  const quarter = Number(match[1]);
  const remainingSeconds = Number(match[2]) * 60 + Number(match[3]);
  return (quarter - 1) * 45 + (900 - remainingSeconds) / 20;
}

function matchesPlayer(name: string, text: string): boolean {
  const lastName = name.split(" ").slice(-1)[0];
  if (!lastName) return false;
  const escaped = lastName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`\\b${escaped}\\b`, "i").test(text);
}
