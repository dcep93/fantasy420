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

function results(sos_json: {
  [k: string]: ({ p: number; o: string } | null)[];
}) {
  const sorted = Object.entries(sos_json).sort();
  const scored = sorted.map(([k, v]) => ({
    k,
    v: v.map((e) => ({
      e,
      score: !e ? 0 : e.p,
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
          : `${o.k.toUpperCase()} ${o.e.o} -> ${o.score.toFixed(2)}`
      ),
    }))
    .sort((a, b) => b.score - a.score)
    .map((o) => [`${o.t} -> ${o.score.toFixed(2)}`, o.p]);
  const solos = scored
    .map((o) => ({
      t: o.k,
      score: o.v.map((p) => p.score).reduce((a, b) => a + b, 0),
      p: o.v.map((p) =>
        p.e === null ? "BYE" : `${p.e.o} -> ${p.score.toFixed(2)}`
      ),
    }))
    .sort((a, b) => b.score - a.score)
    .map((o) => [`-${o.t.toUpperCase()} -> ${o.score.toFixed(2)}`, o.p]);
  return [combos, solos];
}

export default Sos;
