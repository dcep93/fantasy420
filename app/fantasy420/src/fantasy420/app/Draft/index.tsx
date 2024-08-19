import { useEffect, useState } from "react";

import { printF } from "..";
import { fetchExtensionStorage } from "./Extension";

import { selectedYear } from "../Wrapped";
import draft2023 from "./2023.json";
import draft2024 from "./2024.json";

const allDrafts: { [year: string]: DraftJsonType } = {
  2023: draft2023,
  2024: draft2024,
};

export function selectedDraft(): DraftJsonType {
  return allDrafts[selectedYear];
}

const PICK_NUMBER = 8;
const NUM_TEAMS = 10;

export const MAX_PEAKED = 250;

const FETCH_LIVE_DRAFT_PERIOD_MS = 500;

type DraftType = string[];
export type PlayersType = { [name: string]: number };
type LiveDraftType = string[];
type PType = { position: string; team: string };
type RPType = {
  name: string;
  fname: string;
  value: number;
} & PType;
type ResultsType = {
  source: string;
  players: RPType[];
}[];
export type DraftJsonType = {
  history: DraftType[];
  extra: { [source: string]: PlayersType };
  espn: {
    players: { [name: string]: PType };
    pick: PlayersType;
    auction: PlayersType;
  };
};

export default function Draft() {
  const r = results(selectedDraft());
  const [liveDraft, updateLiveDraft] = useState<string[]>([]);
  useEffect(() => {
    fetchLiveDraft(updateLiveDraft, -1);
  }, []);
  return <SubDraft r={r} liveDraft={liveDraft} />;
}

function fetchLiveDraft(
  updateLiveDraft: (draft: string[]) => void,
  prev: number
) {
  fetchExtensionStorage("draft")
    .then((draft) =>
      Promise.resolve(draft)
        .then((draft) => {
          if (draft.length === prev) return;
          updateLiveDraft(draft);
        })
        .then(() =>
          setTimeout(
            () => fetchLiveDraft(updateLiveDraft, draft.length),
            FETCH_LIVE_DRAFT_PERIOD_MS
          )
        )
    )
    .catch((err) => {
      console.error(err);
    });
}

function getDstName(name: string) {
  const dstName = `${name.split(" ").reverse()[0]} DST`;
  return selectedDraft().espn.players[dstName] ? dstName : null;
}

function SubDraft(props: { r: ResultsType; liveDraft: LiveDraftType }) {
  const espn = Object.fromEntries(
    props.liveDraft
      .map((name) => {
        const dstName = getDstName(name);
        if (dstName) return dstName;
        return name;
      })
      .map((name, i) => [normalize(name), i])
  );
  const drafted = Object.keys(espn);
  const sources = props.r.map((d) => d.source);
  const [source, update] = useState(sources[0]);
  const players = (props.r.find((d) => d.source === source)?.players || []).map(
    (p) => ({
      ...p,
      seen: espn[p.name] !== undefined,
    })
  );
  return (
    <pre
      style={{
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "space-around",
        fontSize: "1.5em",
        height: "100vH",
      }}
    >
      <div style={{ height: "100%", overflow: "scroll" }}>
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
            Object.fromEntries(
              Object.entries(
                drafted
                  .map((name) => ({
                    name,
                    position: (
                      selectedDraft().espn.players as {
                        [n: string]: { position: string };
                      }
                    )[name]?.position,
                  }))
                  .reduce((prev, current) => {
                    prev[current.position] = (
                      prev[current.position] || []
                    ).concat(current.name);
                    return prev;
                  }, {} as { [position: string]: string[] })
              ).map(([position, names]) => [
                position,
                position === "undefined" ? names : names.length,
              ])
            ),
            null,
            2
          )}
        </pre>
        <div>
          <div>drafted</div>
          <input readOnly value={JSON.stringify(drafted)} />
        </div>
        <div>
          <div>
            <a href="https://jayzheng.com/ff/">jayzheng</a>
          </div>
          <input readOnly value={printF(jayzheng)} />
        </div>
        <div>
          <div>
            <a href="https://www.draftsharks.com/adp/superflex">draftsharks</a>
          </div>
          <input readOnly value={printF(draftsharks)} />
        </div>
        <div>
          <div>
            <a href="https://www.fantasypros.com/nfl/rankings/ppr-superflex-cheatsheets.php">
              fantasypros
            </a>
          </div>
          <input readOnly value={printF(fantasypros)} />
        </div>
        <div>
          <div>
            <a href="https://www.harrisfootball.com/top-160-ranks-draft">
              harrisfootball
            </a>
          </div>
          <input readOnly value={printF(harrisfootball)} />
        </div>
        <div>
          <div>
            <a href="https://app.fantasyplaybook.ai/customrankings">
              fantasyplaybook
            </a>
          </div>
          <input readOnly value={printF(fantasyplaybook)} />
        </div>
        <div>
          <div>
            <a href="https://fantasy.espn.com/football/livedraftresults">
              espn
            </a>
          </div>
          <input readOnly value={printF(getEspnLiveDraft)} />
        </div>
        <div>
          <div>updateDraftRanking</div>
          <div>
            <input readOnly value={printF(updateDraftRanking)} />
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
      <div style={{ height: "100%", overflow: "scroll" }}>
        <div style={{ height: "100%", flex: "1 1 auto" }}>
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
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
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
    .replaceAll(/[^A-Za-z0-9 ]/g, "")
    .replaceAll(/ I+$/g, "")
    .replaceAll(/ jr$/gi, "");
}

function getScore(average: number, value: number): number {
  return (100 * (value - average)) / (value + average);
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
      scores: Object.fromEntries(
        extra.map((s) => [
          s,
          getScore(o.extra[s] > 0 ? o.pick : o.auction, o.extra[s]),
        ])
      ),
    }))
    .map((o) => ({
      fname: `${[
        o.pick,
        `$${-o.auction}`,
        "",
        ...extra
          .map((s) => parseFloat(o.extra[s].toFixed(1)))
          .map((e) => (e < 0 ? `$${-e}` : e)),
      ].join("/")} ${o.name.substring(0, 20)}`,
      ...o,
    }))
    .map((o) => ({ ...o, ...draft_json.espn.players[o.name] }));

  const values = [
    { source: "espnpick", players: raw.map((p) => ({ ...p, value: p.pick })) },
    {
      source: "espnauction",
      players: raw.map((p) => ({ ...p, value: p.auction })),
    },
  ].concat(
    extra.map((source) => ({
      source,
      players: raw.map((p) => ({ ...p, value: p.extra[source] })),
    }))
  );

  const scores = extra.map((source) => ({
    source: `${source}_score`,
    players: raw.map((p) => ({ ...p, value: p.scores[source] })),
  }));

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
                .find(({ name }) => normalize(name) === normalize(p.name))?.i!
          )
          .filter((rank) => rank !== undefined),
      }))
      .map(({ extra, ...p }) => ({
        ...p,
        value:
          extra.length === 0
            ? raw.length
            : extra.reduce((a, b) => a + b, extra.length) / extra.length,
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

function getEspnLiveDraft(injured_only: boolean) {
  const max_index = 6;
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
          name: (name.children[0] as HTMLElement).innerText
            .split(") ")
            .reverse()[0],
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
      setTimeout(subHelper, 5000);
    } else {
      subHelper();
    }
  }
  helper(1);
}

function jayzheng() {
  return Object.fromEntries(
    Array.from(
      document
        .getElementsByClassName("overall-rankings")[0]
        .getElementsByTagName("tr")
    )
      .map((tr) => tr.children[3] as HTMLElement)
      .map((tr, i) => [tr.innerText, i + 1])
  );
}

function draftsharks() {
  return Object.fromEntries(
    Array.from(document.getElementById("adp-table")!.getElementsByTagName("tr"))
      .slice(1)
      .map((tr, i) => [
        (tr.getElementsByClassName("name")[0] as HTMLElement).innerText,
        i + 1,
      ])
  );
}

function fantasypros() {
  return Object.fromEntries(
    Array.from(
      document
        .getElementsByClassName("player-table")[0]
        .getElementsByClassName("player-row")
    )
      .map((tr) => tr.getElementsByTagName("a")[0] as HTMLElement)
      .filter((tr) => tr)
      .map((tr, i) => [tr.innerText, i + 1])
  );
}

function harrisfootball() {
  return Object.fromEntries(
    Array.from(
      Array.from(document.getElementsByTagName("table"))
        .find(
          (table) =>
            table.getElementsByTagName("tr")[0].innerText.trim() ===
            "PPR Scoring"
        )!
        .getElementsByTagName("tr")
    )
      .slice(1)
      .map((tr) => tr.children[1] as HTMLElement)
      .filter((td) => td)
      .map((td, i) => [td.innerText, i + 1])
  );
}

function fantasyplaybook() {
  return Object.fromEntries(
    Array.from(
      Array.from(document.getElementsByClassName("text-card-foreground"))
        .find(
          (e) => (e.children[0] as HTMLElement)?.innerText === "All Players"
        )
        ?.children[1]?.children[1]?.getElementsByClassName("items-center") || []
    ).map((e, i) => [
      (e.children[1] as HTMLElement)?.firstChild?.nodeValue,
      i + 1,
    ])
  );
}

function updateDraftRanking(ordered: { [name: string]: number } | undefined) {
  if (!ordered) return;
  const year = 2024;
  fetch(
    `https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/${year}/segments/0/leagues/203836968?view=kona_player_info_edit_draft_strategy`,
    {
      headers: {
        "x-fantasy-filter": `{"players":{"filterStatsForSplitTypeIds":{"value":[0]},"filterStatsForSourceIds":{"value":[1]},"filterStatsForExternalIds":{"value":[${year}]},"sortDraftRanks":{"sortPriority":2,"sortAsc":true,"value":"STANDARD"},"sortPercOwned":{"sortPriority":3,"sortAsc":false},"filterRanksForSlotIds":{"value":[0,2,4,6,17,16]},"filterStatsForTopScoringPeriodIds":{"value":2,"additionalValue":["002023","102023","002022","022023"]}}}`,
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
        `https://lm-api-writes.fantasy.espn.com/apis/v3/games/ffl/seasons/${year}/segments/0/leagues/203836968/teams/1`,
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

export function getPeakedValue(name: string, lines: string[]): number {
  const found = lines.find((line) => normalize(line).includes(normalize(name)));
  if (!found) return MAX_PEAKED;
  return parseInt(found.split(" ")[0]);
}
