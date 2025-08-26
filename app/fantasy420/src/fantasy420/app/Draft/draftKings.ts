export default function draftKings() {
  function groupByF<T>(ts: T[], f: (t: T) => string): { [key: string]: T[] } {
    return ts.reduce((prev, curr) => {
      const key = f(curr);
      if (!prev[key]) prev[key] = [];
      prev[key]!.push(curr);
      return prev;
    }, {} as { [key: string]: T[] });
  }
  function clog<T>(t: T): T {
    console.log(t);
    return t;
  }
  return Promise.resolve()
    .then(() =>
      Object.entries({
        passing_yards: { points: 0.04, subcategory: 17147 },
        passing_tds: { points: 4, subcategory: 17148 },
        receiving_yards: { points: 0.1, subcategory: 17314 },
        receiving_touchdowns: { points: 6, subcategory: 17315 },
        receptions: { points: 1, subcategory: 18435 },
        rushing_yards: { points: 0.1, subcategory: 17223 },
        rushing_touchdowns: { points: 6, subcategory: 17224 },
        // interceptions: { points: -2, subcategory: 13350 },
      }).map(([key, { points, subcategory }]) =>
        Promise.resolve()
          .then(() =>
            fetch(
              `https://sportsbook-nash.draftkings.com/sites/US-NY-SB/api/sportscontent/controldata/league/leagueSubcategory/v1/markets?isBatchable=false&templateVars=88808%2C${subcategory}&eventsQuery=%24filter%3DleagueId%20eq%20%2788808%27%20AND%20clientMetadata%2FSubcategories%2Fany%28s%3A%20s%2FId%20eq%20%27${subcategory}%27%29&marketsQuery=%24filter%3DclientMetadata%2FsubCategoryId%20eq%20%27${subcategory}%27%20AND%20tags%2Fall%28t%3A%20t%20ne%20%27SportcastBetBuilder%27%29&include=Events&entity=events`
            )
              .then((resp) => resp.json())
              .then(
                (resp: {
                  events: {
                    id: string;
                    participants: { id?: string; name: string }[];
                  }[];
                  markets: { id: string; eventId: string }[];
                  selections: { marketId: string; label: string }[];
                }) =>
                  Object.fromEntries(
                    resp.events
                      .map((event) => ({
                        event,
                        name: event.participants.find(
                          (p) => p.id === undefined
                        )!.name,
                        market: resp.markets.find(
                          (m) => m.eventId === event.id
                        )!,
                      }))
                      .map((d) => ({
                        ...d,
                        selection: resp.selections.find(
                          (s) => s.marketId === d.market.id
                        )!,
                      }))
                      .map((d) => ({
                        ...d,
                        value: parseFloat(
                          d.selection.label.split(" ").reverse()[0]
                        ),
                      }))
                      .sort((a, b) => b.value - a.value)
                      .map((d) => [d.name, -points * d.value])
                  )
              )
          )
          .then((p) => [key, p])
      )
    )
    .then((ps) => Promise.all(ps))
    .then(Object.fromEntries)
    .then(clog)
    .then((d: { [subcategory: string]: { [playerName: string]: number } }) =>
      groupByF(
        Object.values(d)
          .flatMap((v) => Object.entries(v))
          .map(([name, points]) => ({ name, points })),
        (p) => p.name
      )
    )
    .then((d) =>
      Object.entries(d).map(([name, ps]) => [
        name,
        ps.map(({ points }) => points).reduce((a, b) => a + b, 0),
      ])
    )
    .then(Object.fromEntries)
    .then(console.log);
}
