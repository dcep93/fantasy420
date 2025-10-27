import { useEffect, useState } from "react";
import { printF } from "..";
import { fetchExtension } from "../Draft/Extension";
import { clog, currentYear, groupByF, selectedWrapped } from "../Wrapped";
import helper, { default as first2knowF, HelperType } from "./helper";

export type NFLPlayerType = {
  id: string;
  name: string;
  nflTeamId: string;
  position: string;
  scores: { [weekNum: string]: number };
  projection: number;
  total: number;
  average: number;
  injuryStatus?: string;
  ownership?: Ownership;
};

export type Ownership = {
  averageDraftPosition: number;
  auctionValueAverage: number;
  percentOwned: number;
};

export type NFLTeamType = {
  id: string;
  name: string;
  byeWeek: number;
  nflGamesByScoringPeriod: {
    [weekNum: string]:
      | {
          opp?: string;
          fieldGoals: (number | null)[];
          pointsAllowed: number;
          yardsAllowed: number;
          drives?: (string | null)[];
          punts: { landed: number; distance: number }[];
          punter: string;
        }
      | undefined;
  };
};

export type FFTeamType = {
  id: string;
  name: string;
  rosters: {
    [weekNum: string]: {
      weekNum: string;
      starting: string[];
      rostered: string[];
      projections: { [playerId: string]: number };
    };
  };
  draft: { playerId: number; pickIndex: number }[];
  pickOrder?: number;
};

export type MatchupsType = string[][];

export type FantasyCalcHistoryType = {
  date: number;
  values: { [teamId: string]: number };
}[];

export type WrappedType = {
  year: string;
  latestScoringPeriod?: number;
  nflPlayers: {
    [id: string]: NFLPlayerType;
  };
  nflTeams: {
    [id: string]: NFLTeamType;
  };
  ffTeams: {
    [id: string]: FFTeamType;
  };
  ffMatchups: { [weekNum: string]: MatchupsType };
  fantasyCalc?: {
    timestamp: number;
    history: FantasyCalcHistoryType;
    players: { [espnId: string]: number };
  };
};

var initialized = false;
export default function FetchWrapped() {
  const [wrapped, update] = useState("fetching...");
  useEffect(() => {
    if (initialized) return;
    initialized = true;
    getWrapped(currentYear)
      .then((wrapped) => JSON.stringify(wrapped))
      .then(update)
      .catch((e: Error) => {
        console.error(e);
        update(e.toString());
      });
  }, [update]);
  return (
    <div>
      <pre style={{ whiteSpace: "pre-wrap", fontSize: "xx-small" }}>
        {printF(first2knowF, [currentYear])}
      </pre>
      <pre style={{ whiteSpace: "pre-wrap" }}>{wrapped}</pre>
    </div>
  );
}

export function getWrapped(providedYear: string): Promise<WrappedType> {
  const leagueId = 203836968;
  return Promise.resolve()
    .then(() =>
      helper({
        currentYear: providedYear,
        leagueId,
        fetchF: (url, options) =>
          fetchExtension({
            url,
            options: {
              ...options,
              // Cookie: localStorage.getItem("cookie:espn_s2"),
            },
            ...options,
          }),
      })
    )
    .then((h: HelperType) => [
      // year
      Promise.resolve().then(() => h.year),
      // latestScoringPeriod
      Promise.resolve(h.latestScoringPeriod),
      // nflPlayers
      Promise.resolve(h.nflPlayers),
      // ffTeams
      Promise.resolve(h.ffTeams),
      // ffMatchups
      Promise.resolve(h.ffMatchups),
      // nflTeams
      Promise.resolve(h.nflTeamsSource)
        .then(({ main, playerCards }) =>
          Promise.resolve()
            .then(() =>
              main.settings.proTeams.map((p) => ({
                id: p.id.toString(),
                name: p.name,
                byeWeek: p.byeWeek,
                proGamesByScoringPeriod: fromEntries(
                  Object.entries(p.proGamesByScoringPeriod)
                    .filter(
                      ([_, o]) =>
                        providedYear < currentYear || o[0].statsOfficial
                    )
                    .map(([scoringPeriod, o]) => ({
                      key: scoringPeriod,
                      value: o[0].id,
                    }))
                ),
              }))
            )
            .then((nflTeams) =>
              Promise.resolve()
                .then(() =>
                  nflTeams.flatMap((team) =>
                    Object.values(team.proGamesByScoringPeriod)
                  )
                )
                .then((gameIds) =>
                  Object.keys(
                    fromEntries(
                      gameIds.map((gameId) => ({
                        key: gameId.toString(),
                        value: true,
                      }))
                    )
                  )
                )
                .then((gameIds) =>
                  gameIds.map((gameId) =>
                    fetchExtension({
                      url: `https://www.espn.com/nfl/playbyplay/_/gameId/${gameId}`,
                      json: false,
                      maxAgeMs: 1000 * 60 * 60 * 24 * 30,
                    })
                      .then(
                        (resp) =>
                          resp.match(
                            /window\['__espnfitt__'\]=(.*?);<\/script>/
                          )[1]
                      )
                      .then((resp) => JSON.parse(resp))
                      .then(
                        (resp: {
                          page: {
                            content: {
                              gamepackage: {
                                pbp: {
                                  scoringPlaysData: {
                                    items: {
                                      teamId: string;
                                      playTitle: string;
                                      playText: string;
                                    }[];
                                  }[];
                                  allPlaysData: {
                                    items: {
                                      teamName: string;
                                      headline: string;
                                      plays: { description: string }[];
                                    }[];
                                  }[];
                                };
                                prsdTms: {
                                  [key: string]: {
                                    id: string;
                                    displayName: string;
                                  };
                                };
                              };
                            };
                          };
                        }) => ({
                          fieldGoals:
                            resp.page.content.gamepackage.pbp.scoringPlaysData
                              .flatMap(({ items }) => items)
                              .filter((item) => item.playTitle === "Field Goal")
                              .map((item) => ({
                                teamId: item.teamId,
                                yards: parseInt(
                                  item.playText.match(
                                    /(\d+) (?:yard|yrd|yd) field goal/i
                                  )?.[1]!
                                ),
                              }))
                              .filter(({ yards }) => yards),
                          punts: groupByF(
                            resp.page.content.gamepackage.pbp.allPlaysData
                              .flatMap(({ items }) => items)
                              .filter((p) => p.headline === "Punt")
                              .map((p) => ({
                                teamId: Object.values(
                                  resp.page.content.gamepackage.prsdTms
                                ).find((t) => t.displayName === p.teamName)!.id,
                                punt: (p.plays || [])
                                  .map(
                                    (p) =>
                                      p.description.match(
                                        /(\S*) punts (\d+) yards? to \S+ (\d+)?/
                                      )
                                    // sometimes, like in
                                    // https://www.espn.com/nfl/playbyplay/_/gameId/401547427 @ (7:51 - 3rd)
                                    // espn mislabels a drive with the punt going to the other team
                                  )
                                  .find((p) => p)!,
                              }))
                              .filter((p) => p.punt?.[0])
                              .map((p) => ({
                                ...p,
                                landed: !p.punt[3] ? 0 : parseInt(p.punt[3]),
                                punter: p.punt[1],
                                distance: parseInt(p.punt[2]),
                              })),
                            (p) => p.teamId
                          ),
                          drives: Object.fromEntries(
                            Object.values(
                              resp.page.content.gamepackage.prsdTms
                            ).map(({ id, displayName }) => [
                              id,
                              resp.page.content.gamepackage.pbp.allPlaysData
                                .flatMap(({ items }) => items)
                                .filter((p) => p.teamName === displayName)
                                .map((drive) => drive.headline),
                            ])
                          ),
                        })
                      )
                      .catch((err) => {
                        console.log(`could not fetch gameId ${gameId}`);
                        console.error(err);
                        return undefined;
                      })
                      .then((value) => ({
                        key: gameId.toString(),
                        value: value!,
                      }))
                  )
                )
                .then((ps) => Promise.all(ps))
                .then((gamesByGameId) => fromEntries(gamesByGameId))
                .then((gamesByGameId) =>
                  Promise.resolve()
                    .then(() =>
                      Object.keys(
                        fromEntries(
                          playerCards.players
                            .filter((p) => p.player.stats)
                            .flatMap((player) => player.player.stats)
                            .map((s) => ({
                              key: s.scoringPeriodId.toString(),
                              value: true,
                            }))
                        )
                      ).map((scoringPeriodId) => ({
                        key: scoringPeriodId.toString(),
                        value: fromEntries(
                          playerCards.players
                            .filter((p) => p.player.stats)
                            .filter((p) => p.player.id < 0)
                            .map((player) => ({
                              teamId: player.player.proTeamId,
                              stats: player.player.stats.find(
                                (s) =>
                                  s.scoringPeriodId.toString() ===
                                  scoringPeriodId
                              )?.stats,
                            }))
                            .map(({ teamId, stats }) =>
                              stats === undefined
                                ? undefined
                                : {
                                    key: teamId.toString(),
                                    value: {
                                      yardsAllowed: stats["127"] || 0,
                                      pointsAllowed: stats["187"] || 0,
                                    },
                                  }
                            )
                        ),
                      }))
                    )
                    .then((defensesByScoringPeriod) =>
                      fromEntries(defensesByScoringPeriod)
                    )
                    .then((defensesByScoringPeriod) =>
                      nflTeams
                        .map(({ proGamesByScoringPeriod, ...team }) => ({
                          ...team,
                          nflGamesByScoringPeriod: fromEntries(
                            Object.entries(proGamesByScoringPeriod)
                              .filter(
                                ([scoringPeriod]) =>
                                  defensesByScoringPeriod[scoringPeriod] !==
                                  undefined
                              )
                              .map(([scoringPeriod, gameId]) => ({
                                key: scoringPeriod,
                                value: {
                                  opp: Object.keys(
                                    gamesByGameId[gameId]?.drives || {}
                                  ).find((t) => t !== team.id)!,
                                  drives:
                                    gamesByGameId[gameId]?.drives[team.id],
                                  fieldGoals: (
                                    gamesByGameId[gameId]?.fieldGoals || []
                                  )
                                    .filter((play) => play.teamId === team.id)
                                    .map((play) => play.yards),
                                  punts: (
                                    gamesByGameId[gameId]?.punts[team.id] || []
                                  ).flatMap((play) => ({
                                    landed: play.landed,
                                    distance: play.distance,
                                  })),
                                  punter: Object.keys(
                                    groupByF(
                                      gamesByGameId[gameId]?.punts[team.id] ||
                                        [],
                                      (p) => p.punter
                                    )
                                  ).join(","),
                                  ...defensesByScoringPeriod[scoringPeriod][
                                    team.id
                                  ],
                                },
                              }))
                          ),
                        }))
                        .map((team) => ({ key: team.id, value: team }))
                    )
                )
                .then((nflTeams) => fromEntries(nflTeams))
            )
        )
        .then((nflTeams: { [nflTeamId: string]: NFLTeamType }) => nflTeams),
      // fantasyCalc
      Promise.resolve()
        .then(() =>
          fetch(
            "https://api.fantasycalc.com/values/current?isDynasty=false&numQbs=2&numTeams=10&ppr=1&includeAdp=false"
          )
            .then((resp) => resp.json())
            .then(
              (
                resp: {
                  redraftValue: number;
                  player: { name: string; espnId: number };
                }[]
              ) =>
                Object.fromEntries(
                  resp.map((p) => [
                    p.player.espnId
                      ? p.player.espnId.toString()
                      : p.player.name,
                    p.redraftValue / 100,
                  ])
                )
            )
        )
        .then((players) => ({ players, timestamp: Date.now() })),
    ])
    .then((ps) =>
      ps.map((p) =>
        p.catch((e) => {
          console.error(e);
          throw e;
        })
      )
    )
    .then((ps) => Promise.all(ps))
    .then(
      ([
        year,
        latestScoringPeriod,
        nflPlayers,
        ffTeams,
        ffMatchups,
        nflTeams,
        fantasyCalc,
      ]) =>
        ({
          year,
          latestScoringPeriod,
          nflPlayers,
          ffTeams,
          ffMatchups,
          nflTeams,
          fantasyCalc,
        } as WrappedType)
    )
    .then((wrapped) => {
      const values = Object.fromEntries(
        Object.values(wrapped.ffTeams).map((team) => [
          team.id,
          parseFloat(
            team.rosters["0"].rostered
              .map((playerId) => wrapped.fantasyCalc!.players[playerId] || 0)
              .reduce((a, b) => a + b, 0)
              .toFixed(2)
          ),
        ])
      );
      wrapped.fantasyCalc!.history =
        selectedWrapped()?.fantasyCalc!.history || [];
      if (
        JSON.stringify(values) !==
        JSON.stringify(
          wrapped.fantasyCalc?.history[wrapped.fantasyCalc.history.length - 1]
            ?.values
        )
      )
        wrapped.fantasyCalc!.history.push({
          values,
          date: Date.now(),
        });
      return wrapped;
    })
    .then(clog);
}

function fromEntries<T>(arr: ({ key: string; value: T } | undefined)[]): {
  [key: string]: T;
} {
  return Object.fromEntries(
    arr.filter((a) => a !== undefined).map((a) => [a!.key, a!.value])
  );
}
