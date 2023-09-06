import raw_defence from "./defence.json";

const defence: DefenceType = raw_defence;

type DefenceType = {
  [name: string]: ({
    opp: string;
    lines: { Spread: number; Total?: number };
  } | null)[];
};

const AVERAGE_SCORE = 50;
const BYE_SCORE = 100;

export default function Defence() {
  const r = results(defence);
  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        width: "100%",
      }}
    >
      {r.map((v) => (
        <pre style={{ flexGrow: 1 }}>{JSON.stringify(v, null, 2)}</pre>
      ))}
    </div>
  );
}

function results(defence: DefenceType) {
  const scored = Object.entries(defence).map(([name, arr]) => ({
    name,
    weeks: arr.slice(0, 6).map((a) => ({
      opp: a?.opp || "BYE",
      score: !a ? BYE_SCORE : (a.lines.Total || AVERAGE_SCORE) - a.lines.Spread,
    })),
  }));
  const combos = scored
    .flatMap((a, i) =>
      scored.slice(i + 1).map((b) => ({
        name: `+${a.name},+${b.name}`,
        weeks: a.weeks.map((_, i) =>
          a.weeks[i].score < b.weeks[i].score
            ? { ...a, ...a.weeks[i] }
            : { ...b, ...b.weeks[i] }
        ),
      }))
    )
    .map((o) => ({
      ...o,
      score: o.weeks.map((w) => w.score).reduce((a, b) => a + b, 0),
      weeks: o.weeks.map((w) => `${w.name} vs ${w.opp} -> ${w.score}`),
    }))
    .sort((a, b) => a.score - b.score)
    .map((o) => [`${o.name} -> ${o.score}`, o.weeks]);
  const solos = scored
    .map((o) => ({
      ...o,
      weeks: o.weeks.map((w) => `${w.opp} -> ${w.score}`),
      score: o.weeks.map((w) => w.score).reduce((a, b) => a + b, 0),
    }))
    .sort((a, b) => a.score - b.score)
    .map((o) => [`-${o.name} -> ${o.score.toFixed(2)}`, o.weeks]);
  return [combos, solos];
}
