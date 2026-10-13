import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { NIGHT_CHART_COLORS, NIGHT_COLORS } from "../../theme";
import {
  buildHistory,
  Cell,
  group,
  History,
  period,
  Report,
  Seasons,
} from "./allYearsData";
import { aggregateReports } from "./allYearsReports";
import { usePlayerStats } from "./PlayerStats/usePlayerStats";
import LoadStatus from "./PlayerStats/LoadStatus";

export default function AllYears({
  tab,
  seasons,
}: {
  tab: string;
  seasons: Seasons;
}) {
  const history = useMemo(() => buildHistory(seasons), [seasons]);
  const [threshold, setThreshold] = useState(10);
  const reports = useMemo(
    () => aggregateReports(history, tab, threshold),
    [history, tab, threshold],
  );
  return (
    <div style={{ padding: "0 1rem 2rem", maxWidth: 1400, minWidth: 0 }}>
      <p>
        Completed weeks across {Object.keys(seasons).sort().join(", ")}. Manager
        totals keep separate ownership eras when team IDs changed hands.
      </p>
      {tab === "WhatIf" && (
        <label>
          Flip margins below{" "}
          <input
            aria-label="Close matchup threshold"
            type="number"
            min={0}
            value={threshold}
            onChange={(e) =>
              setThreshold(Math.max(0, Number(e.target.value) || 0))
            }
          />{" "}
          points
        </label>
      )}
      {["ManagerPlot", "ManagerTrend"].includes(tab) && (
        <ManagerHistoryChart history={history} trend={tab === "ManagerTrend"} />
      )}
      {tab === "PlayerPlot" && (
        <div style={{ height: 420, width: "100%" }}>
          <p>
            Total points versus average per nonzero scoring week · top 100 by
            total
          </p>
          <ResponsiveContainer width="100%" height="85%">
            <ScatterChart margin={{ left: 20, right: 20, bottom: 20 }}>
              <CartesianGrid stroke={NIGHT_COLORS.chartGrid} />
              <XAxis
                type="number"
                dataKey="average"
                name="Points / scoring week"
              />
              <YAxis type="number" dataKey="total" name="Total points" />
              <Tooltip
                cursor={{ strokeDasharray: "3 3" }}
                content={({ payload }) => {
                  const p = payload?.[0]?.payload;
                  return p ? (
                    <div
                      style={{ background: NIGHT_COLORS.tooltip, padding: 12 }}
                    >
                      {p.name}
                      <br />
                      {p.total.toFixed(2)} total · {p.average.toFixed(2)} /
                      scoring week
                    </div>
                  ) : null;
                }}
              />
              <Scatter
                fill={NIGHT_CHART_COLORS[0]}
                isAnimationActive={false}
                data={reports[0].rows
                  .slice(0, 100)
                  .map((r) => ({ name: r[0], total: r[3], average: r[4] }))}
              />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      )}
      {tab === "AllTimeRecords" && (
        <NFLHistoryRecords
          year={
            Object.keys(seasons).length === 1 ? Object.keys(seasons)[0] : "all"
          }
        />
      )}
      {reports.map((r) => (
        <AggregateTable key={`${tab}/${r.title}`} report={r} />
      ))}
    </div>
  );
}
function ManagerHistoryChart({
  history,
  trend,
}: {
  history: History;
  trend: boolean;
}) {
  const [metric, setMetric] = useState(
    trend ? "Weekly points" : "Cumulative points",
  );
  const keys = [...new Set(history.teams.map((t) => t.manager))];
  const running: Record<string, number> = {};
  const data = group(history.teams, (t) => period(t))
    .sort(
      (a, b) =>
        Number(a[0].year) - Number(b[0].year) ||
        Number(a[0].week) - Number(b[0].week),
    )
    .map((rows) => {
      const result: Record<string, string | number> = {
        period: period(rows[0]),
      };
      rows.forEach((t) => {
        const value =
          metric === "Cumulative wins"
            ? Number(!!t.opponent && t.score > t.opponent.score)
            : metric === "Cumulative points against"
              ? (t.opponent?.score ?? 0)
              : t.score;
        running[t.manager] = (running[t.manager] ?? 0) + value;
        result[t.manager] =
          metric === "Weekly points" ? value : running[t.manager];
      });
      return result;
    });
  return (
    <section>
      <label>
        Chart metric{" "}
        <select value={metric} onChange={(e) => setMetric(e.target.value)}>
          {[
            "Weekly points",
            "Cumulative points",
            "Cumulative points against",
            "Cumulative wins",
          ].map((m) => (
            <option key={m}>{m}</option>
          ))}
        </select>
      </label>
      <div style={{ width: "100%", height: 400, marginTop: 16 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ left: 12, right: 20, bottom: 30 }}>
            <CartesianGrid stroke={NIGHT_COLORS.chartGrid} />
            <XAxis dataKey="period" minTickGap={70} angle={-15} />
            <YAxis />
            <Tooltip
              contentStyle={{
                background: NIGHT_COLORS.tooltip,
                border: `1px solid ${NIGHT_COLORS.border}`,
              }}
            />
            {keys.map((key, i) => (
              <Line
                key={key}
                dataKey={key}
                name={history.labels.get(key)}
                stroke={NIGHT_CHART_COLORS[i % NIGHT_CHART_COLORS.length]}
                dot={false}
                isAnimationActive={false}
                connectNulls={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
export function AggregateTable({ report }: { report: Report }) {
  const [filter, setFilter] = useState("");
  const [sort, setSort] = useState<{
    index: number;
    descending: boolean;
  } | null>(null);
  const [limit, setLimit] = useState(50);
  const rows = useMemo(() => {
    const result = report.rows.filter((row) =>
      row.some((cell) =>
        String(cell).toLowerCase().includes(filter.toLowerCase()),
      ),
    );
    if (sort)
      result.sort((a, b) => {
        const left = a[sort.index],
          right = b[sort.index];
        const cmp =
          typeof left === "number" && typeof right === "number"
            ? left - right
            : String(left).localeCompare(String(right), undefined, {
                numeric: true,
              });
        return cmp * (sort.descending ? -1 : 1);
      });
    return result;
  }, [report, filter, sort]);
  const format = (cell: Cell) =>
    typeof cell === "number"
      ? Number.isFinite(cell)
        ? Number.isInteger(cell)
          ? String(cell)
          : cell.toFixed(2)
        : "—"
      : cell;
  return (
    <section
      style={{
        marginTop: 24,
        background: NIGHT_COLORS.surface,
        border: `1px solid ${NIGHT_COLORS.border}`,
        borderRadius: 12,
        padding: 16,
        minWidth: 0,
      }}
    >
      <h2 style={{ marginTop: 0 }}>{report.title}</h2>
      {report.description && <p>{report.description}</p>}
      <label>
        Search{" "}
        <input
          aria-label={`Search ${report.title}`}
          value={filter}
          onChange={(e) => {
            setFilter(e.target.value);
            setLimit(50);
          }}
        />
      </label>
      <p style={{ color: NIGHT_COLORS.mutedText }}>
        {rows.length} results · click a column to sort
      </p>
      {rows.length === 0 ? (
        <p>No matching records in the selected years.</p>
      ) : (
        <div style={{ overflowX: "auto", maxWidth: "100%" }}>
          <table
            style={{
              borderCollapse: "collapse",
              width: "100%",
              textAlign: "left",
            }}
          >
            <thead>
              <tr>
                {report.columns.map((column, index) => (
                  <th
                    key={index}
                    aria-sort={
                      sort?.index === index
                        ? sort.descending
                          ? "descending"
                          : "ascending"
                        : "none"
                    }
                    style={{
                      padding: 8,
                      borderBottom: `2px solid ${NIGHT_COLORS.border}`,
                    }}
                  >
                    <button
                      onClick={() => {
                        setSort({
                          index,
                          descending:
                            sort?.index === index ? !sort.descending : true,
                        });
                        setLimit(50);
                      }}
                      style={{
                        font: "inherit",
                        fontWeight: 700,
                        color: "inherit",
                        background: "none",
                        border: 0,
                        cursor: "pointer",
                        textAlign: "left",
                      }}
                    >
                      {column}
                      {sort?.index === index
                        ? sort.descending
                          ? " ↓"
                          : " ↑"
                        : ""}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, limit).map((row, index) => (
                <tr key={index}>
                  {row.map((cell, i) => (
                    <td
                      key={i}
                      style={{
                        padding: 8,
                        borderBottom: `1px solid ${NIGHT_COLORS.border}`,
                        maxWidth: 400,
                        minWidth: 70,
                        overflowWrap: "anywhere",
                        verticalAlign: "top",
                      }}
                    >
                      {format(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {rows.length > limit && (
        <button style={{ marginTop: 16 }} onClick={() => setLimit(limit + 100)}>
          Show more ({rows.length - limit} remaining)
        </button>
      )}
    </section>
  );
}

function NFLHistoryRecords({ year }: { year: string }) {
  const stats = usePlayerStats();
  const players = useMemo(
    () =>
      stats.data
        .map((player) => {
          const years = player.years.filter(
            (season) => year === "all" || String(season.year) === year,
          );
          return {
            ...player,
            years,
            total: years.reduce((sum, season) => sum + season.total, 0),
          };
        })
        .filter((player) => player.years.length),
    [stats.data, year],
  );
  const coverage = [
    ...new Set(
      players.flatMap((player) => player.years.map((season) => season.year)),
    ),
  ].sort((a, b) => a - b);
  const totals: Report = {
    title: `NFL player totals · ${year === "all" ? "All years" : year}`,
    columns: ["Player", "Position", "Points", "Seasons", "Years"],
    description: `NFL historical coverage ${coverage[0] ?? ""}–${coverage.at(-1) ?? ""}; league records below cover the saved league seasons.`,
    rows: players
      .map(
        (p) =>
          [
            p.name,
            p.position,
            p.total,
            p.years.length,
            p.years.map((s) => s.year).join(", "),
          ] as Cell[],
      )
      .sort((a, b) => Number(b[2]) - Number(a[2])),
  };
  const weeks: Report = {
    title: `NFL weekly records · ${year === "all" ? "All years" : year}`,
    columns: ["Year", "Week", "Player", "Position", "Points"],
    rows: players
      .flatMap((p) =>
        p.years.flatMap((s) =>
          s.scores.flatMap((score, week) =>
            score === null
              ? []
              : [[s.year, week + 1, p.name, p.position, score] as Cell[]],
          ),
        ),
      )
      .sort((a, b) => Number(b[4]) - Number(a[4])),
  };
  return (
    <>
      <LoadStatus {...stats} />
      <AggregateTable report={totals} />
      <AggregateTable report={weeks} />
    </>
  );
}
