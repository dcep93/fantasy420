import allWrapped from "../allWrapped";

export default function StdDev() {
  const x = Object.values(allWrapped).flatMap((w) =>
    Object.values(w.ffTeams)
      .flatMap((t) =>
        Object.entries(t.rosters).map(([weekNum, { projections }]) => ({
          weekNum,
          projections,
        }))
      )
      .flatMap(({ weekNum, projections }) =>
        Object.entries(projections).map(([playerId, projection]) => ({
          projection,
          actual: w.nflPlayers[playerId]?.scores[weekNum] ?? 0,
        }))
      )
      .map((o) => ({ ...o, diff: o.actual - o.projection }))
  );
  const data = [18, 15, 12, -9, -6, -3]
    .map((cutoff) => ({
      cutoff,
      differences: x
        .filter(({ projection, actual }) =>
          actual !== undefined && projection !== undefined && cutoff > 0
            ? projection > cutoff
            : projection < -cutoff
        )
        .map(({ projection, actual }) => actual - projection),
    }))
    .map((o) => ({
      mean: o.differences.reduce((a, b) => a + b, 0) / o.differences.length,
      ...o,
    }))
    .map((o) => ({
      v:
        o.differences
          .map((d) => d - o.mean)
          .map((dd) => Math.pow(dd, 2))
          .reduce((a, b) => a + b, 0) / o.differences.length,
      ...o,
    }))
    .map((o) => ({ stddev: Math.pow(o.v, 0.5), ...o }));
  return (
    <div style={{ display: "flex" }}>
      {data.map((d) => (
        <pre>{JSON.stringify(d, null, 2)}</pre>
      ))}
    </div>
  );
}
