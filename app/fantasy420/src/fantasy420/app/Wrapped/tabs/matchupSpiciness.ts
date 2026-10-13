import { headToHeadProbability } from "../../Scoreboard/probability";

export const MIN_SWING_POINTS = 10;
export const TOP_SWING_COUNT = 3;
export const COMPETITIVE_MARGIN = 10;
export const REVERSAL_POINTS = 5;
export const MAX_REVERSAL_BONUS = 30;
export const LATE_REMAINING_FRACTION = 0.25;
export const MAX_SUSPENSE_BONUS = 20;
export const MIN_SPICE_SCORE = 25;
// A 1 ms interval displays a scoring jump without turning projection decay into steps.
export const TIMELINE_EVENT_EPSILON = 1 / 60_000;

const round = (value: number) => Math.round(value * 100) / 100;
// Inclusive percentage-point boundaries must survive arithmetic such as 100 - p.
const atLeast = (value: number, threshold: number) => value >= threshold - 1e-10;

export function competitiveSwing(from: number, to: number): number {
  // Margins are probability percentage points relative to a 50% tie.
  if (!from || (Math.sign(from) === Math.sign(to) && Math.abs(to) >= Math.abs(from))) return 0;
  if (Math.sign(from) !== Math.sign(to)) return Math.abs(from) + Math.min(COMPETITIVE_MARGIN, Math.abs(to));
  return Math.abs(to - from) * Math.max(0, 1 - Math.abs(to) / COMPETITIVE_MARGIN);
}

type ProjectedPoint = { minute: number; scores: [number, number]; projectedScores: [number, number] };
export type ProbabilityPoint = { minute: number; probability: number; remaining: number };

export function summarizeSpiciness(timeline: ProjectedPoint[]) {
  return summarizeProbabilitySpiciness(timeline.map(point => ({
    minute: point.minute,
    probability: 100 * headToHeadProbability(
      { score: point.scores[0], projected: point.projectedScores[0] },
      { score: point.scores[1], projected: point.projectedScores[1] }
    ),
    remaining: Math.max(0, point.projectedScores[0] - point.scores[0]) +
      Math.max(0, point.projectedScores[1] - point.scores[1]),
  })));
}

/** Chronological probabilities in percentage points; remaining work comes from the raw timeline. */
export function summarizeProbabilitySpiciness(timeline: ProbabilityPoint[]) {
  const margins = timeline.map(point => point.probability - 50);
  const swings: number[] = [];
  let low = margins[0] ?? 0;
  let high = low;
  let pivot = low;
  let extreme = low;
  let direction = 0;
  for (const margin of margins) {
    if (!direction) {
      low = Math.min(low, margin);
      high = Math.max(high, margin);
      if (atLeast(margin - low, MIN_SWING_POINTS)) { direction = 1; pivot = low; extreme = margin; }
      else if (atLeast(high - margin, MIN_SWING_POINTS)) { direction = -1; pivot = high; extreme = margin; }
    } else if ((margin - extreme) * direction >= 0) {
      extreme = margin;
    } else if (atLeast((extreme - margin) * direction, MIN_SWING_POINTS)) {
      swings.push(competitiveSwing(pivot, extreme));
      pivot = extreme;
      extreme = margin;
      direction *= -1;
    }
  }
  if (direction) swings.push(competitiveSwing(pivot, extreme));
  const topSwings = swings.filter(swing => swing > 0).sort((a, b) => b - a).slice(0, TOP_SWING_COUNT);
  const biggestSwings = topSwings.map(round);
  const swingScore = round(biggestSwings.reduce((sum, swing) => sum + swing, 0));

  const initialRemaining = timeline[0]?.remaining ?? 0;
  let leader = 0;
  let meaningfulLeadChanges = 0;
  let lateLeadChanges = 0;
  let lastReversalMinute: number | null = null;
  timeline.forEach((current, index) => {
    const nextLeader = atLeast(current.probability, 60) ? 1 : atLeast(40, current.probability) ? -1 : 0;
    if (!nextLeader) return; // Ties and undecided probabilities preserve the established favorite.
    if (leader && nextLeader !== leader) {
      const previous = timeline[index - 1];
      const interval = current.minute - previous.minute;
      const threshold = nextLeader === 1 ? 60 : 40;
      const fraction = interval <= TIMELINE_EVENT_EPSILON + 1e-7 ? 1 :
        Math.max(0, Math.min(1, (threshold - previous.probability) / (current.probability - previous.probability)));
      lastReversalMinute = previous.minute + interval * fraction;
      const remaining = previous.remaining + fraction * (current.remaining - previous.remaining);
      meaningfulLeadChanges++;
      if (initialRemaining > 0 && atLeast(100 * LATE_REMAINING_FRACTION, 100 * remaining / initialRemaining)) lateLeadChanges++;
    }
    leader = nextLeader;
  });
  const reversalBonus = Math.min(MAX_REVERSAL_BONUS, REVERSAL_POINTS * (meaningfulLeadChanges + lateLeadChanges));
  const suspenseBonus = round(Math.min(MAX_SUSPENSE_BONUS, lateSuspense(timeline, initialRemaining)));
  return {
    biggestSwings, swingScore, meaningfulLeadChanges, lateLeadChanges, reversalBonus, suspenseBonus, lastReversalMinute,
    score: round(swingScore + reversalBonus + suspenseBonus),
  };
}

function lateSuspense(timeline: ProbabilityPoint[], initialRemaining: number): number {
  if (initialRemaining <= 0) return 0;
  const closeness = (probability: number) => Math.max(0, 1 - Math.abs(probability - 50) / 25);
  let area = 0;
  for (let index = 1; index < timeline.length; index++) {
    const previous = timeline[index - 1];
    const current = timeline[index];
    const from = previous.remaining / initialRemaining;
    const to = current.remaining / initialRemaining;
    if (from <= to) continue; // Duplicate samples and idle time do not consume projected scoring.
    const upper = Math.min(LATE_REMAINING_FRACTION, from);
    const lower = Math.max(0, to);
    if (upper <= lower) continue;
    const start = (from - upper) / (from - to);
    const end = (from - lower) / (from - to);
    const probabilityDelta = current.probability - previous.probability;
    const knots = [start, end];
    for (const boundary of [25, 50, 75]) {
      const fraction = (boundary - previous.probability) / probabilityDelta;
      if (fraction > start && fraction < end) knots.push(fraction);
    }
    knots.sort((a, b) => a - b);
    for (let knot = 1; knot < knots.length; knot++) {
      const left = knots[knot - 1];
      const right = knots[knot];
      area += (right - left) * (from - to) *
        (closeness(previous.probability + probabilityDelta * left) +
          closeness(previous.probability + probabilityDelta * right)) / 2;
    }
  }
  return area / LATE_REMAINING_FRACTION * MAX_SUSPENSE_BONUS;
}
