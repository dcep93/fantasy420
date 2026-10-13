import type { LeadPoint } from "./spiciestMatchupsData";

export const MATCHUP_CHUNK_LABELS = [
  "Pre Sunday", "Sunday pre final slot", "Sunday final slot", "Post Sunday",
] as const;

export type GameWindow = { start: number; end: number };
export type MatchupChunk = { label: typeof MATCHUP_CHUNK_LABELS[number]; windows: GameWindow[] };
export type ChunkedLeadPoint = LeadPoint & { position: number; lead: number };

const easternWeekday = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York", weekday: "short",
});

export function buildMatchupChunks(games: GameWindow[]): MatchupChunk[] {
  const dated = games.map(game => ({ ...game, weekday: easternWeekday.format(game.start) }));
  const finalSunday = Math.max(...dated.filter(game => game.weekday === "Sun").map(game => game.start));
  const chunks: MatchupChunk[] = MATCHUP_CHUNK_LABELS.map(label => ({ label, windows: [] }));
  for (const game of dated) {
    const index = game.weekday === "Sun" ? (game.start === finalSunday ? 2 : 1) :
      ["Mon", "Tue", "Wed"].includes(game.weekday) ? 3 : 0;
    chunks[index].windows.push({ start: game.start, end: game.end });
  }
  for (const chunk of chunks) chunk.windows.sort((a, b) => a.start - b.start);
  chunks.forEach((chunk, index) => {
    const nextStart = chunks.slice(index + 1).find(next => next.windows.length)?.windows[0].start ?? Infinity;
    const merged: GameWindow[] = [];
    for (const window of chunk.windows) {
      const end = Math.min(window.end, nextStart);
      const previous = merged.at(-1);
      if (previous && window.start <= previous.end) previous.end = Math.max(previous.end, end);
      else merged.push({ start: window.start, end });
    }
    chunk.windows = merged;
  });
  return chunks;
}

// Equal-width sections, with elapsed time proportional only while NFL games run.
// Real timestamps stay on the points for the tooltip; scoring is never rescaled.
export function chunkMatchupPoints(points: LeadPoint[], chunks: MatchupChunk[]): ChunkedLeadPoint[] {
  if (!points.length) return [];
  const grouped: LeadPoint[][] = chunks.map(() => []);
  for (const point of points) {
    let index = chunks.findIndex(chunk => chunk.windows.length);
    chunks.forEach((chunk, candidate) => {
      if (chunk.windows.length && point.timestamp >= chunk.windows[0].start) index = candidate;
    });
    if (index >= 0) grouped[index].push(point);
  }
  let carried = points[0];
  return chunks.flatMap((chunk, index) => {
    const duration = chunk.windows.reduce((sum, window) => sum + window.end - window.start, 0);
    const positionAt = (timestamp: number) => {
      const elapsed = chunk.windows.reduce((sum, window) =>
        sum + Math.max(0, Math.min(timestamp, window.end) - window.start), 0);
      return index + 0.02 + (duration ? elapsed / duration : 0) * 0.96;
    };
    const withPosition = (point: LeadPoint, position: number): ChunkedLeadPoint => ({
      ...point, position, lead: point.scores[0] - point.scores[1],
    });
    const boundaryPoint = (timestamp: number): LeadPoint => ({
      ...carried, timestamp, minute: carried.minute + (timestamp - carried.timestamp) / 60_000,
    });
    const start = boundaryPoint(chunk.windows[0]?.start ?? carried.timestamp);
    const data = [withPosition(start, index),
      ...grouped[index].map(point => withPosition(point, positionAt(point.timestamp)))];
    carried = grouped[index].at(-1) ?? carried;
    const end = boundaryPoint(chunk.windows.at(-1)?.end ?? carried.timestamp);
    data.push(withPosition(end, index + 1));
    carried = end;
    return data;
  });
}
