import { getCompositeForYear } from "../../Draft/yearComposite";
import { completedWeeks, managerKey } from "../scope";
import { getScoringAdjustments } from "./DeterminedByDiscreteScoring";
import { getOwnershipMoves, groupOwnershipMoves } from "./Trades";
import {
  Cell,
  History,
  Report,
  group,
  managerReports,
  mean,
  period,
  report,
  round,
  sum,
  yearsOf,
} from "./allYearsData";

export function aggregateReports(
  h: History,
  tab: string,
  threshold = 10,
): Report[] {
  const manager = managerReports(h, tab, threshold);
  if (manager) return manager;
  const { teams, players, seasons, labels } = h;
  const byScore = <T extends { score: number }>(rows: T[]) =>
    [...rows].sort((a, b) => b.score - a.score);
  const pairs = teams.filter(
    (t) => t.opponent && t.team.id.localeCompare(t.opponent.team.id) < 0,
  );
  const name = (key: string) => labels.get(key) ?? key;
  const playerRows = (rows: typeof players): Cell[][] =>
    rows.map((p) => [
      p.year,
      Number(p.week),
      p.player.name,
      p.player.position,
      p.score,
      p.owner?.team.name ?? "Unowned",
      p.started ? "Started" : "Not started",
    ]);
  const playerColumns = [
    "Year",
    "Week",
    "Player",
    "Position",
    "Points",
    "Manager that year",
    "Lineup",
  ];
  if (tab === "SqueezesAndStomps") {
    const rows = pairs
      .map((t) => ({ t, margin: round(Math.abs(t.score - t.opponent!.score)) }))
      .sort((a, b) => a.margin - b.margin);
    const toRow = ({ t, margin }: (typeof rows)[number]): Cell[] => [
      t.year,
      Number(t.week),
      t.team.name,
      t.score,
      t.opponent!.team.name,
      t.opponent!.score,
      margin,
    ];
    const columns = [
      "Year",
      "Week",
      "Manager",
      "Points",
      "Opponent",
      "Opponent points",
      "Margin",
    ];
    return [
      report("Closest matchups", columns, rows.map(toRow)),
      report("Biggest blowouts", columns, [...rows].reverse().map(toRow)),
    ];
  }
  if (tab === "GooseEggs")
    return [
      report(
        "Zero or negative starters",
        ["Manager", "Player", "Starts ≤ 0", "Points", "Year/weeks"],
        group(
          players.filter((p) => p.started && p.score <= 0),
          (p) => `${p.owner!.manager}/${p.player.id}`,
        )
          .map((rows) => [
            name(rows[0].owner!.manager),
            rows[0].player.name,
            rows.length,
            sum(rows.map((r) => r.score)),
            rows.map(period).join("; "),
          ])
          .sort((a, b) => Number(b[2]) - Number(a[2])),
      ),
    ];
  if (tab === "Negatives")
    return [
      report(
        "Negative player scores",
        playerColumns,
        playerRows(
          byScore(
            players.filter((p) => p.score < 0 && p.player.position !== "DST"),
          ).reverse(),
        ),
      ),
    ];
  if (tab === "Benchwarmers")
    return [
      report(
        "Highest-scoring benches",
        ["Year", "Week", "Manager", "Bench points"],
        [...teams]
          .sort((a, b) => b.bench - a.bench)
          .map((t) => [t.year, Number(t.week), t.team.name, t.bench]),
      ),
      report(
        "Highest-scoring benched players",
        playerColumns,
        playerRows(byScore(players.filter((p) => p.owner && !p.started))),
      ),
    ];
  if (tab === "ChosenWrong")
    return [
      report(
        "Losses an ideal lineup could have reversed",
        [
          "Year",
          "Week",
          "Manager",
          "Actual points",
          "Ideal points",
          "Opponent",
          "Opponent points",
          "Left on bench",
        ],
        teams
          .filter(
            (t) =>
              t.opponent &&
              t.score < t.opponent.score &&
              t.ideal > t.opponent.score,
          )
          .sort((a, b) => b.ideal - b.score - (a.ideal - a.score))
          .map((t) => [
            t.year,
            Number(t.week),
            t.team.name,
            t.score,
            t.ideal,
            t.opponent!.team.name,
            t.opponent!.score,
            t.ideal - t.score,
          ]),
      ),
    ];
  if (tab === "SecondLost")
    return [
      report(
        "Second-highest score lost",
        ["Year", "Week", "Manager", "Points", "Opponent", "Opponent points"],
        teams
          .filter(
            (t) => t.rank === 2 && t.opponent && t.score < t.opponent.score,
          )
          .map((t) => [
            t.year,
            Number(t.week),
            t.team.name,
            t.score,
            t.opponent!.team.name,
            t.opponent!.score,
          ]),
      ),
      report(
        "Second-lowest score won",
        ["Year", "Week", "Manager", "Points", "Opponent", "Opponent points"],
        teams
          .filter(
            (t) =>
              t.rank === t.leagueSize - 1 &&
              t.opponent &&
              t.score > t.opponent.score,
          )
          .map((t) => [
            t.year,
            Number(t.week),
            t.team.name,
            t.score,
            t.opponent!.team.name,
            t.opponent!.score,
          ]),
      ),
    ];
  if (tab === "Bopped") {
    const peaks = group(players, (p) => `${p.year}/${p.player.id}`)
      .map((rows) => byScore(rows)[0])
      .filter((p) => p.score >= 20 && p.owner);
    return [
      report(
        "Season-best performances faced or benched",
        [
          "Year",
          "Week",
          "Player",
          "Points",
          "Owner that year",
          "Affected manager",
          "Event",
        ],
        byScore(peaks).map((p) => [
          p.year,
          Number(p.week),
          p.player.name,
          p.score,
          p.owner!.team.name,
          p.started
            ? (p.owner!.opponent?.team.name ?? "Bye")
            : p.owner!.team.name,
          p.started ? "Faced season high" : "Benched season high",
        ]),
        "Each player’s peak is determined within its original season, then ranked across all years.",
      ),
    ];
  }
  if (tab === "Stacks")
    return [
      report(
        "Best two-player NFL team stacks",
        ["Year", "Week", "NFL team", "Player 1", "Player 2", "Combined points"],
        group(players, (p) => `${p.year}/${p.week}/${p.player.nflTeamId}`)
          .filter((rows) => rows.length >= 2)
          .map((rows) => {
            const best = byScore(rows).slice(0, 2);
            return [
              best[0].year,
              Number(best[0].week),
              seasons[best[0].year].nflTeams[best[0].player.nflTeamId]?.name ??
                "Unknown",
              best[0].player.name,
              best[1].player.name,
              sum(best.map((r) => r.score)),
            ] as Cell[];
          })
          .sort((a, b) => Number(b[5]) - Number(a[5])),
      ),
    ];
  if (tab === "BoomBust" || tab === "PlayerPlot") {
    return [
      report(
        "Player scoring across all years",
        [
          "Player",
          "Position",
          "Scoring weeks",
          "Total points",
          "Points / scoring week",
          "Std. dev.",
          "Std. dev. / mean",
          "Maximum",
          "Minimum",
          "Years",
        ],
        group(
          players.filter((p) => p.score !== 0),
          (p) => p.player.id,
        )
          .map((rows) => {
            const scores = rows.map((r) => r.score),
              avg = mean(scores),
              sd = Math.sqrt(mean(scores.map((s) => (s - avg) ** 2)));
            return [
              rows.at(-1)!.player.name,
              rows.at(-1)!.player.position,
              rows.length,
              sum(scores),
              avg,
              sd,
              avg ? sd / Math.abs(avg) : 0,
              Math.max(...scores),
              Math.min(...scores),
              yearsOf(rows),
            ];
          })
          .sort((a, b) => Number(b[3]) - Number(a[3])),
        "Pools nonzero recorded weekly scores; missing/zero weeks are excluded, matching the scoring-week distribution. Averages and variability are recomputed from pooled observations. Draft and market snapshot axes remain available in a single year.",
      ),
    ];
  }
  if (tab === "AllTimeRecords") {
    const playerSeasons = group(players, (p) => `${p.year}/${p.player.id}`)
      .map(
        (rows) =>
          [
            rows[0].year,
            rows[0].player.name,
            rows[0].player.position,
            sum(rows.map((r) => r.score)),
          ] as Cell[],
      )
      .sort((a, b) => Number(b[3]) - Number(a[3]));
    const managerRows = byScore(teams).map(
      (t) => [t.year, Number(t.week), t.team.name, t.score] as Cell[],
    );
    return [
      report(
        "Manager weekly records",
        ["Year", "Week", "Manager", "Points"],
        managerRows,
      ),
      report(
        "Player weekly records",
        playerColumns,
        playerRows(byScore(players)),
      ),
      report(
        "Player season totals",
        ["Year", "Player", "Position", "Points"],
        playerSeasons,
        "Partial seasons include only completed weeks. Sort any points column ascending to see the lowest records.",
      ),
    ];
  }
  if (tab === "PointsAgainst") {
    const games: {
      teamId: string;
      team: string;
      position: string;
      year: string;
      score: number;
    }[] = [];
    for (const [year, w] of Object.entries(seasons))
      for (const team of Object.values(w.nflTeams))
        for (const [week, g] of Object.entries(team.nflGamesByScoringPeriod)) {
          if (
            !g?.opp ||
            Number(week) <= 0 ||
            Number(week) > (w.latestScoringPeriod ?? Infinity)
          )
            continue;
          const ps = Object.values(w.nflPlayers).filter(
            (p) => p.nflTeamId === g.opp && Number.isFinite(p.scores[week]),
          );
          for (const rows of group(ps, (p) => p.position))
            games.push({
              teamId: team.id,
              team: team.name,
              position: rows[0].position,
              year,
              score: sum(rows.map((p) => p.scores[week])),
            });
        }
    return [
      report(
        "Fantasy points allowed by NFL team and position",
        [
          "NFL team",
          "Position",
          "Scored games",
          "Points allowed",
          "Points / game",
          "Years",
        ],
        group(games, (g) => `${g.teamId}/${g.position}`)
          .map((rows) => [
            rows.at(-1)!.team,
            rows[0].position,
            rows.length,
            sum(rows.map((r) => r.score)),
            mean(rows.map((r) => r.score)),
            yearsOf(rows),
          ])
          .sort((a, b) => Number(b[4]) - Number(a[4])),
        "Adds points and scored-game counts across seasons, then divides. Games without recorded scores for that position are excluded.",
      ),
    ];
  }
  if (tab === "Trades") {
    const rows: Cell[][] = [];
    for (const [year, w] of Object.entries(seasons))
      for (const week of groupOwnershipMoves(
        w,
        getOwnershipMoves(w).filter(
          (m) => Number(m.weekNum) <= (w.latestScoringPeriod ?? Infinity),
        ),
      ))
        for (const deal of week.deals) {
          rows.push([
            year,
            Number(week.weekNum),
            deal.kind,
            deal.moves.length,
            deal.moves
              .map(
                (m) =>
                  `${w.nflPlayers[m.playerId].name}: ${w.ffTeams[m.fromTeamId].name} → ${w.ffTeams[m.toTeamId].name}`,
              )
              .join("; "),
          ]);
        }
    return [
      report(
        "Ownership moves across all years",
        ["Year", "Week", "Type", "Players moved", "Moves"],
        rows.sort(
          (a, b) => Number(b[0]) - Number(a[0]) || Number(b[1]) - Number(a[1]),
        ),
        "Inferred from adjacent weekly rosters within each season. These are not verified transaction records; no moves are inferred between seasons.",
      ),
    ];
  }
  if (tab === "DeterminedByDiscreteScoring")
    return [
      report(
        "Results reversed by continuous K/DST scoring",
        [
          "Year",
          "Week",
          "Winner",
          "Actual points",
          "Adjusted points",
          "Loser",
          "Actual loser points",
          "Adjusted loser points",
        ],
        pairs.flatMap((t) => {
          const o = t.opponent!,
            a =
              t.score +
              sum(
                getScoringAdjustments(t.wrapped, t.team.id, t.week).map(
                  (s) => s.superscore,
                ),
              ),
            b =
              o.score +
              sum(
                getScoringAdjustments(o.wrapped, o.team.id, o.week).map(
                  (s) => s.superscore,
                ),
              );
          if (
            t.score === o.score ||
            Math.sign(t.score - o.score) === Math.sign(a - b) ||
            a === b
          )
            return [];
          return [
            t.score > o.score
              ? [
                  t.year,
                  Number(t.week),
                  t.team.name,
                  t.score,
                  a,
                  o.team.name,
                  o.score,
                  b,
                ]
              : [
                  t.year,
                  Number(t.week),
                  o.team.name,
                  o.score,
                  b,
                  t.team.name,
                  t.score,
                  a,
                ],
          ];
        }),
      ),
    ];
  if (tab === "Injuries") {
    const events: Cell[][] = [];
    for (const t of teams)
      for (const id of t.roster.rostered) {
        const p = t.wrapped.nflPlayers[id],
          next = Number(t.week) + 1,
          cutoff = t.wrapped.latestScoringPeriod ?? Infinity;
        if (
          !p ||
          p.position === "DST" ||
          next > cutoff ||
          p.scores[next] !== 0 ||
          t.team.rosters[next]?.starting.includes(id) ||
          (!t.roster.starting.includes(id) && !(p.scores[t.week] ?? 0))
        )
          continue;
        const weeks: number[] = [];
        for (let week = next; week <= cutoff && p.scores[week] === 0; week++)
          weeks.push(week);
        events.push([
          t.year,
          t.team.name,
          p.name,
          Number(t.week),
          weeks.length,
          weeks.join(", "),
        ]);
      }
    return [
      report(
        "Possible injury absences",
        [
          "Year",
          "Manager",
          "Player",
          "Last active week",
          "Zero-score weeks",
          "Weeks",
        ],
        events.sort((a, b) => Number(b[4]) - Number(a[4])),
        "Heuristic: a rostered player stopped scoring and was no longer started the following week. Byes and benchings can also cause this; these are not confirmed injuries.",
      ),
    ];
  }
  if (tab === "DraftValue" || tab === "ReachesAndSteals") {
    const picks: {
      year: string;
      manager: string;
      player: string;
      position: string;
      pick: number;
      rank?: number;
      points: number;
      weeks: number;
    }[] = [];
    for (const [year, w] of Object.entries(seasons)) {
      const composite = getCompositeForYear(year);
      for (const team of Object.values(w.ffTeams))
        for (const pick of team.draft) {
          const p = w.nflPlayers[pick.playerId];
          if (!p) continue;
          const weeks = completedWeeks(w).filter(
            (week) => Number.isFinite(p.scores[week]) && p.scores[week] !== 0,
          );
          picks.push({
            year,
            manager: managerKey(team.id, year),
            player: p.name,
            position: p.position,
            pick: pick.pickIndex + 1,
            rank: composite?.[p.id],
            points: sum(weeks.map((week) => p.scores[week])),
            weeks: weeks.length,
          });
        }
    }
    if (tab === "ReachesAndSteals")
      return [
        report(
          "Draft value versus that season’s ADP",
          ["Year", "Manager", "Player", "Pick", "Composite ADP", "Pick − ADP"],
          picks
            .filter((p) => Number.isFinite(p.rank))
            .map((p) => [
              p.year,
              name(p.manager),
              p.player,
              p.pick,
              p.rank!,
              p.pick - p.rank!,
            ])
            .sort((a, b) => Number(b[5]) - Number(a[5])),
          "Positive gaps are steals; negative gaps are reaches. Each pick uses its own year’s composite. Picks without ADP are excluded; sort the gap column to compare either direction.",
        ),
      ];
    return [
      report(
        "Production from drafted players",
        [
          "Manager",
          "Drafts",
          "Picks",
          "Total points",
          "Points / pick",
          "Scoring weeks",
          "Points / scoring week",
        ],
        group(picks, (p) => p.manager).map((rows) => [
          name(rows[0].manager),
          new Set(rows.map((r) => r.year)).size,
          rows.length,
          sum(rows.map((r) => r.points)),
          mean(rows.map((r) => r.points)),
          sum(rows.map((r) => r.weeks)),
          sum(rows.map((r) => r.weeks))
            ? sum(rows.map((r) => r.points)) / sum(rows.map((r) => r.weeks))
            : 0,
        ]),
        "Actual production by players drafted, wherever they subsequently played. Uses completed weeks; partial seasons have less opportunity. Single-year views retain their original draft-source comparisons.",
      ),
      report(
        "Drafted player-season production",
        [
          "Year",
          "Manager",
          "Player",
          "Position",
          "Pick",
          "Points",
          "Scoring weeks",
        ],
        picks
          .map((p) => [
            p.year,
            name(p.manager),
            p.player,
            p.position,
            p.pick,
            p.points,
            p.weeks,
          ])
          .sort((a, b) => Number(b[5]) - Number(a[5])),
      ),
    ];
  }
  throw new Error(`No all-years report configured for ${tab}`);
}
