import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import { printF } from "..";
import { fetchExtensionStorage, setExtensionStorage } from "./Extension";

import { WrappedType } from "../FetchWrapped";
import { selectedWrapped, selectedYear } from "../Wrapped";
import allWrapped from "../Wrapped/allWrapped";
import draft2023 from "./2023.json";
import draft2024 from "./2024.json";
import draft2025 from "./2025.json";
import draft2026 from "./2026.json";
import getFormatAwareRankings, { getSourceLabel } from "./composite";
import draftKings from "./draftKings";
import { MockDraftPanel, MockDraftSetup } from "./MockDraftView";
import {
  advanceToUserTurn,
  getDraftLength,
  getPickOwner,
  makeUserPick,
  MockDraftState,
  nudgeHistoricalPick,
} from "./mockDraft";
import {
  readMockDraftHash,
  replaceMockDraftHash,
} from "./mockDraftHash";
import { POSITION_COLORS } from "./positionColors";
import { getRookiePlayerIds, normalizeDraftPlayerName } from "./rookies";

export { POSITION_COLORS } from "./positionColors";

export const isDev = import.meta.env.DEV;

export const bubbleStyle = {
  backgroundColor: "white",
  display: "inline-block",
  borderRadius: "1em",
  border: "2px solid black",
  padding: "0.7em",
  margin: "0.5em",
};

function getDraftPick(teamId: string | undefined): number | "p" {
  const pickOrder = teamId
    ? selectedWrapped().ffTeams[teamId]?.pickOrder
    : undefined;
  return pickOrder === undefined ? "p" : pickOrder + 1;
}

function getNormalizedNameToId(wrapped: WrappedType): {
  [name: string]: string;
} {
  return Object.fromEntries(
    Object.values(wrapped.nflPlayers).map((p) => [
      normalizeDraftPlayerName(p.name),
      p.id,
    ])
  );
}

const rawDrafts: { [year: string]: DraftJsonType } = {
  2023: draft2023,
  2024: draft2024,
  2025: draft2025,
  2026: draft2026,
};

const allDrafts: { [year: string]: DraftJsonType } = Object.fromEntries(
  Object.entries(rawDrafts).map(([year, rawDraft]) => {
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
                playerId: normalizedNameToId[normalizeDraftPlayerName(name)],
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
  return <SubDraft />;
}

function SubDraft() {
  const [localDraft, updateLocalDraft] = useState<{ [key: string]: boolean }>(
    {}
  );
  const wrapped = allWrapped[selectedYear];
  const playerScrollRef = useRef<HTMLDivElement>(null);
  const [mockDraft, setMockDraft] = useState<MockDraftState | null>(() => {
    try {
      return readMockDraftHash();
    } catch {
      return null;
    }
  });
  const [mockDraftError, setMockDraftError] = useState(() => {
    try {
      readMockDraftHash();
      return "";
    } catch (error) {
      return error instanceof Error ? error.message : String(error);
    }
  });
  const liveDraft = useLiveDraft(mockDraft === null);
  const normalizedNameToId = useMemo(
    () => getNormalizedNameToId(wrapped),
    [wrapped]
  );
  const matchedLiveDraft = useMemo(
    () =>
      liveDraft.flatMap((sourceName) => {
        const playerId = normalizedNameToId[
          normalizeDraftPlayerName(sourceName)
        ];
        const player = wrapped.nflPlayers[playerId];
        if (!player) {
          console.warn("Unmatched live draft player", sourceName);
          return [];
        }
        return [player.name];
      }),
    [liveDraft, normalizedNameToId, wrapped]
  );
  const [regenSources, updateRegenSources] = useState(false);
  const playersByName = Object.fromEntries(
    Object.values(selectedWrapped().nflPlayers).map((p) => [p.name, p])
  );

  const { rankings: results } = useMemo(getResults, [selectedYear]);
  const rookiePlayerIds = useMemo(
    () =>
      getRookiePlayerIds(
        selectedWrapped().nflPlayers,
        rawDrafts[String(Number(selectedYear) - 1)]
      ),
    [selectedYear]
  );
  const sources = Object.keys(results);
  const [positionFilter, updatePositionFilter] = useState("");
  const [rookiesOnly, updateRookiesOnly] = useState(false);
  const [byeWeekFilter, updateByeWeekFilter] = useState(-1);
  const [source, update] = useState(sources[0]);
  const orderedRanking = useMemo(
    () =>
      Object.entries(results[source])
        .filter(
          ([playerId, value]) =>
            value !== undefined && wrapped.nflPlayers[playerId] !== undefined
        )
        .sort((a, b) => a[1] - b[1] || a[0].localeCompare(b[0]))
        .map(([playerId]) => playerId),
    [results, source, wrapped]
  );
  const mockPlayersById = useMemo(
    () =>
      Object.fromEntries(
        Object.values(wrapped.nflPlayers).map((player) => [
          player.id,
          {
            id: player.id,
            name: player.name,
            position: player.position,
            byeWeek: wrapped.nflTeams[player.nflTeamId]?.byeWeek ?? 0,
            rookie: rookiePlayerIds.has(player.id),
          },
        ])
      ),
    [rookiePlayerIds, wrapped]
  );
  const activeDraftPlayerIds = mockDraft
    ? mockDraft.picks
    : matchedLiveDraft.flatMap((playerName) => {
        const player = playersByName[playerName];
        return player ? [player.id] : [];
      });
  const draftedById = Object.fromEntries(
    activeDraftPlayerIds.flatMap((playerId, pickIndex) => {
      const player = wrapped.nflPlayers[playerId];
      return player ? [[playerId, { pickIndex, ...player }]] : [];
    })
  );

  useEffect(() => {
    function loadHash() {
      try {
        const loaded = readMockDraftHash();
        if (
          loaded &&
          loaded.picks.some((playerId) => wrapped.nflPlayers[playerId] === undefined)
        ) {
          throw new Error("Mock draft URL contains an unknown ESPN player id");
        }
        setMockDraftError("");
        setMockDraft(loaded);
      } catch (error) {
        setMockDraft(null);
        setMockDraftError(error instanceof Error ? error.message : String(error));
      }
    }
    window.addEventListener("hashchange", loadHash);
    return () => window.removeEventListener("hashchange", loadHash);
  }, [wrapped]);

  useEffect(() => {
    if (
      mockDraft &&
      mockDraft.picks.some((playerId) => wrapped.nflPlayers[playerId] === undefined)
    ) {
      setMockDraft(null);
      setMockDraftError("Mock draft URL contains an unknown ESPN player id");
    }
  }, [mockDraft, wrapped]);

  function saveMockDraft(next: MockDraftState) {
    setMockDraft(next);
    setMockDraftError("");
    replaceMockDraftHash(next);
  }

  const sourcePlayers = Object.entries(results[source])
    .map(([playerId, value]) => ({
      playerId,
      player: selectedWrapped().nflPlayers[playerId],
      value,
      seen: draftedById[playerId] !== undefined,
      rookie: rookiePlayerIds.has(playerId),
    }))
    .filter(({ value }) => value !== undefined)
    .sort((a, b) => a.value - b.value)
    .map((p, sourceRank) => ({
      ...p,
      sourceRank,
      team: selectedWrapped().nflTeams[p.player.nflTeamId].name,
    }));

  useLayoutEffect(() => {
    if (!mockDraft || mockDraft.picks.length >= getDraftLength(mockDraft.settings)) {
      return;
    }
    const owner = getPickOwner(
      mockDraft.picks.length,
      mockDraft.settings.teamCount
    );
    if (owner.draftPosition !== mockDraft.settings.draftPosition) return;

    document
      .querySelector<HTMLElement>('[data-mock-latest-round="true"]')
      ?.scrollIntoView?.({ block: "start" });
    const firstAvailable = playerScrollRef.current?.querySelector<HTMLElement>(
      'tr[data-mock-available="true"]'
    );
    if (firstAvailable && playerScrollRef.current) {
      playerScrollRef.current.scrollTop = firstAvailable.offsetTop;
    }
  }, [mockDraft, positionFilter, rookiesOnly, source]);

  return (
    <>
      <MockDraftSetup
        activeSettings={mockDraft?.settings}
        onStart={(settings) =>
          saveMockDraft(
            advanceToUserTurn(
              { settings, picks: [] },
              mockPlayersById,
              orderedRanking
            )
          )
        }
      />
      {mockDraft ? (
        <MockDraftPanel
          state={mockDraft}
          playersById={mockPlayersById}
          orderedRanking={orderedRanking}
          onNudge={(pickIndex, direction) =>
            saveMockDraft(
              nudgeHistoricalPick(
                mockDraft,
                pickIndex,
                direction,
                mockPlayersById,
                orderedRanking
              )
            )
          }
        />
      ) : null}
      {mockDraftError ? (
        <div className="mock-draft-load-error">{mockDraftError}</div>
      ) : null}
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
                  {getSourceLabel(s)}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div onClick={() => updateRegenSources(!regenSources)}>
          {getSourceLabel(source)} ({activeDraftPlayerIds.length})
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
            {!mockDraft ? (
              <div>
                <div onClick={() => setExtensionStorage({ draft: "[]" })}>
                  drafted
                </div>
                <input
                  readOnly
                  value={JSON.stringify(
                    activeDraftPlayerIds.map(
                      (playerId) => wrapped.nflPlayers[playerId]?.name
                    )
                  )}
                />
              </div>
            ) : null}
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
      <div
        ref={playerScrollRef}
        data-testid="mock-draft-player-scroller"
        style={{ height: "100%", overflow: "scroll" }}
      >
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
              <div
                title="rookies only"
                aria-label="rookies only"
                aria-pressed={rookiesOnly}
                role="button"
                style={{
                  ...bubbleStyle,
                  backgroundColor: rookiesOnly ? "grey" : undefined,
                  cursor: "pointer",
                }}
                onClick={() => updateRookiesOnly(!rookiesOnly)}
              >
                *
              </div>
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
                .filter((v) => !rookiesOnly || v.rookie)
                .map((v) => ({
                  ...v,
                  seen:
                    localDraft[v.player.name] === undefined
                      ? v.seen
                      : localDraft[v.player.name],
                }))
                .map((v, i) => (
                  <tr
                    key={i}
                    data-mock-available={mockDraft ? String(!v.seen) : undefined}
                    style={{
                      backgroundColor: v.seen ? "gray" : "",
                    }}
                    onClick={() => {
                      if (mockDraft) {
                        const next = makeUserPick(
                          mockDraft,
                          v.playerId,
                          mockPlayersById,
                          orderedRanking
                        );
                        if (next !== mockDraft) saveMockDraft(next);
                        return;
                      }
                      updateLocalDraft(
                        Object.assign({}, localDraft, {
                          [v.player.name]: !v.seen,
                        })
                      );
                    }}
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
                        : getDraftPick(
                            selectedWrapped()
                              .ffMatchups[v.byeWeek]?.find((teamIds) =>
                                teamIds.includes(MY_TEAM_ID)
                              )!
                              .find((teamId) => teamId !== MY_TEAM_ID)
                          )}
                    </td>
                    {[
                      {
                        key: "",
                        value: `${v.rookie ? "*" : ""}${v.player.name}`,
                      },
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
    </>
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

function getResults(): {
  rankings: DraftJsonType;
  adjustedSources: Set<string>;
} {
  const players = Object.values(selectedWrapped().nflPlayers);
  const formatAware = getFormatAwareRankings(
    selectedDraft(),
    players.map((player) => player.id),
    Object.fromEntries(players.map((player) => [player.id, player.position]))
  );
  const rankings = Object.fromEntries(
    Object.entries({
      composite: players.map((player) => ({
        ...player,
        value: formatAware.composite[player.id],
      })),
      ...Object.fromEntries(
        Object.keys(selectedDraft()).map((source) => [
          source,
          players.map((player) => ({
            ...player,
            value:
              source.replaceAll("_", "").length === 0
                ? ""
                : formatAware.sources[source][player.id],
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
  return { rankings, adjustedSources: formatAware.adjustedSources };
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
  const year = selectedYear;
  const leagueId = 203836968;
  fetch(
    `https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/${year}/segments/0/leagues/${leagueId}?view=kona_player_info_edit_draft_strategy`,
    {
      credentials: "include",
      headers: {
        "x-fantasy-filter": `{"players":{"filterStatsForSplitTypeIds":{"value":[0]},"filterStatsForSourceIds":{"value":[1]},"filterStatsForExternalIds":{"value":[${year}]},"sortDraftRanks":{"sortPriority":2,"sortAsc":true,"value":"STANDARD"},"sortPercOwned":{"sortPriority":3,"sortAsc":false},"filterRanksForSlotIds":{"value":[0,2,4,6,17,16]},"filterStatsForTopScoringPeriodIds":{"value":2,"additionalValue":["00${year}","10${year}"]}}}`,
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

export function useLiveDraft(enabled = true): string[] {
  const FETCH_LIVE_DRAFT_PERIOD_MS = 500;
  const [liveDraft, updateLiveDraft] = useState<string[]>([]);

  useEffect(() => {
    if (!enabled) {
      updateLiveDraft([]);
      return;
    }
    let active = true;
    let previousDraftJson: string | null = null;
    let timeoutId: number | undefined;

    async function pollLiveDraft() {
      try {
        const draft = await fetchExtensionStorage("draft");
        if (!Array.isArray(draft)) return;

        const validDraft = draft.filter(
          (playerName): playerName is string => typeof playerName === "string"
        );
        const draftJson = JSON.stringify(validDraft);
        if (active && draftJson !== previousDraftJson) {
          previousDraftJson = draftJson;
          updateLiveDraft(validDraft);
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (active) {
          timeoutId = window.setTimeout(
            pollLiveDraft,
            FETCH_LIVE_DRAFT_PERIOD_MS
          );
        }
      }
    }

    pollLiveDraft();
    return () => {
      active = false;
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
    };
  }, [enabled]);

  return liveDraft;
}
