import { useEffect, useState } from "react";

import { printF } from "..";
import { fetchExtensionStorage, setExtensionStorage } from "./Extension";

import { useMemo } from "react";
import { WrappedType } from "../FetchWrapped";
import { selectedWrapped, selectedYear } from "../Wrapped";
import allWrapped from "../Wrapped/allWrapped";
import draft2023 from "./2023.json";
import draft2024 from "./2024.json";
import draft2025 from "./2025.json";
import draftKings from "./draftKings";

export const isDev = import.meta.env.DEV;

export const bubbleStyle = {
  backgroundColor: "white",
  display: "inline-block",
  borderRadius: "1em",
  border: "2px solid black",
  padding: "0.7em",
  margin: "0.5em",
};

export const POSITION_COLORS = {
  RB: "lightblue",
  WR: "lightseagreen",
  TE: "lightcoral",
  QB: "plum",
  K: "tan",
  "D/ST": "lightsalmon",
} as { [k: string]: string };

// 1. Neil
// 2. Heify
// 3. Jon
// 4. Chae
// 5. Bu
// 6. Ruifan
// 7. Dan
// 8. Dunc
// 9. Arzeno
// 10. Ahmed

const TEAMID_TO_PICK = Object.fromEntries(
  [3, 7, 6, 2, 5, 10, 1, 9, 8, 4].map((teamId, i) => [teamId, i + 1])
);

function getNormalizedNameToId(wrapped: WrappedType): {
  [name: string]: string;
} {
  return Object.fromEntries(
    Object.values(wrapped.nflPlayers).map((p) => [normalize(p.name), p.id])
  );
}

const allDrafts: { [year: string]: DraftJsonType } = Object.fromEntries(
  Object.entries({
    2023: draft2023,
    2024: draft2024,
    2025: draft2025,
  } as { [year: string]: DraftJsonType }).map(([year, rawDraft]) => {
    const normalizedNameToId =
      allWrapped[year] === undefined
        ? {}
        : getNormalizedNameToId(allWrapped[year]);
    return [
      year,
      Object.fromEntries(
        Object.entries(rawDraft).map(([name, players]) => [
          name,
          Object.fromEntries(
            Object.entries(players)
              .map(([name, value]) => ({
                playerId: normalizedNameToId[normalize(name)],
                value,
              }))
              .filter(({ playerId }) => playerId)
              .sort((a, b) => a.value - b.value)
              .map(({ playerId, value }) => [playerId, value])
          ),
        ])
      ),
    ];
  })
);

const MY_TEAM_ID = "1";

export function selectedDraft(): DraftJsonType {
  return allDrafts[selectedYear];
}

export type PlayersType = { [playerId: string]: number };
export type DraftJsonType = { [source: string]: PlayersType };

export default function Draft() {
  const [liveDraft, updateLiveDraft] = useState<string[]>([]);
  const [localDraft, updateLocalDraft] = useState<{ [key: string]: boolean }>(
    {}
  );
  const wrapped = allWrapped[selectedYear];
  const normalizedNameToId = getNormalizedNameToId(wrapped);
  useEffect(() => {
    fetchLiveDraft(updateLiveDraft, -1);
  }, []);
  return (
    <SubDraft
      liveDraft={liveDraft
        .map(normalize)
        .map((playerName) => normalizedNameToId[playerName])
        .map((playerId) => wrapped.nflPlayers[playerId].name)}
      localDraft={localDraft}
      updateLocalDraft={updateLocalDraft}
    />
  );
}

function SubDraft(props: {
  localDraft: { [key: string]: boolean };
  updateLocalDraft: (ld: { [key: string]: boolean }) => void;
  liveDraft: string[];
}) {
  const [regenSources, updateRegenSources] = useState(false);
  const playersByName = Object.fromEntries(
    Object.values(selectedWrapped().nflPlayers).map((p) => [p.name, p])
  );
  const draftedById = Object.fromEntries(
    props.liveDraft
      .map((playerName) => playersByName[playerName])
      .map((p, pickIndex) => [p.id, { pickIndex, ...p }])
  );

  const results = useMemo(getResults, [selectedYear]);
  const sources = Object.keys(results);
  const [positionFilter, updatePositionFilter] = useState("");
  const [byeWeekFilter, updateByeWeekFilter] = useState(-1);
  const [source, update] = useState(sources[0]);
  const sourcePlayers = Object.entries(results[source])
    .map(([playerId, value]) => ({
      playerId,
      player: selectedWrapped().nflPlayers[playerId],
      value,
      seen: draftedById[playerId] !== undefined,
    }))
    .filter(({ value }) => value !== undefined)
    .sort((a, b) => a.value - b.value)
    .map((p, sourceRank) => ({
      ...p,
      sourceRank,
      team: selectedWrapped().nflTeams[p.player.nflTeamId].name,
    }));

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
          <ul>
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
                  {s.replaceAll("_", "").length === 0 ? "" : s}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div onClick={() => updateRegenSources(!regenSources)}>
          {source} ({props.liveDraft.length})
        </div>
        {!regenSources ? null : (
          <div>
            <pre>
              {JSON.stringify(
                Object.fromEntries(
                  Object.entries(
                    Object.values(draftedById).reduce((prev, current) => {
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
              <div onClick={() => setExtensionStorage({ draft: "[]" })}>
                drafted
              </div>
              <input readOnly value={JSON.stringify(props.liveDraft)} />
            </div>
            <div>
              <div>
                <a href="https://www.draftsharks.com/adp/superflex">
                  draftsharks
                </a>
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
                <a href="https://subvertadown.com/tap-that-draft/d4905ade-ed76-4f26-b463-efe46cec9369">
                  tapthatdraft
                </a>
              </div>
              <input readOnly value={printF(tapThatDraft)} />
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
                <a href="https://jayzheng.com/ff/">jayzheng</a>
              </div>
              <input readOnly value={printF(jayzheng)} />
            </div>
            <div>
              <div>
                <a href="https://sportsbook.draftkings.com/leagues/football/nfl?category=player-futures">
                  draftKings
                </a>
              </div>
              <input readOnly value={printF(draftKings)} />
            </div>
            <div>
              <div>
                <a href="https://fantasy.espn.com/football/livedraftresults">
                  espn
                </a>
              </div>
              <input readOnly value={JSON.stringify(getEspnLiveDraft())} />
            </div>
            <div>
              <div>updateDraftRanking</div>
              <div>
                <input readOnly value={printF(updateDraftRanking)} />
              </div>
              <div>
                <input
                  readOnly
                  value={`${
                    updateDraftRanking.name
                  }(${MY_TEAM_ID}, ${JSON.stringify(
                    Object.fromEntries(
                      sourcePlayers.map(({ player, sourceRank }) => [
                        player.name,
                        sourceRank,
                      ])
                    )
                  )})`}
                />
              </div>
            </div>
          </div>
        )}
      </div>
      <div style={{ height: "100%", overflow: "scroll" }}>
        <div>
          <div>
            <div>position filter</div>
            <div>
              {["QB", "RB", "WR", "TE", "K", "DST"].map((p) => (
                <div
                  key={p}
                  style={{
                    ...bubbleStyle,
                    backgroundColor: positionFilter === p ? "grey" : undefined,
                  }}
                  onClick={() =>
                    updatePositionFilter(positionFilter === p ? "" : p)
                  }
                >
                  {p}
                </div>
              ))}
            </div>
          </div>
          <div>
            <div>bye week filter</div>
            <div>
              {Array.from(
                new Set(
                  Object.values(selectedWrapped().nflTeams).map(
                    (team) => team.byeWeek
                  )
                )
              )
                .sort((a, b) => a - b)
                .map((week) => (
                  <div
                    key={week}
                    style={{
                      ...bubbleStyle,
                      backgroundColor:
                        byeWeekFilter === week ? "grey" : undefined,
                    }}
                    onClick={() =>
                      updateByeWeekFilter(byeWeekFilter === week ? -1 : week)
                    }
                  >
                    {week}
                  </div>
                ))}
            </div>
          </div>
        </div>
        <div style={{ height: "100%", flex: "1 1 auto", maxWidth: "1000px" }}>
          <table>
            <tbody>
              {sourcePlayers
                .map((player, i) => ({
                  ...player,
                  i,
                  posRank: sourcePlayers
                    .slice(0, i)
                    .filter(
                      (prev, j) =>
                        prev.player.position === player.player.position
                    ).length,
                  byeWeek:
                    selectedWrapped().nflTeams[player.player.nflTeamId].byeWeek,
                }))
                .filter(
                  (v) =>
                    positionFilter === "" ||
                    v.player.position === positionFilter
                )
                .map((v) => ({
                  ...v,
                  seen:
                    props.localDraft[v.player.name] === undefined
                      ? v.seen
                      : props.localDraft[v.player.name],
                }))
                .map((v, i) => (
                  <tr
                    key={i}
                    style={{
                      backgroundColor: v.seen ? "gray" : "",
                    }}
                    onClick={() =>
                      props.updateLocalDraft(
                        Object.assign({}, props.localDraft, {
                          [v.player.name]: !v.seen,
                        })
                      )
                    }
                  >
                    <td
                      title={"index/posIndex/bye/byePick"}
                      style={{
                        backgroundColor:
                          v.byeWeek === byeWeekFilter ? "grey" : undefined,
                      }}
                    >
                      {v.i + 1}/{v.posRank + 1}/{v.byeWeek}/
                      {v.player.nflTeamId === "0"
                        ? "FA"
                        : ((teamIdVsBye) =>
                            teamIdVsBye === undefined
                              ? "p"
                              : TEAMID_TO_PICK[teamIdVsBye])(
                            selectedWrapped()
                              .ffMatchups[v.byeWeek]?.find((teamIds) =>
                                teamIds.includes(MY_TEAM_ID)
                              )!
                              .find((teamId) => teamId !== MY_TEAM_ID)
                          )}
                    </td>
                    {[
                      { key: "", value: v.player.name },
                      { key: "", value: `${v.player.position} ${v.team}` },
                      ...Object.entries(results)
                        .map(([key, value]) => ({ key, value }))
                        .map(({ key, value }) => ({
                          key,
                          value:
                            key.replaceAll("_", "").length === 0
                              ? null
                              : parseFloat(value[v.playerId]?.toFixed(1)),
                        }))
                        .map(({ key, value }) => ({
                          key,
                          value:
                            value === null
                              ? ""
                              : value < 0
                              ? `$${-value}`
                              : value.toString(),
                        })),
                    ].map((t, i) => (
                      <td
                        title={t.key}
                        key={i}
                        style={{
                          padding: "0 0.5em",
                          backgroundColor:
                            t.value.toString() === ""
                              ? "unset"
                              : t.value.toString() === "NaN"
                              ? "black"
                              : POSITION_COLORS[v.player.position],
                        }}
                      >
                        {t.value}
                      </td>
                    ))}
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </pre>
  );
}

// function getScore(
//   source: string,
//   playerId: string,
//   idToRankBySource: IdToRankBySource
// ): number | null {
//   const value = idToRankBySource[source][playerId].rank;
//   const average = source.startsWith("espn")
//     ? Object.entries(idToRankBySource)
//         .map(([s, ranks]) => ({ s, rank: ranks[playerId]?.rank }))
//         .find(({ s, rank }) => !s.startsWith("espn") && rank !== undefined)
//         ?.rank
//     : idToRankBySource.espnpick[playerId]?.rank ||
//       Object.keys(idToRankBySource.espnpick).length;
//   if (average === undefined) {
//     return null;
//   }
//   return (100 * (value - average)) / (1 + value + average);
// }

function getResults(): DraftJsonType {
  const playerIdToRanks = Object.entries(selectedDraft()).map(([k, d]) => ({
    size: Object.entries(d).length,
    playerIdToRank: Object.fromEntries(
      Object.entries(d)
        .map(([playerId, value]) => ({ playerId, value }))
        .sort((a, b) => a.value - b.value)
        .map(({ playerId }, rank) => [playerId, rank])
    ),
  }));
  return Object.fromEntries(
    Object.entries({
      composite: Object.values(selectedWrapped().nflPlayers)
        .map((p) => ({
          ...p,
          extra: playerIdToRanks
            .map(({ playerIdToRank, size }) => ({
              size,
              rank: playerIdToRank[p.id],
            }))
            .map(({ rank }) => rank)
            .filter((rank) => rank !== undefined),
        }))
        .map(({ extra, ...p }) => ({
          ...p,
          value:
            extra.length === 0
              ? null
              : extra.reduce((a, b) => a + b, extra.length) / extra.length,
        }))
        .filter(({ value }) => value !== null)
        .sort((a, b) => a.value! - b.value!)
        .map((p, rank) => ({ ...p, value: rank + 1 })),
      ...Object.fromEntries(
        Object.keys(selectedDraft()).map((source) => [
          source,
          Object.values(selectedWrapped().nflPlayers).map((p) => ({
            ...p,
            value:
              source.replaceAll("_", "").length === 0
                ? ""
                : selectedDraft()[source][p.id],
          })),
        ])
      ),
      // __: [],
      // ...Object.fromEntries(
      //   Object.keys(selectedDraft())
      //     .filter(
      //       (source) => source === "" || source.replaceAll("_", "").length !== 0
      //     )
      //     .map((source) => [
      //       source === "" ? "" : `${source}[score]`,
      //       Object.values(selectedWrapped().nflPlayers)
      //         .map((p) => ({ ...p, value: selectedDraft()[source][p.id] }))
      //         .filter(({ value }) => value !== undefined)
      //         .filter((p) => p.ownership.auctionValueAverage > 0.05)
      //         .map((p) => ({
      //           ...p,
      //           value: getScore(source, p.id, idToRankBySource),
      //         }))
      //         .filter(({ value }) => value !== null),
      //     ])
      // ),
    }).map(([sourceName, players]) => [
      sourceName,
      Object.fromEntries(
        players
          .map((p) => ({
            ...p,
            value: p.value === null ? players.length : p.value,
          }))
          .map((p) => [p.id, p.value])
      ),
    ])
  );
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
  return fetch("https://www.draftsharks.com/adp/superflex/ppr/sleeper/10")
    .then((resp) => resp.text())
    .then((text) => text.match(/<script>var vueAppData = (.*?);\n/)![1])
    .then((match) => JSON.parse(match))
    .then((t) => {
      console.log({ t });
      return t;
    })
    .then(
      (resp: {
        projections: {
          first_name: string;
          last_name: string;
          adps?: {
            [key: string]: {
              league_size: number;
              format_id: number;
              overall_pick_number: number;
            };
          };
        }[];
      }) =>
        resp.projections
          .map((p) => ({
            p,
            pick: Object.values(p.adps!).find(
              (o) => o.league_size === 10 && o.format_id === 12
            )?.overall_pick_number,
          }))
          .filter(({ pick }) => pick)
          .map(({ p, pick }) => [`${p.first_name} ${p.last_name}`, pick])
    )
    .then(Object.fromEntries)
    .then(console.log);
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

function tapThatDraft() {
  return Object.fromEntries(
    Array.from(Array.from(document.getElementsByTagName("tbody")[0].children))
      .map((tr) => Array.from(tr.children) as any as { innerText: string }[])
      .map((tr) => [
        tr[1].innerText.trim(),
        -parseInt(tr[tr.length - 1].innerText.split("$").pop()!),
      ])
      .filter((o) => o[1] !== 0)
  );
}

function getEspnLiveDraft() {
  return {
    espnpick: Object.fromEntries(
      Object.values(selectedWrapped().nflPlayers)
        .map((o) => ({ o, v: o.ownership?.averageDraftPosition || 0 }))
        .sort((a, b) => a.v - b.v)
        .map(({ o, v }) => [o.name, v])
    ),
    espnauction: Object.fromEntries(
      Object.values(selectedWrapped().nflPlayers)
        .map((o) => ({ o, v: -1 * (o.ownership?.auctionValueAverage || 0) }))
        .sort((a, b) => a.v - b.v)
        .map(({ o, v }) => [o.name, v])
    ),
  };
}

function updateDraftRanking(
  teamId: number,
  ordered: { [name: string]: number }
) {
  if (!teamId || !ordered) {
    alert(
      "updateDraftRanking(teamId: number, ordered: {[playerName: string]: integer})"
    );
    return;
  }
  const year = 2025;
  const leagueId = 203836968;
  fetch(
    `https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/${year}/segments/0/leagues/${leagueId}?view=kona_player_info_edit_draft_strategy`,
    {
      credentials: "include",
      headers: {
        "x-fantasy-filter": `{"players":{"filterStatsForSplitTypeIds":{"value":[0]},"filterStatsForSourceIds":{"value":[1]},"filterStatsForExternalIds":{"value":[${year}]},"sortDraftRanks":{"sortPriority":2,"sortAsc":true,"value":"STANDARD"},"sortPercOwned":{"sortPriority":3,"sortAsc":false},"filterRanksForSlotIds":{"value":[0,2,4,6,17,16]},"filterStatsForTopScoringPeriodIds":{"value":2,"additionalValue":["002023","102023","002022","022023"]}}}`,
        "x-fantasy-platform":
          "kona-PROD-b8da8220a336fe39a7b677c0dc5fa27a6bbf87ae",
        "x-fantasy-source": "kona",
      },
      referrer: `https://fantasy.espn.com/football/editdraftstrategy?leagueId=${leagueId}`,
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
        `https://lm-api-writes.fantasy.espn.com/apis/v3/games/ffl/seasons/${year}/segments/0/leagues/${leagueId}/teams/${teamId}`,
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

function fetchLiveDraft(
  updateLiveDraft: (draft: string[]) => void,
  prev: number
) {
  const FETCH_LIVE_DRAFT_PERIOD_MS = 500;
  fetchExtensionStorage("draft")
    .then(
      (draftStr) =>
        draftStr &&
        Promise.resolve(draftStr).then((draft) =>
          Promise.resolve()
            .then(() => {
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
    )
    .catch((err) => {
      console.error(err);
    });
}

function normalize(name: string): string {
  return name
    .toLocaleLowerCase()
    .replaceAll(/[^A-Za-z0-9 ]/g, "")
    .replaceAll(/ i+$/g, "")
    .replaceAll(/gabriel davis$/gi, "gabe davis")
    .replaceAll(/hollywood brown$/gi, "marquise brown")
    .replaceAll(/nathaniel dell$/gi, "tank dell")
    .replaceAll(/ sr$/gi, "")
    .replaceAll(/ jr$/gi, "");
}
