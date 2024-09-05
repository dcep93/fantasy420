import { useEffect, useState } from "react";
import { bubbleStyle, clog } from "../Wrapped";

var initialized = false;

export default function Vegas() {
  const [vegas, updateVegas] = useState<VegasType | undefined>(undefined);
  useEffect(() => {
    if (initialized) return;
    initialized = true;
    Promise.resolve().then(getVegas).then(updateVegas);
  }, []);
  return vegas === undefined ? (
    <div>fetching</div>
  ) : vegas === null ? (
    <div>failed</div>
  ) : (
    <div>
      <div style={{ display: "flex" }}>
        {vegas.map((v) => (
          <div key={v.source}>
            <div style={bubbleStyle}>{v.source}</div>
            <div>
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
                    odds: -1,
                  },
                }))
                .map((o) => ({ ...o, score: -o.p.odds / o.alt.odds }))
                .sort((a, b) => a.score - b.score)
                .map((o, i) => (
                  <div key={i} title={JSON.stringify(o)}>
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
          </div>
        ))}
      </div>
    </div>
  );
}

type VegasType =
  | {
      source: string;
      players: { name: string; odds: number; o: any }[];
    }[]
  | null;

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
          return reject(`chrome: ${response.err}`);
        }
        if (response.data.err) {
          return reject(response.data.err);
        }
        resolve(response.data);
      })
    ).catch((err) => {
      console.error(err);
      throw err;
    });
  }

  return Promise.resolve()
    .then(() => [
      Promise.resolve("caesars").then((source) =>
        Promise.resolve()
          .then(() => {
            var caesarsHeaders = localStorage.getItem("caesarsHeaders");
            if (caesarsHeaders === null) {
              caesarsHeaders = prompt("caesarsHeaders (x-aws-waf-token)");
              if (!caesarsHeaders) {
                throw new Error("caesarsHeaders");
              }
              localStorage.setItem("caesarsHeaders", caesarsHeaders!);
            }
            return caesarsHeaders;
          })
          .then((caesarsHeaders) =>
            ext({
              fetch: {
                url: "https://api.americanwagering.com/regions/us/locations/ny/brands/czr/sb/v3/cannedparlays/americanfootball",
                options: {
                  headers: JSON.parse(caesarsHeaders!),
                },
                json: true,
                maxAgeMs: 1000 * 60 * 60 * 12,
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
                        selections: { name: string; price: { d: number } }[];
                      }[];
                    };
                  }[]
                ) =>
                  resps
                    .flatMap((r) => r.msg.markets)
                    .filter((m) => m.name === "|Player To Score a Touchdown|")
                    .flatMap((m) =>
                      m.selections.map((s) => ({
                        name: s.name.slice(1, -1),
                        odds: s.price.d,
                        o: { m, s },
                      }))
                    )
              )
              .then((players) => ({ source, players }))
          )
      ),
      Promise.resolve("draftkings").then((source) =>
        ext({
          fetch: {
            url: "https://sportsbook-nash.draftkings.com/api/sportscontent/navigation/dkusny/v1/nav/leagues/88808?format=json",
            maxAgeMs: 12 * 60 * 60 * 1000,
            json: true,
          },
        })
          .then((resp: { msg: { events: { eventId: string }[] } }) => resp.msg)
          .then(({ events }) =>
            events.flatMap(({ eventId }) =>
              ext({
                fetch: {
                  url: `https://sportsbook-nash.draftkings.com/api/sportscontent/dkusny/v1/events/${eventId}/categories/1003`,
                  maxAgeMs: 15 * 60 * 1000,
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
                  selections: {
                    marketId: string;
                    trueOdds: number;
                    participants: { name: string }[];
                  }[];
                  markets: { id: string; name: string }[];
                };
              }[]
            ) =>
              resps
                .map((resp) => resp.msg)
                .filter(Boolean)
                .flatMap(({ selections, markets }) =>
                  (markets || [])
                    .filter((m) => m.name === "Anytime TD Scorer")
                    .flatMap((m) =>
                      selections
                        .filter((s) => s.marketId === m.id)
                        .map((s) => ({
                          name: s.participants?.find((p) => p)?.name!,
                          odds: s.trueOdds,
                          o: { m, s },
                        }))
                    )
                )
                .filter((p) => p.name)
          )
          .then((players) => ({ source, players }))
      ),
    ])
    .then((ps) => Promise.all(ps))
    .then(clog)
    .then((vs) => vs.filter((v) => v).map((v) => v!))
    .catch((err) => null);
}
