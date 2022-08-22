import FlexColumns from "../../FlexColumns";

import sos_json from "./sos.json";

function Sos() {
  const r = results(sos_json);
  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      <FlexColumns
        columns={r.map((v) => (
          <pre>{JSON.stringify(v, null, 2)}</pre>
        ))}
      />
    </div>
  );
}

function getScore(p: number | undefined): number {
  if (p === undefined) return 0;
  return p * 30 - 10;
}

function results(sos_json: {
  [k: string]: ({ p: number; o: string } | null)[];
}) {
  const sorted = Object.entries(sos_json).sort();
  const scored = sorted.map(([k, v]) => ({
    k: k,
    v: v.map((e) => ({
      e,
      score: getScore(e?.p),
    })),
  }));
  const combos = scored
    .flatMap((a, i) =>
      scored.slice(i + 1).map((b) => ({
        t: `+${a.k.toUpperCase()},+${b.k.toUpperCase()}`,
        p: a.v.map((_, i) =>
          a.v[i].score > b.v[i].score
            ? { ...a.v[i], k: a.k }
            : { ...b.v[i], k: b.k }
        ),
      }))
    )
    .map((o) => ({
      ...o,
      score: o.p.map((p) => p.score).reduce((a, b) => a + b, 0),
      p: o.p.map((o) =>
        o.e === null
          ? "BYE"
          : `${o.k.toUpperCase()} ${o.e.o} ${(100 * o.e.p).toFixed(
              1
            )}% -> ${o.score.toFixed(2)}`
      ),
    }))
    .sort((a, b) => b.score - a.score)
    .map((o) => [`${o.t} -> ${o.score.toFixed(2)}`, o.p]);
  const solos = scored
    .map((o) => ({
      t: o.k,
      score: o.v.map((p) => p.score).reduce((a, b) => a + b, 0),
      p: o.v.map((p) =>
        p.e === null
          ? "BYE"
          : `${p.e.o} ${(100 * p.e.p).toFixed(1)}% -> ${p.score.toFixed(2)}`
      ),
    }))
    .sort((a, b) => b.score - a.score)
    .map((o) => [`-${o.t.toUpperCase()} -> ${o.score.toFixed(2)}`, o.p]);
  return [combos, solos];
}

export default Sos;
