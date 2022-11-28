export default function Standings() {
  return (
    <div>
      <div style={{ display: "flex" }}>
        {process([
          { dan: 8, bu: 3 },
          { george: 8, jon: 7 },
          { ruifan: 7, heify: 8 },
          { dylan: 8, neil: 7 },
        ]).map((results, i) => (
          <div
            key={i}
            style={{
              border: "2px solid black",
              borderRadius: "2px",
              margin: "10px",
              padding: "10px",
            }}
          >
            {Object.entries(results)
              .map(([name, score]) => ({ name, score }))
              .sort((a, b) => b.score - a.score)
              .map((obj, j) => (
                <div key={j} style={{ whiteSpace: "nowrap" }}>
                  {obj.name} -&gt; {obj.score}
                </div>
              ))}
          </div>
        ))}
      </div>
      <div style={{ display: "flex" }}>
        {process([
          { dan: 8, bu: 3 },
          { george: 8, jon: 7 },
          { ruifan: 8, heify: 8 },
          { dylan: 8, neil: 7 },
        ]).map((results, i) => (
          <div
            key={i}
            style={{
              border: "2px solid black",
              borderRadius: "2px",
              margin: "10px",
              padding: "10px",
            }}
          >
            {Object.entries(results)
              .map(([name, score]) => ({ name, score }))
              .sort((a, b) => b.score - a.score)
              .map((obj, j) => (
                <div key={j} style={{ whiteSpace: "nowrap" }}>
                  {obj.name} -&gt; {obj.score}
                </div>
              ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function process(
  matchups: { [name: string]: number }[]
): { [name: string]: number }[] {
  function helper(
    matchups: { [name: string]: number }[],
    results: { [name: string]: number }[]
  ): { [name: string]: number }[] {
    if (matchups.length === 0) return results;
    const matchup = matchups[0];
    return helper(
      matchups.slice(1),
      results.flatMap((result) =>
        Object.keys(matchup).map((winner) =>
          Object.assign(
            Object.fromEntries(
              Object.entries(matchup).map(([name, score]) =>
                name === winner ? [`${name}*`, score + 1] : [name, score]
              )
            ),
            result
          )
        )
      )
    );
  }
  return helper(matchups, [{}]);
}
