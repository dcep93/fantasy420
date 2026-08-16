export default function getMidranks(
  valuesByPlayerId: Record<string, number>
): Record<string, number> {
  const sorted = Object.entries(valuesByPlayerId).sort(
    ([, left], [, right]) => left - right
  );
  const result: Record<string, number> = {};

  for (let start = 0; start < sorted.length; ) {
    let end = start + 1;
    while (end < sorted.length && sorted[end][1] === sorted[start][1]) {
      end += 1;
    }

    const midpointRank = (start + end - 1) / 2;
    for (let index = start; index < end; index += 1) {
      result[sorted[index][0]] = midpointRank;
    }
    start = end;
  }

  return result;
}
