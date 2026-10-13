import type { WrappedType } from "../../FetchWrapped";
import { isReliableWeeklyProjection } from "../../FetchWrapped/weeklyProjections";

import { lookupTeamAbbreviation } from "./nflTeamAbbreviations";
import { buildMatchupChunks, MatchupChunk } from "./matchupTimelineChunks";
import { summarizeSpiciness, TIMELINE_EVENT_EPSILON } from "./matchupSpiciness";
export { lookupTeamAbbreviation } from "./nflTeamAbbreviations";

const GAME_MINUTES = 180;

export type SeasonGame = {
  timestamp: number;
  week: number;
  teams: { name: string }[];
  drives: { plays: { clock: string; text: string }[] }[];
};
export type SeasonData = { year: number; games: SeasonGame[] };
export type TimelinePoint = { minute: number; scores: [number, number]; projectedScores: [number, number] };
export type ContributingPlay = {
  id: string;
  timestamp: number;
  matchup: string;
  clock: string;
  text: string;
};
export type LeadPoint = TimelinePoint & { timestamp: number; lastContributingPlays?: ContributingPlay[] };
type WeekSchedule = {
  baseline: number;
  gamesByTeam: Map<string, SeasonGame>;
};
export type MatchupSpiciness = {
  id: string;
  year: string;
  week: number;
  homeName: string;
  awayName: string;
  finalScores: [number, number];
  biggestSwings: number[];
  swingScore: number;
  finalSlotLeadChanges: number;
  finalSlotBonus: number;
  lastFinalSlotLeadChangeTimestamp: number | null;
  score: number;
  points: LeadPoint[];
  chunks: MatchupChunk[];
};

type PlayerWindow = {
  moments: { minute: number; scored: number; play?: ContributingPlay }[];
  kickoff: number;
  end: number;
  projection: number;
  finalPoints: number;
  interpolateScore: boolean;
};

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

export function computeSpiciestMatchups(wrapped: WrappedType, data: SeasonData): MatchupSpiciness[] {
  return analyzeSpiciestMatchups(wrapped, data).matchups;
}

export function analyzeSpiciestMatchups(wrapped: WrappedType, data: SeasonData) {
  const schedule = buildWeekSchedule(data);
  const results: MatchupSpiciness[] = [];
  let omittedForProjections = 0;
  for (const [weekString, matchups] of Object.entries(wrapped.ffMatchups)) {
    const week = Number(weekString);
    if (week <= 0 || week > (wrapped.latestScoringPeriod ?? Infinity)) continue;
    const weekSchedule = schedule.get(week);
    if (!weekSchedule) continue;
    const windows = data.games.filter(game => game.week === week && Number.isFinite(game.timestamp))
      .map(game => ({ start: game.timestamp, end: game.timestamp + estimatedGameMinutes(game) * 60_000 }));
    const chunks = buildMatchupChunks(windows);
    const lastKickoff = Math.max(...windows.map(window => window.start));
    const finalSlot = {
      start: (lastKickoff - weekSchedule.baseline) / 60_000,
      end: (Math.max(...windows.filter(window => window.start === lastKickoff).map(window => window.end)) -
        weekSchedule.baseline) / 60_000,
    };
    for (const [homeId, awayId] of matchups) {
      const home = wrapped.ffTeams[homeId];
      const away = wrapped.ffTeams[awayId];
      const homeRoster = home?.rosters[week];
      const awayRoster = away?.rosters[week];
      if (!homeRoster || !awayRoster) continue;
      if ([homeRoster, awayRoster].some(roster => roster.starting.some(id =>
        !wrapped.nflPlayers[id] || !isReliableWeeklyProjection(roster.projections?.[id], wrapped.weeklyProjectionDataVersion)))) {
        omittedForProjections += 1;
        continue;
      }
      // Include each slot boundary even when neither lineup plays in that slot.
      // Its preceding point preserves continuous projection decay across chunks.
      const minutes = new Set<number>(windows.flatMap(window => [window.start, window.end])
        .flatMap(timestamp => {
          const minute = (timestamp - weekSchedule.baseline) / 60_000;
          return [minute - TIMELINE_EVENT_EPSILON, minute];
        }));
      const homePlayers = buildPlayerWindows(wrapped, week, homeRoster.starting, homeRoster.projections, weekSchedule, minutes);
      const awayPlayers = buildPlayerWindows(wrapped, week, awayRoster.starting, awayRoster.projections, weekSchedule, minutes);
      if (!homePlayers.length || !awayPlayers.length) continue;
      const events = contributingEvents([...homePlayers, ...awayPlayers]);
      let eventIndex = 0;
      let lastContributingPlays: ContributingPlay[] = [];
      const points: LeadPoint[] = [...minutes].sort((a, b) => a - b).map(minute => {
        while (eventIndex < events.length && events[eventIndex].minute <= minute) {
          lastContributingPlays = events[eventIndex++].plays;
        }
        const home = sumAtMinute(homePlayers, minute);
        const away = sumAtMinute(awayPlayers, minute);
        return {
          minute,
          timestamp: weekSchedule.baseline + minute * 60_000,
          scores: [home.score, away.score],
          projectedScores: [home.projectedScore, away.projectedScore],
          lastContributingPlays,
        };
      });
      const summary = summarizeSpiciness(points, finalSlot);
      const starterTotal = (ids: string[]) => ids.reduce((sum, id) =>
        sum + (wrapped.nflPlayers[id]?.scores[week] ?? 0), 0);
      results.push({
        id: `${wrapped.year}-${week}-${homeId}-${awayId}`,
        year: wrapped.year,
        week,
        homeName: home.name,
        awayName: away.name,
        finalScores: [starterTotal(homeRoster.starting), starterTotal(awayRoster.starting)],
        biggestSwings: summary.biggestSwings,
        swingScore: summary.swingScore,
        finalSlotLeadChanges: summary.finalSlotLeadChanges,
        finalSlotBonus: summary.finalSlotBonus,
        score: summary.score,
        lastFinalSlotLeadChangeTimestamp: summary.lastFinalSlotLeadChangeMinute === null ? null :
          weekSchedule.baseline + summary.lastFinalSlotLeadChangeMinute * 60_000,
        points,
        chunks,
      });
    }
  }
  return { omittedForProjections, matchups: results.sort((a, b) => b.score - a.score ||
    (b.lastFinalSlotLeadChangeTimestamp ?? -Infinity) - (a.lastFinalSlotLeadChangeTimestamp ?? -Infinity) ||
    b.week - a.week || a.id.localeCompare(b.id)) };
}

function buildPlayerWindows(
  wrapped: WrappedType, week: number, ids: string[], projections: Record<string, number>,
  schedule: WeekSchedule, minutes: Set<number>
): PlayerWindow[] {
  return ids.flatMap(id => {
    const player = wrapped.nflPlayers[id];
    if (!player) return [];
    const finalPoints = player.scores[week] ?? 0;
    const abbr = lookupTeamAbbreviation(wrapped.nflTeams[player.nflTeamId]?.name);
    const game = abbr ? schedule.gamesByTeam.get(abbr) : undefined;
    const kickoff = game ? (game.timestamp - schedule.baseline) / 60_000 : 0;
    const plays = (game?.drives ?? []).flatMap(drive => drive.plays)
      .map((play, sourceIndex) => ({ ...play, sourceIndex, minute: clockToGameMinute(play.clock) }))
      .filter((play): play is typeof play & { minute: number } => play.minute !== null)
      .sort((a, b) => a.minute - b.minute);
    const involved = plays.filter(play => matchesPlayer(player.name, play.text));
    const scoringPlays = involved.length ? involved : plays;
    const end = kickoff + estimatedGameMinutes(game);
    const moments: PlayerWindow["moments"] = [{ minute: kickoff, scored: 0 }];
    // Retrospective approximation: spread the final total evenly across matching
    // plays (all plays if there are no matches). This is not live fantasy scoring.
    scoringPlays.forEach((play, index) => {
      moments.push({ minute: kickoff + play.minute, scored: finalPoints * (index + 1) / scoringPlays.length,
        play: {
          id: `${game!.timestamp}-${game!.teams.map(team => team.name).join("-")}-${play.sourceIndex}`,
          timestamp: game!.timestamp + play.minute * 60_000,
          matchup: game!.teams.map(team => team.name).join(" vs "),
          clock: play.clock,
          text: play.text,
        },
      });
    });
    // Always finish at the recorded total, including negative scores and overtime.
    moments.push({ minute: end, scored: finalPoints });
    moments.forEach(moment => {
      minutes.add(moment.minute);
      if (moment.minute > kickoff) minutes.add(moment.minute - TIMELINE_EVENT_EPSILON);
    });
    return [{ moments, kickoff, end, projection: projections[id], finalPoints,
      interpolateScore: !scoringPlays.length }];
  });
}

function contributingEvents(players: PlayerWindow[]) {
  const byMinute = new Map<number, Map<string, ContributingPlay>>();
  for (const player of players) {
    let previousScore = 0;
    for (const moment of player.moments) {
      if (moment.play && moment.scored !== previousScore) {
        const plays = byMinute.get(moment.minute) ?? new Map<string, ContributingPlay>();
        plays.set(moment.play.id, moment.play);
        byMinute.set(moment.minute, plays);
      }
      previousScore = moment.scored;
    }
  }
  return [...byMinute].sort(([a], [b]) => a - b)
    .map(([minute, plays]) => ({ minute, plays: [...plays.values()] }));
}

function sumAtMinute(players: PlayerWindow[], minute: number) {
  return players.reduce((sum, player) => {
    const remaining = Math.max(0, Math.min(1, (player.end - minute) / (player.end - player.kickoff)));
    let score = 0;
    for (const moment of player.moments) {
      if (moment.minute > minute) break;
      score = moment.scored;
    }
    if (player.interpolateScore) score = player.finalPoints * (1 - remaining);
    return { score: sum.score + score, projectedScore: sum.projectedScore + score + player.projection * remaining };
  }, { score: 0, projectedScore: 0 });
}

function clockToGameMinute(clock: string): number | null {
  const match = clock.match(/Q(\d)\s+(\d{1,2}):(\d{2})/);
  if (!match) return null;
  const quarter = Number(match[1]);
  const remainingSeconds = Number(match[2]) * 60 + Number(match[3]);
  return (quarter - 1) * 45 + (900 - remainingSeconds) / 20;
}

function estimatedGameMinutes(game?: SeasonGame): number {
  return Math.max(GAME_MINUTES, ...(game?.drives ?? []).flatMap(drive => drive.plays)
    .map(play => clockToGameMinute(play.clock) ?? 0));
}

function matchesPlayer(name: string, text: string): boolean {
  const parts = name.trim().split(/\s+/);
  while (/^(?:jr\.?|sr\.?|ii|iii|iv|v)$/i.test(parts.at(-1) ?? "")) parts.pop();
  const lastName = parts.at(-1);
  if (!lastName) return false;
  const escaped = lastName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`\\b${escaped}\\b`, "i").test(text);
}
