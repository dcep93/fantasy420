import type { WrappedType } from "../../FetchWrapped";
import { completedWeeks } from "../scope";

export type WaiverSort = "pointsPerWeek" | "totalPoints" | "share" | "bestWeek" | "pickups" | "uniqueStarters" | "starts" | "pointsPerStart";
export type WaiverPlayer = { id: string; name: string; position: string; points: number | null };
export type WaiverWeek = {
  week: string; available: boolean; points: number; lineupPoints: number;
  pickups: WaiverPlayer[]; starters: WaiverPlayer[]; missingScores: number;
  missingLineupScores: number; missingIdentities: number; attributionIncomplete: boolean;
};
export type WaiverManager = {
  id: string; name: string; weeks: WaiverWeek[]; coveredWeeks: number;
  totalPoints: number; pointsPerWeek: number | null; share: number | null;
  bestWeek: number | null; bestWeekNumber: string | null; pickups: number;
  uniqueStarters: number; starts: number; pointsPerStart: number | null;
  topPickup: WaiverPlayer | null; missingScores: number; missingLineupScores: number;
  missingIdentities: number;
};
export type WaiverReport = {
  weeks: string[]; managers: WaiverManager[]; incompleteWeeks: string[]; incompleteDraft: boolean;
  averages: { week: string; points: number | null; starts: number | null; pickups: number | null }[];
};

// null records ambiguous ownership; absence alone is never evidence without a complete snapshot.
type Ownership = Map<string, string | null>;
function ownership(entries: [string, string[]][]): Ownership {
  const owners: Ownership = new Map();
  for (const [team, ids] of entries) for (const id of new Set(ids)) {
    owners.set(id, owners.has(id) ? null : team);
  }
  return owners;
}

export function buildWaiverImpact(wrapped: WrappedType, excludeSpecialTeams = false): WaiverReport {
  const teams = Object.entries(wrapped.ffTeams);
  const recorded = completedWeeks(wrapped);
  const last = Number(recorded.at(-1) ?? 0);
  const weeks = Array.from({ length: Number.isFinite(last) ? Math.max(0, Math.floor(last)) : 0 }, (_, i) => String(i + 1));
  let previousOwners = ownership(teams.map(([id, team]) => [id, team.draft.map(pick => String(pick.playerId))]));
  let previousComplete = teams.length > 0 && teams.every(([, team]) => team.draft.length > 0);
  const incompleteDraft = !previousComplete;
  let previousWaivers = new Map<string, string>();
  const byManager = new Map<string, WaiverWeek[]>(teams.map(([id]) => [id, []]));
  const incompleteWeeks: string[] = [];
  const identityMissing = (id: string) => !wrapped.nflPlayers[id]?.name || !["QB", "RB", "WR", "TE", "K", "DST"].includes(wrapped.nflPlayers[id]?.position);
  const included = (id: string) => !excludeSpecialTeams || ["QB", "RB", "WR", "TE"].includes(wrapped.nflPlayers[id]?.position);
  const player = (id: string, week: string): WaiverPlayer => {
    const data = wrapped.nflPlayers[id];
    const score = data?.scores[week];
    return { id, name: data?.name || `Unknown player (${id})`, position: data?.position || "Unknown", points: Number.isFinite(score) ? score : null };
  };

  for (const week of weeks) {
    const owners = ownership(teams.map(([id, team]) => {
      const roster = team.rosters[week];
      return [id, roster ? [...roster.rostered, ...roster.starting] : []];
    }));
    const complete = teams.length > 0 && teams.every(([, team]) => Boolean(team.rosters[week]));
    if (!complete) incompleteWeeks.push(week);
    const waivers = new Map<string, string>();
    const additions = new Set<string>();
    for (const [id, owner] of owners) {
      if (owner === null) continue;
      if (previousOwners.get(id) === owner && previousWaivers.get(id) === owner) {
        waivers.set(id, owner);
      } else if (previousComplete && !previousOwners.has(id)) {
        waivers.set(id, owner);
        additions.add(id);
      }
    }
    for (const [id, team] of teams) {
      const roster = team.rosters[week];
      const starting = [...new Set(roster?.starting ?? [])];
      const owned = [...new Set([...(roster?.rostered ?? []), ...starting])];
      const starters = starting.filter(pid => included(pid) && waivers.get(pid) === id).map(pid => player(pid, week));
      const pickups = owned.filter(pid => included(pid) && additions.has(pid) && waivers.get(pid) === id).map(pid => player(pid, week));
      const lineup = starting.filter(included).map(pid => player(pid, week));
      byManager.get(id)!.push({
        week, available: Boolean(roster), points: starters.reduce((sum, p) => sum + (p.points ?? 0), 0),
        lineupPoints: lineup.reduce((sum, p) => sum + (p.points ?? 0), 0), pickups, starters,
        missingScores: starters.filter(p => p.points === null).length,
        missingLineupScores: lineup.filter(p => p.points === null).length,
        missingIdentities: owned.filter(identityMissing).length,
        attributionIncomplete: !previousComplete || owned.some(pid => owners.get(pid) === null),
      });
    }
    // Even an entirely absent week replaces ownership, so no stint bridges a gap.
    previousOwners = owners; previousWaivers = waivers; previousComplete = complete;
  }

  const managers = teams.map(([id, team]): WaiverManager => {
    const managerWeeks = byManager.get(id)!;
    const available = managerWeeks.filter(week => week.available);
    const totalPoints = available.reduce((sum, week) => sum + week.points, 0);
    const lineupPoints = available.reduce((sum, week) => sum + week.lineupPoints, 0);
    const starts = available.reduce((sum, week) => sum + week.starters.length, 0);
    const contributing = new Map<string, WaiverPlayer>();
    for (const week of available) for (const p of week.starters) {
      const old = contributing.get(p.id);
      contributing.set(p.id, { ...p, points: old?.points == null && p.points === null ? null : (old?.points ?? 0) + (p.points ?? 0) });
    }
    const best = available.reduce<WaiverWeek | null>((best, week) => best === null || week.points > best.points ? week : best, null);
    const topPickup = [...contributing.values()].sort((a, b) => descending(a.points, b.points) || a.name.localeCompare(b.name) || a.id.localeCompare(b.id))[0] ?? null;
    return { id, name: team.name, weeks: managerWeeks, coveredWeeks: available.length, totalPoints,
      pointsPerWeek: available.length ? totalPoints / available.length : null,
      share: lineupPoints > 0 ? 100 * totalPoints / lineupPoints : null,
      bestWeek: best?.points ?? null, bestWeekNumber: best?.week ?? null,
      pickups: available.reduce((sum, week) => sum + week.pickups.length, 0), uniqueStarters: contributing.size,
      starts, pointsPerStart: starts ? totalPoints / starts : null, topPickup,
      missingScores: available.reduce((sum, week) => sum + week.missingScores, 0),
      missingLineupScores: available.reduce((sum, week) => sum + week.missingLineupScores, 0),
      missingIdentities: available.reduce((sum, week) => sum + week.missingIdentities, 0),
    };
  });
  const averages = weeks.map((week, index) => {
    const available = managers.map(manager => manager.weeks[index]).filter(w => w.available);
    return { week,
      points: available.length ? available.reduce((sum, w) => sum + w.points, 0) / available.length : null,
      starts: available.length ? available.reduce((sum, w) => sum + w.starters.length, 0) / available.length : null,
      pickups: available.length ? available.reduce((sum, w) => sum + w.pickups.length, 0) / available.length : null,
    };
  });
  return { weeks, managers, averages, incompleteWeeks, incompleteDraft };
}

function descending(a: number | null, b: number | null) {
  return a === null ? (b === null ? 0 : 1) : b === null ? -1 : b - a;
}

export function sortWaiverManagers(managers: WaiverManager[], sortKey: WaiverSort): WaiverManager[] {
  return [...managers].sort((a, b) => descending(a[sortKey], b[sortKey]) || a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
}
