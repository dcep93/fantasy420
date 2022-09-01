import { useState } from "react";
import { FirebaseWrapper } from "../../firebase";

import draft_json from "./draft.json";

const PICK_NUMBER = 5;
const NUM_TEAMS = 10;

type DraftType = string[];
type PlayersType = { [name: string]: number };
type FirebaseType = { name: string; rank: number }[];
type PType = { position: string; team: string };
type RPType = {
  name: string;
  nname: string;
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
  players: { [name: string]: PType };
  adp: PlayersType;
  avc: PlayersType;
  extra: { [source: string]: PlayersType };
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
    seen: espn[p.nname] !== undefined,
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
          <ul>
            {sources.map((s) => (
              <li
                key={s}
                onClick={() => update(s)}
                style={{
                  cursor: "pointer",
                  color: "blue",
                  textDecoration: "underline",
                }}
              >
                {s}
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
                    draft_json.players as {
                      [name: string]: { position: string };
                    }
                  )[normalize(name)]?.position
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
        <div>
          <div>beerSheets</div>
          <input readOnly value={printF(getFromBeersheets.toString())} />
        </div>
        <div>
          <div>jayzheng</div>
          <input readOnly value={printF(jayzheng.toString())} />
        </div>
        <div>
          <div>espn</div>
          <input readOnly value={printF(getEspnLiveDraft.toString())} />
        </div>
        <div>
          <div>updateDraftRanking</div>
          <input readOnly value={printF(updateDraftRanking.toString())} />
        </div>
        <div>
          <div>players</div>
          <input
            readOnly
            value={`updateDraftRanking(${JSON.stringify(
              Object.fromEntries(players.map((p, i) => [p.name, i]))
            )})`}
          />
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
                  <td>{v.value.toFixed(1)}</td>
                  <td
                    style={{
                      backgroundColor: {
                        "RUNNING BACKS": "lightblue",
                        "WIDE RECEIVERS": "lightseagreen",
                        "TIGHT ENDS": "lightcoral",
                        QUARTERBACKS: "purple",
                        DEFENSES: "lightsalmon",
                      }[v.position],
                    }}
                  >
                    {v.fname}, {v.team}
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

function normalize(s: string) {
  return s
    .replaceAll(/[^A-Za-z ]/g, "")
    .replaceAll(/ I+$/g, "")
    .replaceAll(/ jr$/gi, "");
}

function getScore(average: number, value: number): number {
  return (100 * (value - average)) / average;
}

function results(draft_json: DraftJsonType): ResultsType {
  draft_json.extra = Object.fromEntries(
    Object.entries(draft_json.extra).map(([s, ps]) => [
      s,
      Object.fromEntries(
        Object.entries(ps).map(([name, value]) => [normalize(name), value])
      ),
    ])
  );
  draft_json.players = Object.fromEntries(
    Object.entries(draft_json.players).map(([name, o]) => [normalize(name), o])
  );
  const ds = draft_json.drafts.map((d) => ({
    size: d.length,
    picks: Object.fromEntries(d.map((p, i) => [p, i])),
  }));
  const extra = Object.keys(draft_json.extra);
  const raw = Object.entries(draft_json.adp)
    .map(([name, adp]) => ({ name, adp, avc: draft_json.avc[name] || 1 }))
    .sort((a, b) => a.adp - b.adp)
    .map((o, i) => ({ ...o, nname: normalize(o.name), i }))
    .map((o) => ({
      ...o,
      picks: ds.map((d) =>
        d.picks[o.name] === undefined ? d.size : d.picks[o.name]
      ),
      extra: Object.fromEntries(
        extra.map((s) => [
          s,
          draft_json.extra[s][o.nname] ||
            Object.entries(draft_json.extra[s]).length + 1,
        ])
      ),
    }))
    .map((o) => ({
      ...o,
      d_adp: 1 + o.picks.reduce((a, b) => a + b, 0) / o.picks.length,
    }))
    .map((o) => ({
      ...o,
      d_adp_score: getScore(o.adp, o.d_adp),
      scores: Object.fromEntries(
        extra.map((s) => [
          s,
          getScore(o.extra[s] > 0 ? o.d_adp : o.avc, o.extra[s]),
        ])
      ),
    }))
    .map((o) => ({
      fname: `${[
        o.d_adp.toFixed(1),
        "",
        o.adp,
        `$${-o.avc}`,
        "",
        ...extra.map((s) => (o.extra[s] < 0 ? `$${-o.extra[s]}` : o.extra[s])),
      ].join("/")} ${o.name.substring(0, 20)}`,
      ...(o.name.includes("D/ST") ? { position: "DEFENSES" } : {}),
      ...o,
    }))
    .map((o) => ({ ...o, ...draft_json.players[o.nname] }));

  const values = [
    { source: "d_adp", players: raw.map((p) => ({ ...p, value: p.d_adp })) },
    // { source: "adp", players: raw.map((p) => ({ ...p, value: p.adp })) },
    // { source: "avc", players: raw.map((p) => ({ ...p, value: p.avc })) },
  ].concat(
    extra.map((source) => ({
      source,
      players: raw.map((p) => ({ ...p, value: p.extra[source] })),
    }))
  );

  const scores = [
    {
      source: "d_adp_score",
      players: raw.map((p) => ({ ...p, value: p.d_adp_score })),
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
                .find(({ name }) => name === p.nname)?.i!
          )
          .filter((rank) => rank !== undefined),
      }))
      .map(({ extra, ...p }) => ({
        ...p,
        value: extra.reduce((a, b) => a + b, extra.length) / extra.length,
      }))
      .filter((p) => p.value > 0),
  };

  return [composite]
    .concat(values)
    .concat(scores)
    .map(({ players, ...o }) => ({
      ...o,
      players: players.sort((a, b) => a.value - b.value),
    }));
}

export function printF(s: string): string {
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

export function getPlayersFromBeersheets() {
  return Object.fromEntries(
    Array.from(
      document.getElementById("sheets-viewport")!.getElementsByTagName("tr")
    )
      .flatMap((tr, i) =>
        Array.from(tr.children)
          .map((td) => td as HTMLElement)
          .map((td, j) => ({ td: td.innerText, i, j: j - 1 }))
      )
      .filter(({ td, j }) => [1, 5, 9].includes(j) && td && td !== "Player")
      .map((o) => ({ ...o, index: 100 * o.j + o.i, split: o.td.split(", ") }))
      .sort((a, b) => a.index - b.index)
      .reduce(
        (prev, { td, split }) => {
          if (!td.includes(",")) return { ...prev, position: td };
          return {
            ...prev,
            players: (prev.players || []).concat({
              name: split[0],
              team: split[1],
              position: prev.position!,
            }),
          };
        },
        {} as {
          players?: {
            name: string;
            team: string;
            position: string;
          }[];
          position?: string;
        }
      )
      .players!.map((o) => [o.name, { position: o.position, team: o.team }])
  );
}

function getFromBeersheets(): PlayersType {
  // https://footballabsurdity.com/2022/06/27/2022-fantasy-football-salary-cap-values/
  return Object.fromEntries(
    Array.from(
      document.getElementById("sheets-viewport")!.getElementsByTagName("tr")
    )
      .flatMap((tr, i) =>
        Array.from(tr.children)
          .filter((_, i) => i > 0)
          .map((td) => td as HTMLElement)
          .map((td, j) => ({ td: td.innerText, i, j }))
      )
      .map(({ td }) => td)
      .reduce(
        (prev, current) => {
          if (parseInt(current)) return Object.assign({}, prev, { current });
          if (prev.current)
            return Object.assign({}, prev, {
              current: null,
              rank: parseInt(prev.current),
              name: current.split(",")[0],
            });
          if (prev.name && current.includes("$"))
            return {
              players: (prev.players || []).concat({
                name: prev.name,
                salary: parseInt(current.split("$")[1]),
              }),
            };
          return prev;
        },
        {} as {
          players?: {
            name: string;
            salary: number;
          }[];
          current?: string;
          name?: string;
        }
      )
      .players!.sort((a, b) => (a.salary > b.salary ? -1 : 1))
      .map((o) => [o.name, -o.salary])
  );
}

function getEspnLiveDraft(max_index: number, injured_only: boolean) {
  // https://fantasy.espn.com/football/livedraftresults?leagueId=203836968
  const players = {
    adp: [] as [string, number][],
    avc: [] as [string, number][],
  };
  function helper(index: number) {
    if (index > max_index) {
      console.log({
        average_draft: Object.fromEntries(
          players.adp.sort((a, b) => a[1] - b[1])
        ),
        average_auction: Object.fromEntries(
          players.avc.sort((a, b) => a[1] - b[1])
        ),
      });
      return;
    }
    function subHelper() {
      Array.from(document.getElementsByTagName("tr"))
        .map((tr) => tr)
        .map((tr) => ({
          nameE: tr.getElementsByClassName(
            "player-column__athlete"
          )[0] as HTMLElement,
          adpE: tr.getElementsByClassName("adp")[0] as HTMLElement,
          avcE: tr.getElementsByClassName("avc")[0] as HTMLElement,
          injury: tr.getElementsByClassName(
            "playerinfo__injurystatus"
          )[0] as HTMLElement,
        }))
        .filter(({ nameE, adpE, avcE }) => nameE && adpE && avcE)
        .map(({ nameE, adpE, avcE, injury }) => ({
          name: (nameE.children[0] as HTMLElement).innerText,
          adp: parseFloat(adpE.innerText),
          avc: -parseFloat(avcE.innerText),
          injury: injury?.innerText,
        }))
        .filter(({ injury }) => !injured_only || ["O", "IR"].includes(injury))
        .forEach(({ name, adp, avc }) => {
          players.adp.push([name, adp]);
          players.avc.push([name, avc]);
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

function updateDraftRanking(ordered: { [name: string]: number }) {
  fetch(
    "https://fantasy.espn.com/apis/v3/games/ffl/seasons/2022/segments/0/leagues/203836968?view=kona_player_info_edit_draft_strategy",
    {
      headers: {
        "x-fantasy-filter":
          '{"players":{"filterStatsForSplitTypeIds":{"value":[0]},"filterStatsForSourceIds":{"value":[1]},"filterStatsForExternalIds":{"value":[2022]},"sortDraftRanks":{"sortPriority":2,"sortAsc":true,"value":"STANDARD"},"sortPercOwned":{"sortPriority":3,"sortAsc":false},"filterRanksForSlotIds":{"value":[0,2,4,6,17,16]},"filterStatsForTopScoringPeriodIds":{"value":2,"additionalValue":["002022","102022","002021","022022"]}}}',
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
        "https://lm-api-writes.fantasy.espn.com/apis/v3/games/ffl/seasons/2022/segments/0/leagues/203836968/teams/1",
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

export default Draft;
