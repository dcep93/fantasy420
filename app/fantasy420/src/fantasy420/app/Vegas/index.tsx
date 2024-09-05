import { useEffect, useState } from "react";
import { bubbleStyle, clog } from "../Wrapped";

var initialized = false;

export default function Vegas() {
  const [vegas, updateVegas] = useState<VegasType>([]);
  useEffect(() => {
    if (initialized) return;
    initialized = true;
    Promise.resolve().then(getVegas).then(updateVegas);
  }, []);
  return (
    <div>
      {vegas.map((v) => (
        <div key={v.source}>
          {v.players
            .map((p) => ({
              p,
              alt: vegas
                .filter((vv) => vv.source !== v.source)
                .map((o) => ({
                  source: o.source,
                  odds: o.players.find((pp) => pp.name === p.name)?.odds!,
                }))
                .filter((vv) => vv.odds !== undefined)
                .sort((a, b) => a.odds - b.odds)[0] || {
                source: "<none>",
                odds: 0,
              },
            }))
            .map((o) => ({ ...o, score: o.p.odds / o.alt.odds }))
            .sort((a, b) => a.score - b.score)
            .map((o, i) => (
              <div key={i} title={JSON.stringify(o.p.o)}>
                <div style={bubbleStyle}>
                  <div>{o.p.name}</div>
                  <div>{o.p.odds}</div>
                  <div>
                    alt: {o.alt.source} {o.alt.odds}
                  </div>
                </div>
              </div>
            ))}
        </div>
      ))}
    </div>
  );
}

type VegasType = {
  source: string;
  players: { name: string; odds: number; o: any }[];
}[];

function getVegas(): Promise<VegasType> {
  function ext(data: any): Promise<any> {
    const extension_id = "kmpbdkipjlpbckfnpbfbncddjaneeklc";
    return new Promise((resolve, reject) =>
      window.chrome.runtime.sendMessage(extension_id, data, (response: any) => {
        if (window.chrome.runtime.lastError) {
          return reject(
            `chrome.runtime.lastError ${window.chrome.runtime.lastError}`
          );
        }
        if (!response.ok) {
          console.error(data, response);
          return reject(`chrome: ${response.err}`);
        }
        resolve(response.data);
      })
    );
  }

  var caesarsHeaders = localStorage.getItem("caesarsHeaders");
  if (caesarsHeaders === null) {
    caesarsHeaders = prompt("caesarsHeaders (x-app-version)");
    localStorage.setItem("caesarsHeaders", caesarsHeaders!);
  }
  return Promise.resolve()
    .then(() => [
      null &&
        Promise.resolve("caesars").then((source) =>
          ext({
            fetch: {
              url: "https://api.americanwagering.com/regions/us/locations/ny/brands/czr/sb/v3/cannedparlays/americanfootball",
              options: {
                headers: JSON.parse(caesarsHeaders!),
              },
              json: true,
              maxAgeMs: 1000 * 60 * 15,
            },
          })
            .then((resp) => resp.msg)
            .then(
              (resp: { events: { id: string; competitionName: string } }[]) =>
                Object.keys(
                  Object.fromEntries(
                    resp
                      .flatMap((r) => r.events)
                      .filter((e) => e.competitionName === "NFL")
                      .map((e) => [e.id, e])
                  )
                ).map((id) =>
                  ext({
                    fetch: {
                      url: `https://api.americanwagering.com/regions/us/locations/ny/brands/czr/sb/v3/events/${id}`,
                      options: {
                        headers: JSON.parse(caesarsHeaders!),
                      },
                      json: true,
                      maxAgeMs: 1000 * 60 * 15,
                    },
                  })
                )
            )
            .then((ps) => Promise.all(ps))
            .then(
              (
                resps: {
                  msg: {
                    markets: {
                      name: string;
                      selections: { name: string; price: { a: number } }[];
                    }[];
                  };
                }[]
              ) =>
                resps
                  .flatMap((r) => r.msg.markets)
                  .filter((m) => m.name === "|Player To Score a Touchdown|")
                  .flatMap((m) => m.selections.map((s) => ({ m, s })))
                  .map((o) => ({
                    o,
                    name: o.s.name.slice(1, -1),
                    odds: o.s.price.a,
                  }))
                  .sort((a, b) => a.odds - b.odds)
            )
            .then((players) => ({ source, players }))
        ),
      Promise.resolve("draftkings").then((source) =>
        ext({
          fetch: {
            url: "https://sportsbook-nash.draftkings.com/api/sportscontent/navigation/dkusny/v1/nav/leagues/88808?format=json",
            maxAge: 12 * 60 * 60 * 1000,
            json: true,
            noCache: true,
          },
        })
          .then(clog)
          .then((resp: { msg: { events: { eventId: string }[] } }) => resp.msg)
          .then(({ events }) =>
            events.flatMap(({ eventId }) =>
              ext({
                fetch: {
                  url: `https://sportsbook-nash.draftkings.com/api/sportscontent/dkusny/v1/events/${eventId}/categories/1003`,
                  maxAge: 15 * 60 * 1000,
                  json: true,
                },
              })
            )
          )
          .then((promises) => Promise.all(promises))
          .then(
            (
              resps: {
                msg: {
                  selections: { marketId: string }[];
                  markets: { id: string }[];
                };
              }[]
            ) =>
              resps
                .map((resp) => resp.msg)
                .map(clog)
                .flatMap(({ selections, markets }) =>
                  selections.map((s) => ({
                    name: "",
                    odds: 0,
                    o: {
                      s,
                      m: markets.find((m) => m.id === s.marketId),
                    },
                  }))
                )
          )
          .then((players) => ({ source, players }))
      ),
    ])
    .then((ps) => Promise.all(ps))
    .then(clog)
    .then((vs) => vs.filter((v) => v).map((v) => v!));
}
