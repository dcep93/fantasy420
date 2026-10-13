export const MIN_SWING_POINTS = 5;
export const TOP_SWING_COUNT = 3;
export const FINAL_SLOT_FLIP_POINTS = 2;
export const MAX_FINAL_SLOT_BONUS = 10;
// A 1 ms interval displays a scoring jump without turning projection decay into steps.
export const TIMELINE_EVENT_EPSILON = 1 / 60_000;

type ProjectedPoint = { minute: number; projectedScores: [number, number] };

export function summarizeSpiciness(timeline: ProjectedPoint[], finalSlot: { start: number; end: number }) {
  const leads = timeline.map(point => Math.round((point.projectedScores[0] - point.projectedScores[1]) * 100));
  const threshold = MIN_SWING_POINTS * 100;
  const swings: number[] = [];
  let low = leads[0] ?? 0;
  let high = low;
  let pivot = low;
  let extreme = low;
  let direction = 0;
  for (const lead of leads) {
    if (!direction) {
      low = Math.min(low, lead);
      high = Math.max(high, lead);
      if (lead - low >= threshold) { direction = 1; pivot = low; extreme = lead; }
      else if (high - lead >= threshold) { direction = -1; pivot = high; extreme = lead; }
    } else if ((lead - extreme) * direction >= 0) {
      extreme = lead;
    } else if ((extreme - lead) * direction >= threshold) {
      swings.push(Math.abs(extreme - pivot));
      pivot = extreme;
      extreme = lead;
      direction *= -1;
    }
  }
  if (direction) swings.push(Math.abs(extreme - pivot));
  const biggestSwings = swings.sort((a, b) => b - a).slice(0, TOP_SWING_COUNT).map(swing => swing / 100);
  const swingScore = Math.round(biggestSwings.reduce((sum, swing) => sum + swing, 0) * 100) / 100;

  let leader = 0;
  let finalSlotLeadChanges = 0;
  let lastFinalSlotLeadChangeMinute: number | null = null;
  leads.forEach((lead, index) => {
    const nextLeader = Math.sign(lead);
    if (!nextLeader) return; // Ties retain the previous leader.
    if (leader && nextLeader !== leader) {
      const previous = timeline[index - 1];
      const current = timeline[index];
      const interval = current.minute - previous.minute;
      const previousLead = leads[index - 1];
      // Linear projection decay can cross zero before the next scoring event.
      // After a tie plateau, the switch starts at the last tied point.
      const crossingMinute = interval <= TIMELINE_EVENT_EPSILON + 1e-7 ? current.minute :
        previous.minute + interval * Math.abs(previousLead) / (Math.abs(previousLead) + Math.abs(lead));
      if (crossingMinute >= finalSlot.start && crossingMinute <= finalSlot.end) {
        finalSlotLeadChanges++;
        lastFinalSlotLeadChangeMinute = crossingMinute;
      }
    }
    leader = nextLeader;
  });
  const finalSlotBonus = Math.min(MAX_FINAL_SLOT_BONUS, finalSlotLeadChanges * FINAL_SLOT_FLIP_POINTS);
  return {
    biggestSwings, swingScore, finalSlotLeadChanges, finalSlotBonus, lastFinalSlotLeadChangeMinute,
    score: Math.round((swingScore + finalSlotBonus) * 100) / 100,
  };
}
