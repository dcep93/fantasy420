import type { WrappedType } from "../../FetchWrapped";
import { isReliableWeeklyProjection } from "../../FetchWrapped/weeklyProjections";

import { lookupTeamAbbreviation } from "./nflTeamAbbreviations";
import { buildMatchupChunks, MatchupChunk } from "./matchupTimelineChunks";
import { summarizeSpiciness, TIMELINE_EVENT_EPSILON } from "./matchupSpiciness";
import { findPlayerGame, playerPlayMatcher } from "./matchupPlayerIdentity";
export { lookupTeamAbbreviation } from "./nflTeamAbbreviations";

const GAME_MINUTES = 180;

export type SeasonGame = {
  timestamp: number;
  week: number;
  teams: { name: string; boxScore?: { players: { name: string }[] }[] }[];
  drives: { team?: string; plays: { clock: string; text: string; type?: string }[] }[];
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
  games: SeasonGame[];
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
  meaningfulLeadChanges: number;
  lateLeadChanges: number;
  reversalBonus: number;
  suspenseBonus: number;
  lastReversalTimestamp: number | null;
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
      week = { baseline: game.timestamp, gamesByTeam: new Map(), games: [] };
      schedule.set(game.week, week);
    }
    week.games.push(game);
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
      const summary = summarizeSpiciness(points);
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
        meaningfulLeadChanges: summary.meaningfulLeadChanges,
        lateLeadChanges: summary.lateLeadChanges,
        reversalBonus: summary.reversalBonus,
        suspenseBonus: summary.suspenseBonus,
        score: summary.score,
        lastReversalTimestamp: summary.lastReversalMinute === null ? null :
          weekSchedule.baseline + summary.lastReversalMinute * 60_000,
        points,
        chunks,
      });
    }
  }
  return { omittedForProjections, matchups: results.sort(compareMatchupSpiciness) };
}

export function compareMatchupSpiciness(a: MatchupSpiciness, b: MatchupSpiciness): number {
  return b.score - a.score ||
    (b.lastReversalTimestamp ?? -Infinity) - (a.lastReversalTimestamp ?? -Infinity) ||
    b.year.localeCompare(a.year) || b.week - a.week || a.id.localeCompare(b.id);
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
    const savedTeamGame = abbr ? schedule.gamesByTeam.get(abbr) : undefined;
    const defense = /^D\/?ST$/.test(player.position);
    const game = defense ? savedTeamGame : findPlayerGame(player.name, schedule.games, savedTeamGame);
    const kickoff = game ? (game.timestamp - schedule.baseline) / 60_000 : 0;
    const plays = (game?.drives ?? []).flatMap(drive => drive.plays.map(play => ({ ...play, offense: drive.team })))
      .map((play, sourceIndex) => ({ ...play, sourceIndex, minute: clockToGameMinute(play.clock) }))
      .filter((play): play is typeof play & { minute: number } => play.minute !== null)
      .sort((a, b) => a.minute - b.minute);
    const matchesPlayer = scoringPlayerMatcher(player.name, game);
    const scoringPlays = defense ? plays : plays.filter(play => matchesPlayer(play.text));
    const end = kickoff + estimatedGameMinutes(game);
    const moments: PlayerWindow["moments"] = [{ minute: kickoff, scored: 0 }];
    // Structured offensive plays carry their actual PPR scoring changes. Keep the
    // legacy estimate only for D/ST and old feeds without typed play data.
    const reconstruct = !defense && plays.some(play => play.type);
    let earned = 0;
    scoringPlays.forEach((play, index) => {
      const delta = reconstruct ? offensivePlayPoints(play.text, play.type, play.offense, matchesPlayer) : 0;
      if (reconstruct && delta === 0) return;
      earned = reconstruct ? Math.round((earned + delta) * 100) / 100 : finalPoints * (index + 1) / scoringPlays.length;
      moments.push({ minute: kickoff + play.minute, scored: earned,
        play: {
          id: `${game!.timestamp}-${game!.teams.map(team => team.name).join("-")}-${play.sourceIndex}`,
          timestamp: game!.timestamp + play.minute * 60_000,
          matchup: game!.teams.map(team => team.name).join(" vs "),
          clock: play.clock,
          text: play.text,
        },
      });
    });
    // Missing events, unusual scoring and later stat corrections belong at the
    // endpoint. Never scale known plays or distribute this residual backward:
    // that would leak a future touchdown into the score before it happened.
    const residual = Math.round((finalPoints - earned) * 100) / 100;
    moments.push({ minute: end, scored: finalPoints,
      ...(reconstruct && residual !== 0 ? { play: {
        id: `${game!.timestamp}-${id}-reconciliation`,
        timestamp: game!.timestamp + estimatedGameMinutes(game) * 60_000,
        matchup: game!.teams.map(team => team.name).join(" vs "),
        clock: "Final-score reconciliation",
        text: `${player.name}: ${residual > 0 ? "+" : ""}${residual.toFixed(2)} points to reconcile the saved weekly total. Unresolved scoring or stat correction; not a recorded play.`,
      } } : {}),
    });
    moments.forEach(moment => {
      minutes.add(moment.minute);
      if (moment.minute > kickoff) minutes.add(moment.minute - TIMELINE_EVENT_EPSILON);
    });
    return [{ moments, kickoff, end, projection: projections[id], finalPoints,
      interpolateScore: !reconstruct && !scoringPlays.length }];
  });
}

function scoringPlayerMatcher(name: string, game?: SeasonGame): (text: string) => boolean {
  const legacy = playerPlayMatcher(name, game);
  const words = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[’'‘.-]/g, "").replace(/[^a-z0-9]+/g, " ").trim()
    .replace(/\s+(?:jr|sr|ii|iii|iv|v)$/, "").split(" ");
  const [first, ...last] = words(name);
  if (!last.length) return legacy;
  const surname = last.join("");
  const candidates = [...new Set((game?.teams ?? []).flatMap(team => team.boxScore ?? [])
    .flatMap(category => category.players.map(player => words(player.name).join(" "))))]
    .map(value => value.split(" ")).filter(parts => parts.slice(1).join("") === surname);
  // ESPN disambiguates Michael/Mack Wilson as Mi.Wilson/Ma.Wilson and spells
  // Amon-Ra St. Brown as A.St. Brown. Accept only an unambiguous first-name prefix.
  const pattern = new RegExp(`(?:^| )([a-z0-9]+) ?${last.join(" ?")}(?= |$)`, "g");
  return text => legacy(text) || [...words(text).join(" ").matchAll(pattern)].some(match => {
    const prefix = match[1];
    return first.startsWith(prefix) && (candidates.length === 0 ||
      candidates.filter(parts => parts[0].startsWith(prefix)).length === 1);
  });
}

/** League scoring: full PPR, 0.04 passing/0.1 rushing or receiving yards,
 * 4 passing/6 other TD points, -2 interceptions/lost fumbles, 2 conversions.
 * Parse player roles, not just name mentions (which also include tacklers).
 * Unknown scoring is reconciled explicitly at the final endpoint above.
 */
function offensivePlayPoints(
  description: string, type: string | undefined, offense: string | undefined,
  matches: (text: string) => boolean
): number {
  // ESPN includes the original ruling followed by the replacement on review.
  const text = description.split(/\bREVERSED\.?/i).at(-1)!;
  const [main, conversion] = text.split(/TWO-POINT CONVERSION ATTEMPT\./i);
  const pointsFor = (segment: string, twoPoint: boolean): number => {
    if (/\bNo Play\b/i.test(segment) || (twoPoint && !/ATTEMPT SUCCEEDS/i.test(segment))) return 0;
    const action = segment.split(/\b(?:PENALTY|Penalty on|The Replay Official|Injury Update)\b/)[0];
    // Do not count return yards as passing/rushing yards, or the extra point
    // appended to a TD as another offensive touchdown.
    const initial = action.split(/\bFUMBLES\b|\bINTERCEPTED\b|\bTOUCHDOWN\b/i)[0];
    const pass = initial.match(/^(.*?)\bpass(?:es)?\b/i);
    const receiver = pass ? initial.slice(pass[0].length).match(/\bto\s+(.+?)(?=\s+(?:to|for|at|pushed|ran|ob)\b|[,(]|$)/i) : null;
    const rush = !pass ? initial.match(/^(.*?)\b(?:left|right|up the middle|scrambles|kneels|rushes|runs)\b/i) : null;
    const sackOrFumble = !pass && !rush ? action.match(/^(.*?)\b(?:sacked|FUMBLES)\b/i) : null;
    const passer = !!pass && matches(pass[1]);
    const catcher = !!receiver && matches(receiver[1]);
    const runner = !!rush && matches(rush[1]);
    const incomplete = /\bincomplete\b|\bINTERCEPTED\b/i.test(action);
    const yardMatch = initial.match(/\bfor\s+(-?\d+)\s+yards?\b/i);
    const yards = yardMatch ? Number(yardMatch[1]) : /\bno gain\b/i.test(initial) ? 0 : null;
    const touchdown = /\bTOUCHDOWN\b/.test(action.split(/\bFUMBLES\b|\bINTERCEPTED\b/i)[0]);
    if (twoPoint) return (passer || catcher || runner) && !incomplete ? 2 : 0;
    let points = 0;
    if (passer) points += incomplete ? (/\bINTERCEPTED\b/i.test(action) ? -2 : 0) : (yards ?? 0) * 0.04 + (touchdown ? 4 : 0);
    if (catcher && !incomplete && (yards !== null || touchdown)) points += 1 + (yards ?? 0) * 0.1 + (touchdown ? 6 : 0);
    // Only award rushing yards to a rushing play, not a kick/punt return.
    if (runner && !/\b(?:kicks|punts|punt|kickoff|return)\b/i.test(initial)) points += (yards ?? 0) * 0.1 + (touchdown ? 6 : 0);

    const recoveries = [...action.matchAll(/\bRECOVERED by\s+([A-Z]+)-/gi)];
    // Multi-fumble/lateral plays require a richer possession feed. Leave their
    // unresolved differences to reconciliation instead of charging the passer
    // for a receiver's turnover or charging the wrong ball carrier.
    const fumbles = action.match(/\bFUMBLES\b/gi)?.length ?? 0;
    const recovery = recoveries[0]?.[1];
    const team = (value: string) => ({ BLT: "BAL", CLV: "CLE", HST: "HOU", ARZ: "ARI", LA: "LAR", WAS: "WSH" }[value] ?? value);
    const lost = fumbles === 1 && (recovery && offense
      ? team(recovery.toUpperCase()) !== team(offense.toUpperCase())
      : type === "_FumbleRecoveryOpp" || type === "SFOP");
    if (lost && (catcher || runner || (sackOrFumble && matches(sackOrFumble[1])))) points -= 2;

    // Kicker names may occur in a touchdown's appended conversion, so locate
    // the kicking clause independently of the offensive play's actor.
    for (const kick of segment.matchAll(/([\w.'’-]+)\s+(?:(\d+)\s+yard field goal|extra point)\s+is\s+(GOOD|No Good)/gi)) {
      if (!matches(kick[1])) continue;
      points += /^GOOD$/i.test(kick[3]) ? (kick[2] ? Math.min(5, Math.max(3, Math.floor(Number(kick[2]) / 10))) : 1) : -1;
    }
    return points;
  };
  return pointsFor(main, false) + (conversion ? pointsFor(conversion, true) : 0);
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
