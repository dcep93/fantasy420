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
                source: "",
                odds: 0,
              },
            }))
            .map((o) => ({ ...o, score: o.p.odds / o.alt.odds }))
            .sort((a, b) => a.score - b.score)
            .map((o) => (
              <div
                key={o.p.name}
                style={bubbleStyle}
                title={JSON.stringify(o.p.o)}
              >
                <div>{o.p.name}</div>
                <div>{o.p.odds}</div>
                <div>
                  alt: {o.alt.source} {o.alt.odds}
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
      Promise.resolve("caesars").then((source) =>
        ext({
          fetch: {
            url: "https://api.americanwagering.com/regions/us/locations/ny/brands/czr/sb/v3/cannedparlays/americanfootball",
            options: {
              headers: JSON.parse(caesarsHeaders!),
            },
            json: true,
            maxAgeMs: 1000 * 60 * 5,
          },
        })
          .then((resp) => resp.msg)
          .then(clog)
          .then((resp: { events: { id: string; competitionName: string } }[]) =>
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
                  maxAgeMs: 1000 * 60 * 5,
                },
              })
            )
          )
          .then((ps) => Promise.all(ps))
          .then(clog)
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
          .then(clog)
          .then((players) => ({ source, players }))
      ),
    ])
    .then((ps) => Promise.all(ps));
}
