import { useState } from "react";
import { FirebaseWrapper } from "../firebase";

import draft_json from "./draft.json";

const PICK_NUMBER = 8;
const NUM_TEAMS = 10;

type DraftType = string[];
type PlayersType = { [name: string]: number };
type FirebaseType = { name: string; rank: number }[];
type PType = { position: string; team: string };
type RPType = {
  name: string;
  fname: string;
  picks: number[];
  value: number;
} & PType;
type ResultsType = {
  source: string;
  players: RPType[];
}[];
type DraftJsonType = {
  drafts: DraftType[];
  extra: { [source: string]: PlayersType };
  espn: {
    players: { [name: string]: PType };
    pick: PlayersType;
    auction: PlayersType;
  };
};

function Draft() {
  const r = results(draft_json);
  return <SubDraft r={r} />;
}

class SubDraft extends FirebaseWrapper<FirebaseType, { r: ResultsType }> {
  getFirebasePath() {
    return "/ff/draft";
  }

  componentDidMount(): void {
    super.componentDidMount();
  }

  render() {
    console.log(this.state?.state);
    return (
      <SubSubDraft
        o={{
          ...this.props,
          f: this.state?.state || [],
        }}
      />
    );
  }
}

function SubSubDraft(props: { o: { r: ResultsType; f: FirebaseType } }) {
  const espn = Object.fromEntries(
    props.o.f
      .slice()
      .sort((a, b) => a.rank - b.rank)
      .map(({ name, rank }) => [normalize(name), rank])
  );
  const drafted = props.o.f.map(({ name }) => name);
  const sources = props.o.r.map((d) => d.source);
  const [source, update] = useState(sources[0]);
  const players = (
    props.o.r.find((d) => d.source === source)?.players || []
  ).map((p) => ({
    ...p,
    seen: espn[p.name] !== undefined,
  }));
  return (
    <pre
      style={{
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "space-around",
        height: "90vh",
        fontSize: "1.5em",
      }}
    >
      <div>
        <div>
          <ul
            style={{ backgroundColor: isMyPick(drafted.length) ? "#ccc" : "" }}
          >
            {sources.map((s) => (
              <li key={s}>
                <span
                  style={{
                    cursor: "pointer",
                    color: "blue",
                    textDecoration: "underline",
                  }}
                  onClick={() => update(s)}
                >
                  {s}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          {source} ({drafted.length})
        </div>
        <pre>
          {JSON.stringify(
            drafted
              .map(
                (name) =>
                  (
                    draft_json.espn.players as {
                      [n: string]: { position: string };
                    }
                  )[name]?.position
              )
              .reduce((prev, current) => {
                prev[current] = (prev[current] || 0) + 1;
                return prev;
              }, {} as { [position: string]: number }),
            null,
            2
          )}
        </pre>
        <div>
          <div>drafted</div>
          <input readOnly value={JSON.stringify(drafted)} />
        </div>
        {/* <div>
          <div>beerSheets</div>
          <input readOnly value={printF(getFromBeersheets.toString())} />
        </div> */}
        <div>
          <div>
            <a href="https://jayzheng.com/ff/">jayzheng</a>
          </div>
          <input readOnly value={printF(jayzheng.toString())} />
        </div>
        <div>
          <div>
            <a href="https://fantasy.espn.com/football/livedraftresults">
              espn
            </a>
          </div>
          <input
            readOnly
            value={`${printF(getEspnLiveDraft.toString())}; ${
              getEspnLiveDraft.name
            }()`}
          />
        </div>
        <div>
          <div>updateDraftRanking</div>
          <div>
            <input readOnly value={printF(updateDraftRanking.toString())} />
          </div>
          <div>
            <input
              readOnly
              value={`${updateDraftRanking.name}(${JSON.stringify(
                Object.fromEntries(players.map((p, i) => [p.name, i]))
              )})`}
            />
          </div>
        </div>
      </div>
      <div
        style={{
          height: "100%",
          overflowY: "scroll",
        }}
      >
        <table>
          <tbody>
            {players
              .map((player, i) => ({
                ...player,
                i,
                pos_rank: players
                  .slice(0, i)
                  .filter((p, j) => p.position === player.position).length,
              }))
              .map((v, i) => (
                <tr
                  key={i}
                  style={{
                    backgroundColor: v.seen ? "lightgray" : "",
                  }}
                >
                  <td>
                    {v.pos_rank + 1}/{v.i + 1}
                  </td>
                  <td>
                    {v.value < 0 && "$"}
                    {(v.value > 0 ? v.value : -v.value).toFixed(1)}
                  </td>
                  <td
                    style={{
                      backgroundColor: {
                        RB: "lightblue",
                        WR: "lightseagreen",
                        TE: "lightcoral",
                        QB: "plum",
                        K: "tan",
                        "D/ST": "lightsalmon",
                      }[v.position],
                    }}
                  >
                    {v.fname}, {v.position} {v.team}
                  </td>
                  {v.picks.map((w, j) => (
                    <td
                      key={j}
                      style={{
                        backgroundColor: isMyPick(w) ? "khaki" : "",
                      }}
                    >
                      {w + 1}
                    </td>
                  ))}
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </pre>
  );
}

function isMyPick(pick: number): boolean {
  const oddRound = (pick / NUM_TEAMS) % 2 < 1;
  return (
    pick % NUM_TEAMS === (oddRound ? PICK_NUMBER - 1 : NUM_TEAMS - PICK_NUMBER)
  );
}

export function normalize(s: string) {
  return s
    .replaceAll(/[^A-Za-z ]/g, "")
    .replaceAll(/ I+$/g, "")
    .replaceAll(/ jr$/gi, "");
}

function getScore(average: number, value: number): number {
  return (100 * (value - average)) / average;
}

function results(draft_json: DraftJsonType): ResultsType {
  draft_json.drafts = draft_json.drafts.map((d) => d.map((n) => normalize(n)));
  draft_json.extra = Object.fromEntries(
    Object.entries(draft_json.extra).map(([s, ps]) => [
      s,
      Object.fromEntries(
        Object.entries(ps).map(([name, value]) => [normalize(name), value])
      ),
    ])
  );
  // @ts-ignore
  draft_json.espn = Object.fromEntries(
    Object.entries(draft_json.espn).map(([k, v]) => [
      k,
      Object.fromEntries(
        Object.entries(v).map(([kk, vv]) => [normalize(kk), vv])
      ),
    ])
  );
  console.log(draft_json.espn);
  const ds = draft_json.drafts.map((d) => ({
    size: d.length,
    picks: Object.fromEntries(d.map((p, i) => [p, i])),
  }));
  const extra = Object.keys(draft_json.extra);
  const raw = Object.entries(draft_json.espn.pick)
    .map(([name, pick]) => ({
      name,
      pick,
      auction: -draft_json.espn.auction[name] || -1,
    }))
    .sort((a, b) => a.pick - b.pick)
    .map((o, i) => ({ ...o, i }))
    .map((o) => ({
      ...o,
      picks: ds.map((d) =>
        d.picks[o.name] === undefined ? d.size : d.picks[o.name]
      ),
      extra: Object.fromEntries(
        extra.map((s) => [
          s,
          draft_json.extra[s][o.name] ||
            Object.entries(draft_json.extra[s]).length + 1,
        ])
      ),
    }))
    .map((o) => ({
      ...o,
      history: 1 + o.picks.reduce((a, b) => a + b, 0) / o.picks.length,
    }))
    .map((o) => ({
      ...o,
      history_score: getScore(o.pick, o.history),
      scores: Object.fromEntries(
        extra.map((s) => [
          s,
          getScore(o.extra[s] > 0 ? o.history : o.auction, o.extra[s]),
        ])
      ),
    }))
    .map((o) => ({
      fname: `${[
        o.history.toFixed(1),
        "",
        o.pick,
        `$${-o.auction}`,
        "",
        ...extra.map((s) => (o.extra[s] < 0 ? `$${-o.extra[s]}` : o.extra[s])),
      ].join("/")} ${o.name.substring(0, 20)}`,
      ...o,
    }))
    .map((o) => ({ ...o, ...draft_json.espn.players[o.name] }));

  const values = [
    {
      source: "history",
      players: raw.map((p) => ({ ...p, value: p.history })),
    },
    { source: "pick", players: raw.map((p) => ({ ...p, value: p.pick })) },
    {
      source: "auction",
      players: raw.map((p) => ({ ...p, value: p.auction })),
    },
  ].concat(
    extra.map((source) => ({
      source,
      players: raw.map((p) => ({ ...p, value: p.extra[source] })),
    }))
  );

  const scores = [
    {
      source: "history_score",
      players: raw.map((p) => ({ ...p, value: p.history_score })),
    },
  ].concat(
    extra.map((source) => ({
      source: `${source}_score`,
      players: raw.map((p) => ({ ...p, value: p.scores[source] })),
    }))
  );

  const composite = {
    source: "composite",
    players: raw
      .map((p) => ({
        ...p,
        extra: Object.values(draft_json.extra)
          .map(
            (d) =>
              Object.keys(d)
                .map((name, i) => ({ name, i }))
                .find(({ name }) => name === p.name)?.i!
          )
          .filter((rank) => rank !== undefined),
      }))
      .map(({ extra, ...p }) => ({
        ...p,
        value: extra.reduce((a, b) => a + b, extra.length) / extra.length,
      })),
  };

  return [composite]
    .concat(values)
    .concat(scores)
    .map(({ players, ...o }) => ({
      ...o,
      players: players.sort((a, b) => a.value - b.value),
    }));
}

function printF(s: string): string {
  return s
    .split("\n")
    .map((i) => i.split("// ")[0].trim())
    .join(" ");
}

export function getDraft() {
  const history = document.getElementsByClassName("pick-history")[0];
  var s: { name: string; rank: number }[];
  if (!history) {
    // @ts-ignore
    s = window.state;
  } else {
    s = Array.from(
      history.getElementsByClassName("fixedDataTableCellGroupLayout_cellGroup")
    )
      .map((row) => ({
        name_e: row.getElementsByClassName(
          "playerinfo__playername"
        )[0] as HTMLElement,
        rank_e: Array.from(row.children).reverse()[0] as HTMLElement,
      }))
      .filter(({ name_e, rank_e }) => name_e && rank_e)
      .map(({ name_e, rank_e }) => ({
        name: name_e.innerText,
        rank: parseInt(rank_e.innerText),
      }));
  }
  const seen = Object.fromEntries(s.map((o) => [o.name, true]));
  const recent = Array.from(
    document.getElementsByClassName("pick__message-content")
  )
    .map(
      (e) =>
        e.getElementsByClassName("playerinfo__playername")[0] as HTMLElement
    )
    .map((e) => e.innerText)
    .filter((name) => !seen[name])
    .map((name, i) => ({ name, rank: s.length + 1 + i }));
  return s.concat(recent);
}

// function getFromBeersheets(): PlayersType {
//   // https://footballabsurdity.com/2022/06/27/2022-fantasy-football-salary-cap-values/
//   return Object.fromEntries(
//     Array.from(
//       document.getElementById("sheets-viewport")!.getElementsByTagName("tr")
//     )
//       .flatMap((tr, i) =>
//         Array.from(tr.children)
//           .filter((_, i) => i > 0)
//           .map((td) => td as HTMLElement)
//           .map((td, j) => ({ td: td.innerText, i, j }))
//       )
//       .map(({ td }) => td)
//       .reduce(
//         (prev, current) => {
//           if (parseInt(current)) return Object.assign({}, prev, { current });
//           if (prev.current)
//             return Object.assign({}, prev, {
//               current: null,
//               rank: parseInt(prev.current),
//               name: current.split(",")[0],
//             });
//           if (prev.name && current.includes("$"))
//             return {
//               players: (prev.players || []).concat({
//                 name: prev.name,
//                 salary: parseInt(current.split("$")[1]),
//               }),
//             };
//           return prev;
//         },
//         {} as {
//           players?: {
//             name: string;
//             salary: number;
//           }[];
//           current?: string;
//           name?: string;
//         }
//       )
//       .players!.sort((a, b) => (a.salary > b.salary ? -1 : 1))
//       .map((o) => [o.name, -o.salary])
//   );
// }

function getEspnLiveDraft() {
  const max_index = 6;
  const injured_only = false;
  // https://fantasy.espn.com/football/livedraftresults?leagueId=203836968
  const data = {
    players: {} as { [name: string]: { position: string; team: string } },
    pick: {} as { [name: string]: number },
    auction: {} as { [name: string]: number },
  };
  function helper(index: number) {
    if (index > max_index) {
      console.log(data);
      return;
    }
    function subHelper() {
      Array.from(document.getElementsByTagName("tr"))
        .map((tr) => tr)
        .map((tr) => ({
          name: tr.getElementsByClassName(
            "player-column__athlete"
          )[0] as HTMLElement,
          position: tr.getElementsByClassName(
            "player-column__position"
          )[0] as HTMLElement,
          pick: tr.getElementsByClassName("adp")[0] as HTMLElement,
          auction: tr.getElementsByClassName("avc")[0] as HTMLElement,
          injury: tr.getElementsByClassName(
            "playerinfo__injurystatus"
          )[0] as HTMLElement,
        }))
        .filter(({ name, pick, auction }) => name && pick && auction)
        .map(({ name, position, pick, auction, injury }) => ({
          name: (name.children[0] as HTMLElement).innerText,
          position: position.innerText.split("\n"),
          pick: parseFloat(pick.innerText),
          auction: parseFloat(auction.innerText),
          injury: injury?.innerText,
        }))
        .filter(({ injury }) => !injured_only || ["O", "IR"].includes(injury))
        .forEach(({ name, position, pick, auction }) => {
          data.players[name] = { position: position[1], team: position[0] };
          data.pick[name] = pick;
          data.auction[name] = auction;
        });
      helper(index + 1);
    }
    const clickable = Array.from(
      document.getElementsByClassName("Pagination__list__item__link")
    )
      .map((i) => i as HTMLElement)
      .find((i) => i.innerText === index.toString())!;
    if (clickable) {
      clickable.click();
      setTimeout(subHelper, 1000);
    } else {
      subHelper();
    }
  }
  helper(1);
}

function jayzheng() {
  Object.fromEntries(
    Array.from(
      document
        .getElementsByClassName("overall-rankings")[0]
        .getElementsByTagName("tr")
    )
      .map((tr) => tr.children[3] as HTMLElement)
      .map((tr, i) => [tr.innerText, i + 1])
  );
}

function updateDraftRanking(ordered: { [name: string]: number }) {
  fetch(
    "https://fantasy.espn.com/apis/v3/games/ffl/seasons/2023/segments/0/leagues/203836968?view=kona_player_info_edit_draft_strategy",
    {
      headers: {
        "x-fantasy-filter":
          '{"players":{"filterStatsForSplitTypeIds":{"value":[0]},"filterStatsForSourceIds":{"value":[1]},"filterStatsForExternalIds":{"value":[2023]},"sortDraftRanks":{"sortPriority":2,"sortAsc":true,"value":"STANDARD"},"sortPercOwned":{"sortPriority":3,"sortAsc":false},"filterRanksForSlotIds":{"value":[0,2,4,6,17,16]},"filterStatsForTopScoringPeriodIds":{"value":2,"additionalValue":["002023","102023","002022","022023"]}}}',
        "x-fantasy-platform":
          "kona-PROD-b8da8220a336fe39a7b677c0dc5fa27a6bbf87ae",
        "x-fantasy-source": "kona",
      },
      referrer:
        "https://fantasy.espn.com/football/editdraftstrategy?leagueId=203836968",
    }
  )
    .then((resp) => resp.json())
    .then(({ players }: { players: any[] }) =>
      players
        .map((p, i) => ({
          name: `${p.player.firstName} ${p.player.lastName}`,
          playerId: p.player.id,
          i,
        }))
        .map((p) => ({ ...p, order: ordered[p.name] }))
        .map((p) => ({
          ...p,
          rank: p.order === undefined ? p.i + players.length : p.order,
        }))
        .sort((a, b) => a.rank - b.rank)
        .map(({ playerId }) => ({ playerId }))
    )
    .then((players) =>
      JSON.stringify({
        draftStrategy: { excludedPlayerIds: [], draftList: players },
      })
    )
    .then((body) =>
      fetch(
        "https://lm-api-writes.fantasy.espn.com/apis/v3/games/ffl/seasons/2023/segments/0/leagues/203836968/teams/1",
        {
          headers: {
            accept: "application/json",
            "accept-language": "en-US,en;q=0.9",
            "content-type": "application/json",
            "sec-ch-ua":
              '".Not/A)Brand";v="99", "Google Chrome";v="103", "Chromium";v="103"',
            "sec-ch-ua-mobile": "?0",
            "sec-ch-ua-platform": '"macOS"',
            "sec-fetch-dest": "empty",
            "sec-fetch-mode": "cors",
            "sec-fetch-site": "same-site",
            "x-fantasy-platform":
              "kona-PROD-b8da8220a336fe39a7b677c0dc5fa27a6bbf87ae",
            "x-fantasy-source": "kona",
          },
          referrer: "https://fantasy.espn.com/",
          referrerPolicy: "strict-origin-when-cross-origin",
          body,
          method: "POST",
          mode: "cors",
          credentials: "include",
        }
      )
    )
    .then((resp) => alert(resp.ok));
}

export default Draft;
