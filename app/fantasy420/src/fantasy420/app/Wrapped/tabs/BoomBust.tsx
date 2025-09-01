import { bubbleStyle, selectedWrapped } from "..";

export default function BoomBust() {
  function getStdDevOverMean(scores: number[]): number {
    if (scores.length <= 1) return NaN;
    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    return (
      Math.pow(
        scores
          .map((s) => mean - s)
          .map((s) => Math.pow(s, 2))
          .reduce((a, b) => a + b, 0) / scores.length,
        0.5
      ) / mean
    );
  }
  return (
    <div>
      <div style={bubbleStyle}>ignores zeroes</div>
      <div>
        {[
          { valueName: "stddev / mean", getValue: getStdDevOverMean },
          {
            valueName: "-stddev / mean",
            getValue: (scores: number[]) => -getStdDevOverMean(scores),
          },
          {
            valueName: "total",
            getValue: (scores: number[]) => scores.reduce((a, b) => a + b, 0),
          },
          {
            valueName: "max",
            getValue: (scores: number[]) => Math.max(...scores),
          },
          {
            valueName: "p75",
            getValue: (scores: number[]) =>
              scores.slice().sort((a, b) => a - b)[
                Math.ceil(scores.length * 0.75 - 1)
              ],
          },
          {
            valueName: "p50",
            getValue: (scores: number[]) =>
              scores.slice().sort((a, b) => a - b)[
                Math.ceil(scores.length * 0.5 - 1)
              ],
          },
          {
            valueName: "p25",
            getValue: (scores: number[]) =>
              scores.slice().sort((a, b) => a - b)[
                Math.ceil(scores.length * 0.25 - 1)
              ],
          },
          {
            valueName: "min",
            getValue: (scores: number[]) => Math.min(...scores),
          },
        ].map(({ valueName, getValue, ...extra }, i) => (
          <div key={i} style={bubbleStyle}>
            <table>
              <thead>
                <tr>
                  <th colSpan={2}>{valueName}</th>
                  <th>scores</th>
                </tr>
              </thead>
              <tbody>
                {Object.values(selectedWrapped().nflPlayers)
                  .map((p) => ({
                    ...p,
                    scoresArr: Object.entries(p.scores)
                      .filter(([scoringPeriod]) => scoringPeriod !== "0")
                      .map(([_, p]) => p)
                      .filter((s) => s !== undefined) as number[],
                  }))
                  .map((p) => ({
                    value: getValue(p.scoresArr.filter((s) => s !== 0)),
                    ...p,
                  }))
                  .filter(({ value }) => isFinite(value))
                  .sort((a, b) => b.value - a.value)
                  .slice(0, 20)
                  .map((p, j) => (
                    <tr key={j}>
                      <td>{p.value.toFixed(2)}</td>
                      <td>{p.name}</td>
                      {p.scoresArr.map((s, k) => (
                        <td key={k} style={{ paddingLeft: "20px" }}>
                          {s}
                        </td>
                      ))}
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </div>
  );
}
