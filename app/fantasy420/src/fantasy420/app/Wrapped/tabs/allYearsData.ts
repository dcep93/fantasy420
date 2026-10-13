import type {
  WrappedType,
  NFLPlayerType,
  FFTeamType,
} from "../../FetchWrapped";
import { completedWeeks, managerKey } from "../scope";
import { Helpers } from "..";

export type Seasons = Record<string, WrappedType>;
export type Cell = string | number;
export type Report = {
  title: string;
  description?: string;
  columns: string[];
  rows: Cell[][];
};
export type TeamWeek = {
  year: string;
  week: string;
  wrapped: WrappedType;
  team: FFTeamType;
  manager: string;
  roster: FFTeamType["rosters"][string];
  score: number;
  bench: number;
  ideal: number;
  opponent?: TeamWeek;
  rank: number;
  leagueSize: number;
  median: number;
};
export type PlayerWeek = {
  year: string;
  week: string;
  player: NFLPlayerType;
  score: number;
  owner?: TeamWeek;
  started: boolean;
};
export type History = {
  teams: TeamWeek[];
  players: PlayerWeek[];
  labels: Map<string, string>;
  seasons: Seasons;
};
export const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);
export const mean = (values: number[]) =>
  values.length ? sum(values) / values.length : 0;
export const round = (n: number) => Math.round(n * 100) / 100;
export function group<T>(rows: T[], key: (row: T) => string): T[][] {
  const groups = new Map<string, T[]>();
  rows.forEach((row) => {
    const id = key(row);
    if (!groups.has(id)) groups.set(id, []);
    groups.get(id)!.push(row);
  });
  return [...groups.values()];
}
export const period = (row: { year: string; week: string }) =>
  `${row.year} · W${row.week}`;
export const yearsOf = (rows: { year: string }[]) =>
  [...new Set(rows.map((row) => row.year))].sort().join(", ");
export const total = (w: WrappedType, ids: string[], week: string) =>
  round(sum(ids.map((id) => w.nflPlayers[id]?.scores[week] ?? 0)));
export function buildHistory(seasons: Seasons): History {
  const teams: TeamWeek[] = [],
    players: PlayerWeek[] = [];
  const names = new Map<string, { name: string; years: Set<string> }>();
  for (const [year, wrapped] of Object.entries(seasons).sort(([a], [b]) =>
    a.localeCompare(b),
  )) {
    for (const team of Object.values(wrapped.ffTeams)) {
      const key = managerKey(team.id, year);
      const value = names.get(key) ?? {
        name: team.name,
        years: new Set<string>(),
      };
      value.name = team.name;
      value.years.add(year);
      names.set(key, value);
    }
    for (const week of completedWeeks(wrapped)) {
      const rows: TeamWeek[] = Object.values(wrapped.ffTeams)
        .filter((team) => team.rosters[week]?.starting.length)
        .map((team) => {
          const roster = team.rosters[week];
          const idealIds = Helpers.getIdealHelper(
            roster.rostered,
            roster.starting,
            (player) => player.scores[week] ?? 0,
            wrapped,
          );
          return {
            year,
            week,
            wrapped,
            team,
            roster,
            manager: managerKey(team.id, year),
            score: total(wrapped, roster.starting, week),
            bench: total(
              wrapped,
              roster.rostered.filter((id) => !roster.starting.includes(id)),
              week,
            ),
            ideal: total(wrapped, idealIds, week),
            rank: 0,
            leagueSize: 0,
            median: 0,
          };
        })
        .sort((a, b) => b.score - a.score);
      const median = rows.length
        ? (rows[Math.floor((rows.length - 1) / 2)].score +
            rows[Math.floor(rows.length / 2)].score) /
          2
        : 0;
      rows.forEach((row) => {
        row.rank = 1 + rows.filter((other) => other.score > row.score).length;
        row.leagueSize = rows.length;
        row.median = median;
        const opponentId = wrapped.ffMatchups[week]
          ?.find((pair) => pair.includes(row.team.id))
          ?.find((id) => id !== row.team.id);
        row.opponent = rows.find((other) => other.team.id === opponentId);
      });
      teams.push(...rows);
      for (const player of Object.values(wrapped.nflPlayers)) {
        const score = player.scores[week];
        if (!Number.isFinite(score)) continue;
        const owner = rows.find((row) =>
          row.roster.rostered.includes(player.id),
        );
        players.push({
          year,
          week,
          player,
          score,
          owner,
          started: !!owner?.roster.starting.includes(player.id),
        });
      }
    }
  }
  const labels = new Map(
    [...names].map(([key, value]) => [
      key,
      `${value.name} (${[...value.years].sort().join(", ")})`,
    ]),
  );
  return { teams, players, labels, seasons };
}
export function report(
  title: string,
  columns: string[],
  rows: Cell[][],
  description?: string,
): Report {
  return { title, columns, rows, description };
}
export function managerReports(
  history: History,
  tab: string,
  threshold: number,
): Report[] | undefined {
  const { teams, labels, players } = history;
  const managers = group(teams, (row) => row.manager);
  const name = (row: TeamWeek) => labels.get(row.manager)!;
  if (
    [
      "ManagerPlot",
      "ManagerTrend",
      "HeadToHead",
      "WhatIf",
      "ConsistentlyAverage",
    ].includes(tab)
  ) {
    if (tab === "HeadToHead")
      return [
        report(
          "Head-to-head records",
          [
            "Manager",
            "Opponent",
            "Games",
            "Wins",
            "Losses",
            "Ties",
            "Win %",
            "Points for",
            "Points against",
          ],
          group(
            teams.filter((t) => t.opponent),
            (t) => `${t.manager}/${t.opponent!.manager}`,
          ).map((rows) => {
            const wins = rows.filter((r) => r.score > r.opponent!.score).length;
            const ties = rows.filter(
              (r) => r.score === r.opponent!.score,
            ).length;
            return [
              name(rows[0]),
              name(rows[0].opponent!),
              rows.length,
              wins,
              rows.length - wins - ties,
              ties,
              (100 * wins) / rows.length,
              sum(rows.map((r) => r.score)),
              sum(rows.map((r) => r.opponent!.score)),
            ];
          }),
        ),
      ];
    if (tab === "WhatIf" || tab === "ConsistentlyAverage")
      return [
        report(
          tab === "WhatIf"
            ? "Flipping close results across all years"
            : "Season-average player scores across all years",
          [
            "Manager",
            "Games",
            "Actual wins",
            "Hypothetical wins",
            "Hypothetical ties",
            "Years",
          ],
          managers.map((rows) => {
            const games = rows.filter((r) => r.opponent);
            const margin = (r: TeamWeek) => {
              if (tab === "WhatIf") {
                const diff = round(r.score - r.opponent!.score);
                return Math.abs(diff) < threshold ? -diff : diff;
              }
              const score = (t: TeamWeek) =>
                sum(
                  t.roster.starting.map((id) => {
                    const p = t.wrapped.nflPlayers[id];
                    return mean(
                      completedWeeks(t.wrapped)
                        .map((w) => p?.scores[w])
                        .filter((v) => Number.isFinite(v) && v !== 0),
                    );
                  }),
                );
              return round(score(r) - score(r.opponent!));
            };
            return [
              name(rows[0]),
              games.length,
              games.filter((r) => r.score > r.opponent!.score).length,
              games.filter((r) => margin(r) > 0).length,
              games.filter((r) => margin(r) === 0).length,
              yearsOf(rows),
            ];
          }),
          tab === "ConsistentlyAverage"
            ? "Each matchup uses averages from its own season’s nonzero scoring weeks; season results are then combined."
            : `Flip matchups with a margin below ${threshold} points; ties remain ties.`,
        ),
      ];
    return [
      report(
        "Manager totals and rates",
        [
          "Manager",
          "Weeks",
          "Points",
          "Points / week",
          "Games",
          "Wins",
          "Losses",
          "Ties",
          "Win %",
          "Above median",
          "Score std. dev.",
        ],
        managers.map((rows) => {
          const games = rows.filter((r) => r.opponent),
            wins = games.filter((r) => r.score > r.opponent!.score).length,
            ties = games.filter((r) => r.score === r.opponent!.score).length;
          const avg = mean(rows.map((r) => r.score));
          return [
            name(rows[0]),
            rows.length,
            sum(rows.map((r) => r.score)),
            avg,
            games.length,
            wins,
            games.length - wins - ties,
            ties,
            games.length ? (100 * wins) / games.length : 0,
            rows.filter((r) => r.score > r.median).length,
            Math.sqrt(mean(rows.map((r) => (r.score - avg) ** 2))),
          ];
        }),
      ),
    ];
  }
  if (tab === "WeekTopsAndBottoms")
    return [
      report(
        "Weekly top and bottom finishes",
        [
          "Manager",
          "Weeks",
          "Top finishes",
          "Bottom finishes",
          "Top year/weeks",
          "Bottom year/weeks",
        ],
        managers.map((rows) => {
          const top = rows.filter((r) => r.rank === 1),
            bottom = rows.filter(
              (r) =>
                !teams.some(
                  (t) =>
                    t.year === r.year && t.week === r.week && t.score < r.score,
                ),
            );
          return [
            name(rows[0]),
            rows.length,
            top.length,
            bottom.length,
            top.map(period).join("; "),
            bottom.map(period).join("; "),
          ];
        }),
        "Tied top or bottom scores count for each tied manager.",
      ),
    ];
  if (["Performance", "PerformanceTotals"].includes(tab))
    return [
      report(
        "Combined manager scoring",
        [
          "Manager",
          "Weeks",
          "Started points",
          "Bench points",
          "Started points / week",
        ],
        managers.map((rows) => [
          name(rows[0]),
          rows.length,
          sum(rows.map((r) => r.score)),
          sum(rows.map((r) => r.bench)),
          mean(rows.map((r) => r.score)),
        ]),
      ),
      report(
        "Player contributions by manager",
        [
          "Manager",
          "Player",
          "Started points",
          "Bench points",
          "Starts",
          "Years",
        ],
        group(
          players.filter((p) => p.owner),
          (p) => `${p.owner!.manager}/${p.player.id}`,
        ).map((rows) => [
          name(rows[0].owner!),
          rows[0].player.name,
          sum(rows.filter((r) => r.started).map((r) => r.score)),
          sum(rows.filter((r) => !r.started).map((r) => r.score)),
          rows.filter((r) => r.started).length,
          yearsOf(rows),
        ]),
      ),
    ];
  if (tab === "BestByPosition")
    return [
      report(
        "Started points by position",
        ["Manager", "Position", "Points", "Starts", "Points / start", "Years"],
        group(
          players.filter((p) => p.started),
          (p) => `${p.owner!.manager}/${p.player.position}`,
        ).map((rows) => [
          name(rows[0].owner!),
          rows[0].player.position,
          sum(rows.map((r) => r.score)),
          rows.length,
          mean(rows.map((r) => r.score)),
          yearsOf(rows),
        ]),
      ),
    ];
  if (["UniquesStarted", "UniquesRostered", "Simps"].includes(tab)) {
    const owned = teams.flatMap((t) =>
      (tab === "UniquesStarted"
        ? t.roster.starting
        : t.roster.rostered
      ).flatMap((id) => {
        const player = t.wrapped.nflPlayers[id];
        return player ? [{ t, player, year: t.year }] : [];
      }),
    );
    if (tab === "Simps")
      return [
        report(
          "Manager–player ownership",
          ["Manager", "Player", "Roster weeks", "Years", "Year/weeks"],
          group(owned, (r) => `${r.t.manager}/${r.player.id}`)
            .map((rows) => [
              name(rows[0].t),
              rows[0].player.name,
              rows.length,
              yearsOf(rows),
              rows.map((r) => period(r.t)).join("; "),
            ])
            .sort((a, b) => Number(b[2]) - Number(a[2])),
        ),
      ];
    return [
      report(
        tab === "UniquesStarted"
          ? "Unique players started"
          : "Unique players rostered",
        ["Manager", "Position", "Unique players", "Player names", "Years"],
        group(owned, (r) => `${r.t.manager}/${r.player.position}`).map(
          (rows) => [
            name(rows[0].t),
            rows[0].player.position,
            new Set(rows.map((r) => r.player.id)).size,
            [...new Set(rows.map((r) => r.player.name))].sort().join(", "),
            yearsOf(rows),
          ],
        ),
        "Players are deduplicated across seasons by player ID. Uses completed weekly rosters, excluding the current roster snapshot.",
      ),
    ];
  }
  return undefined;
}
