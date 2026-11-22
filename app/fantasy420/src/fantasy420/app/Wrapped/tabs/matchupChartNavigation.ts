import type { LeadPoint } from "./spiciestMatchupsData";

/** Use original samples: chart boundaries and carried metadata are not new plays. */
export function contributingPlayEvents(points: LeadPoint[]): LeadPoint[] {
  const seen = new Set<string>();
  return [...points].sort((a, b) => a.timestamp - b.timestamp).filter(point => {
    let introducedPlay = false;
    for (const play of point.lastContributingPlays ?? []) {
      if (!seen.has(play.id)) introducedPlay = true;
      seen.add(play.id);
    }
    return introducedPlay;
  });
}

export function adjacentPlay(events: LeadPoint[], inspected: LeadPoint | null, direction: -1 | 1): LeadPoint | null {
  if (!inspected) return (direction === 1 ? events[0] : events.at(-1)) ?? null;
  return (direction === 1 ? events.find(point => point.timestamp > inspected.timestamp) :
    [...events].reverse().find(point => point.timestamp < inspected.timestamp)) ?? null;
}
