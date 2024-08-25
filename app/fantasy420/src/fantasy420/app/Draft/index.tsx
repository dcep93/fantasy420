import { useEffect, useState } from "react";

import { printF } from "..";
import { fetchExtensionStorage } from "./Extension";

import { allWrapped, selectedWrapped, selectedYear } from "../Wrapped";
import draft2023 from "./2023.json";
import draft2024 from "./2024.json";

const allDrafts: { [year: string]: DraftJsonType } = Object.fromEntries(
  Object.entries({
    2023: draft2023,
    2024: draft2024,
  } as { [year: string]: DraftJsonType }).map(([year, rawDraft]) => {
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
    const normalizedNameToId = Object.fromEntries(
      Object.values(allWrapped[year].nflPlayers).map((p) => [
        normalize(p.name),
        p.id,
      ])
    );
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
              .map(({ playerId, value }) => [playerId, value])
          ),
        ])
      ),
    ];
  })
);

export function selectedDraft(): DraftJsonType {
  return allDrafts[selectedYear];
}

export type PlayersType = { [playerId: string]: number };
export type DraftJsonType = { [source: string]: PlayersType };

export default function Draft() {
  const [liveDraft, updateLiveDraft] = useState<string[]>([]);
  useEffect(() => {
    fetchLiveDraft(updateLiveDraft, -1);
  }, []);
  return <SubDraft liveDraft={liveDraft} />;
}

function fetchLiveDraft(
  updateLiveDraft: (draft: string[]) => void,
  prev: number
) {
  const FETCH_LIVE_DRAFT_PERIOD_MS = 500;
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

function SubDraft(props: { liveDraft: string[] }) {
  const playersByName = Object.fromEntries(
    Object.values(selectedWrapped().nflPlayers).map((p) => [p.name, p])
  );
  const draftedById = Object.fromEntries(
    props.liveDraft
      .map((playerName) => playersByName[playerName])
      .map((p, pickIndex) => [p.id, { pickIndex, ...p }])
  );
  const results = getResults();
  const sources = Object.keys(results);
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
                  {s}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          {source} ({props.liveDraft.length})
        </div>
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
          <div>drafted</div>
          <input readOnly value={JSON.stringify(props.liveDraft)} />
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
          <div>updateDraftRanking</div>
          <div>
            <input readOnly value={printF(updateDraftRanking)} />
          </div>
          <div>
            <input
              readOnly
              value={`${updateDraftRanking.name}(1, ${JSON.stringify(
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
      <div style={{ height: "100%", overflow: "scroll" }}>
        <div style={{ height: "100%", flex: "1 1 auto" }}>
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
                }))
                .map((v, i) => (
                  <tr
                    key={i}
                    style={{
                      backgroundColor: v.seen ? "lightgray" : "",
                    }}
                  >
                    <td>
                      {v.posRank + 1}/{v.i + 1}
                    </td>
                    <td>{v.value.toFixed(1)}</td>
                    <td
                      style={{
                        backgroundColor: {
                          RB: "lightblue",
                          WR: "lightseagreen",
                          TE: "lightcoral",
                          QB: "plum",
                          K: "tan",
                          "D/ST": "lightsalmon",
                        }[v.player.position],
                      }}
                    >
                      {[
                        ...Object.values(results).map((r) =>
                          parseFloat(r[v.playerId]?.toFixed(1))
                        ),
                      ].join("/")}{" "}
                      {v.player.name}, {v.player.position} {v.team}
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

function getScore(average: number, value: number): number {
  return (100 * (value - average)) / (value + average);
}

function getResults(): DraftJsonType {
  const draftJson = selectedDraft();
  return Object.fromEntries(
    Object.entries({
      composite: Object.values(selectedWrapped().nflPlayers)
        .map((p) => ({
          ...p,
          extra: Object.values(draftJson)
            .map(
              (d) =>
                Object.entries(d)
                  .map(([playerId, value]) => ({ playerId, value }))
                  .sort((a, b) => a.value - b.value)
                  .map(({ playerId }, rank) => ({ playerId, rank }))
                  .find(({ playerId }) => playerId === p.id)?.rank
            )
            .filter((rank) => rank !== undefined) as number[],
        }))
        .map(({ extra, ...p }) => ({
          ...p,
          value:
            extra.length === 0
              ? null
              : extra.reduce((a, b) => a + b, extra.length) / extra.length,
        })),
      espnpick: Object.values(selectedWrapped().nflPlayers).map((p) => ({
        ...p,
        value: p.ownership.averageDraftPosition,
      })),
      espnauction: Object.values(selectedWrapped().nflPlayers).map((p) => ({
        ...p,
        value: -p.ownership.auctionValueAverage,
      })),
      ...Object.fromEntries(
        Object.keys(draftJson).map((source) => [
          source,
          Object.values(selectedWrapped().nflPlayers).map((p) => ({
            ...p,
            value: draftJson[source][p.id],
          })),
        ])
      ),
      // ...Object.fromEntries(
      //   Object.keys(draftJson).map((source) => [
      //     `${source}_score`,
      //     Object.values(selectedWrapped().nflPlayers)
      //       .map((p) => ({ ...p, value: draftJson[source][p.id] }))
      //       .filter(({ value }) => value !== undefined)
      //       .map((p) => ({
      //         ...p,
      //         value: getScore(
      //           p.value > 0
      //             ? p.ownership.averageDraftPosition
      //             : p.ownership.auctionValueAverage,
      //           p.value
      //         ),
      //       })),
      //   ])
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
  const year = 2024;
  const leagueId = 203836968;
  fetch(
    `https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/${year}/segments/0/leagues/${leagueId}?view=kona_player_info_edit_draft_strategy`,
    {
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
