import { useMemo, useState } from "react";

import { selectedWrapped, selectedYear } from "..";
import { getCompositeForYear } from "../../Draft";
import { POSITION_COLORS } from "../../Draft/positionColors";
import { FFTeamType, NFLPlayerType, WrappedType } from "../../FetchWrapped";
import { getPerformance } from "./DraftValue";
import "./DraftDayReachesAndSteals.css";

export type DraftMarketVerdict = "reach" | "steal" | "at-cost";

export type DraftMarketEntry = {
  player: NFLPlayerType;
  manager: FFTeamType;
  nflTeamName: string;
  pickNumber: number;
  round: number;
  roundPick: number;
  compositeAdp: number;
  gap: number;
  verdict: DraftMarketVerdict;
  draftPositionRank?: number;
  finishPositionRank?: number;
  starts: number;
  bestWeek?: { week: string; points: number };
};

export type UnmatchedDraftPick = {
  playerName: string;
  managerName: string;
  pickNumber: number;
};

export type DraftMarketAnalysis = {
  entries: DraftMarketEntry[];
  unmatched: UnmatchedDraftPick[];
  totalPicks: number;
};

function getVerdict(gap: number): DraftMarketVerdict {
  if (gap < 0) return "reach";
  if (gap > 0) return "steal";
  return "at-cost";
}

function getBestWeek(player: NFLPlayerType) {
  return Object.entries(player.scores)
    .filter(([week]) => week !== "0")
    .map(([week, points]) => ({ week, points }))
    .sort(
      (left, right) =>
        right.points - left.points || Number(left.week) - Number(right.week)
    )[0];
}

export function getDraftMarketAnalysis(
  wrapped: WrappedType,
  composite: Record<string, number>
): DraftMarketAnalysis {
  const managers = Object.values(wrapped.ffTeams);
  const teamCount = managers.length;
  const performance = getPerformance({
    ...wrapped,
    ffTeams: Object.fromEntries(
      managers.map((manager) => [
        manager.id,
        {
          ...manager,
          draft: manager.draft.filter(
            (pick) => wrapped.nflPlayers[String(pick.playerId)] !== undefined
          ),
        },
      ])
    ),
  });
  const unmatched: UnmatchedDraftPick[] = [];

  const entries = managers.flatMap((manager) =>
    manager.draft.flatMap((pick) => {
      const playerId = String(pick.playerId);
      const player = wrapped.nflPlayers[playerId];
      const pickNumber = pick.pickIndex + 1;
      const compositeAdp = composite[playerId];

      if (!player || compositeAdp === undefined) {
        unmatched.push({
          playerName: player?.name ?? `Player ${playerId}`,
          managerName: manager.name,
          pickNumber,
        });
        return [];
      }

      const gap = pickNumber - compositeAdp;
      const playerPerformance = performance[playerId];

      return [
        {
          player,
          manager,
          nflTeamName:
            wrapped.nflTeams[player.nflTeamId]?.name ?? player.nflTeamId,
          pickNumber,
          round: teamCount === 0 ? 0 : Math.floor(pick.pickIndex / teamCount) + 1,
          roundPick:
            teamCount === 0 ? 0 : (pick.pickIndex % teamCount) + 1,
          compositeAdp,
          gap,
          verdict: getVerdict(gap),
          draftPositionRank:
            playerPerformance === undefined
              ? undefined
              : playerPerformance.draftRank + 1,
          finishPositionRank:
            playerPerformance?.totalRank === undefined
              ? undefined
              : playerPerformance.totalRank + 1,
          starts: managers
            .flatMap((team) => Object.entries(team.rosters))
            .filter(([week]) => week !== "0")
            .filter(([, roster]) =>
              roster.starting.map(String).includes(playerId)
            ).length,
          bestWeek: getBestWeek(player),
        },
      ];
    })
  );

  return {
    entries,
    unmatched: unmatched.sort((left, right) => left.pickNumber - right.pickNumber),
    totalPicks: managers.reduce(
      (total, manager) => total + manager.draft.length,
      0
    ),
  };
}

function formatNumber(value: number, digits = 1): string {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function formatAdp(value: number): string {
  return Number.isInteger(value) ? String(value) : formatNumber(value);
}

function formatGap(entry: Pick<DraftMarketEntry, "gap" | "verdict">) {
  const distance = formatAdp(Math.abs(entry.gap));
  if (entry.verdict === "reach") return `${distance} early`;
  if (entry.verdict === "steal") return `${distance} late`;
  return "at ADP";
}

function formatDraftSlot(entry: DraftMarketEntry): string {
  return `${entry.round}.${String(entry.roundPick).padStart(2, "0")}`;
}

export function sortByMarketGap(
  entries: DraftMarketEntry[],
  verdict: Exclude<DraftMarketVerdict, "at-cost">
) {
  return entries
    .filter((entry) => entry.verdict === verdict)
    .sort(
      (left, right) =>
        (verdict === "reach" ? left.gap - right.gap : right.gap - left.gap) ||
        left.pickNumber - right.pickNumber ||
        left.player.name.localeCompare(right.player.name)
    );
}

function MarketTable({
  title,
  verdict,
  entries,
  total,
}: {
  title: string;
  verdict: Exclude<DraftMarketVerdict, "at-cost">;
  entries: DraftMarketEntry[];
  total: number;
}) {
  return (
    <section
      className={`draft-market-section draft-market-section--${verdict}`}
      aria-labelledby={`draft-market-${verdict}-heading`}
    >
      <div className="draft-market-section__heading">
        <div>
          <span className={`draft-market-kicker draft-market-kicker--${verdict}`}>
            {verdict === "reach" ? "Ahead of market" : "Past the market"}
          </span>
          <h3 id={`draft-market-${verdict}-heading`}>{title}</h3>
        </div>
        <div className="draft-market-section__count">
          {entries.length === total ? entries.length : `${entries.length} / ${total}`}
        </div>
      </div>
      {entries.length === 0 ? (
        <div className="draft-market-empty draft-market-empty--compact">
          No {verdict === "reach" ? "reaches" : "steals"} match these filters.
        </div>
      ) : (
        <div className="draft-market-table-shell">
          <table className="draft-market-table">
            <caption className="draft-market-visually-hidden">
              {title}, ordered only by the difference between composite ADP and
              actual draft selection
            </caption>
            <thead>
              <tr>
                <th scope="col">#</th>
                <th scope="col">Player</th>
                <th scope="col">Drafted by</th>
                <th scope="col">Pick</th>
                <th scope="col">Comp ADP</th>
                <th scope="col">Market gap</th>
                <th scope="col" className="draft-market-performance-column">
                  Drafted-pos outcome
                </th>
                <th scope="col" className="draft-market-performance-column">
                  FPTS
                </th>
                <th scope="col" className="draft-market-performance-column">
                  PPG
                </th>
                <th scope="col" className="draft-market-performance-column">
                  Starts
                </th>
                <th scope="col" className="draft-market-performance-column">
                  Best week
                </th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry, index) => (
                <tr key={`${entry.manager.id}-${entry.pickNumber}`}>
                  <td className="draft-market-rank">{index + 1}</td>
                  <td>
                    <div className="draft-market-player">
                      <span
                        className="draft-market-position"
                        style={{
                          backgroundColor:
                            POSITION_COLORS[entry.player.position] ??
                            "var(--night-border)",
                        }}
                      >
                        {entry.player.position}
                      </span>
                      <span>
                        <strong>{entry.player.name}</strong>
                        <small>
                          {entry.nflTeamName}
                          {entry.player.injuryStatus
                            ? ` · ${entry.player.injuryStatus}`
                            : ""}
                        </small>
                      </span>
                    </div>
                  </td>
                  <td>{entry.manager.name}</td>
                  <td>
                    <strong>{entry.pickNumber}</strong>
                    <small className="draft-market-cell-note">
                      {formatDraftSlot(entry)}
                    </small>
                  </td>
                  <td>{formatAdp(entry.compositeAdp)}</td>
                  <td>
                    <span className={`draft-market-gap draft-market-gap--${verdict}`}>
                      {formatGap(entry)}
                    </span>
                  </td>
                  <td className="draft-market-performance-column">
                    {entry.player.position}
                    {entry.draftPositionRank ?? "—"}
                    <span aria-hidden="true"> → </span>
                    <span className="draft-market-visually-hidden"> to </span>
                    {entry.player.position}
                    {entry.finishPositionRank ?? "—"}
                  </td>
                  <td className="draft-market-performance-column">
                    {formatNumber(entry.player.total)}
                  </td>
                  <td className="draft-market-performance-column">
                    {formatNumber(entry.player.average)}
                  </td>
                  <td className="draft-market-performance-column">
                    {entry.starts}
                  </td>
                  <td className="draft-market-performance-column">
                    {entry.bestWeek
                      ? `W${entry.bestWeek.week} · ${formatNumber(
                          entry.bestWeek.points
                        )}`
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export function DraftDayReachesAndStealsForSeason({
  year,
  wrapped,
  composite,
}: {
  year: string;
  wrapped: WrappedType;
  composite: Record<string, number> | undefined;
}) {
  const [query, setQuery] = useState("");
  const [position, setPosition] = useState("all");
  const [managerId, setManagerId] = useState("all");

  const analysis = useMemo(
    () => (composite ? getDraftMarketAnalysis(wrapped, composite) : undefined),
    [composite, wrapped]
  );

  if (!composite) {
    return (
      <div className="draft-market-empty" role="status">
        <strong>Composite ADP is unavailable for {year}.</strong>
        <span>
          This ledger does not substitute ESPN ADP or use player performance to
          classify a pick.
        </span>
      </div>
    );
  }

  if (!analysis || analysis.totalPicks === 0) {
    return (
      <div className="draft-market-empty" role="status">
        <strong>No draft picks yet for {year}.</strong>
        <span>
          The ledger will classify picks as soon as the league draft is captured.
        </span>
      </div>
    );
  }

  const reaches = sortByMarketGap(analysis.entries, "reach");
  const steals = sortByMarketGap(analysis.entries, "steal");
  const atCost = analysis.entries.filter((entry) => entry.verdict === "at-cost");
  const biggestReach = reaches[0];
  const biggestSteal = steals[0];
  const normalizedQuery = query.trim().toLowerCase();
  const filtered = analysis.entries.filter(
    (entry) =>
      (position === "all" || entry.player.position === position) &&
      (managerId === "all" || entry.manager.id === managerId) &&
      (normalizedQuery.length === 0 ||
        [entry.player.name, entry.manager.name, entry.nflTeamName]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery))
  );
  const filteredReaches = sortByMarketGap(filtered, "reach");
  const filteredSteals = sortByMarketGap(filtered, "steal");
  const positions = Array.from(
    new Set(analysis.entries.map((entry) => entry.player.position))
  ).sort();
  const managers = Object.values(wrapped.ffTeams).sort((left, right) =>
    left.name.localeCompare(right.name)
  );

  return (
    <div className="draft-market-page">
      <header className="draft-market-intro">
        <div>
          <span className="draft-market-eyebrow">Composite board audit · {year}</span>
          <h2>The market call is locked at the draft.</h2>
          <p>
            Actual pick minus composite ADP sets every verdict. Negative is a
            reach; positive is a steal. Performance is shown only as the result
            that followed—it never changes the label or the order.
          </p>
        </div>
        <div className="draft-market-formula" aria-label="Classification formula">
          <span>actual pick</span>
          <b>−</b>
          <span>composite ADP</span>
          <b>=</b>
          <span>market gap</span>
        </div>
      </header>

      <div className="draft-market-summary" aria-label="Draft market summary">
        <article>
          <span>Classified picks</span>
          <strong>{analysis.entries.length}</strong>
          <small>
            {reaches.length} reaches · {steals.length} steals · {atCost.length} at ADP
          </small>
        </article>
        <article className="draft-market-summary--reach">
          <span>Biggest reach</span>
          <strong>{biggestReach?.player.name ?? "—"}</strong>
          <small>
            {biggestReach
              ? `${formatGap(biggestReach)} · ${biggestReach.manager.name}`
              : "No reach on the board"}
          </small>
        </article>
        <article className="draft-market-summary--steal">
          <span>Biggest steal</span>
          <strong>{biggestSteal?.player.name ?? "—"}</strong>
          <small>
            {biggestSteal
              ? `${formatGap(biggestSteal)} · ${biggestSteal.manager.name}`
              : "No steal on the board"}
          </small>
        </article>
        <article>
          <span>Performance snapshot</span>
          <strong>
            {wrapped.latestScoringPeriod
              ? `Through W${wrapped.latestScoringPeriod}`
              : "Season data"}
          </strong>
          <small>
            FPTS · PPG · drafted-pos outcome · league starts · best week
          </small>
        </article>
      </div>

      <div className="draft-market-controls" aria-label="Filter the ledger">
        <label>
          <span>Find</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.currentTarget.value)}
            placeholder="Player, manager, NFL team"
          />
        </label>
        <label>
          <span>Position</span>
          <select
            value={position}
            onChange={(event) => setPosition(event.currentTarget.value)}
          >
            <option value="all">All positions</option>
            {positions.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Manager</span>
          <select
            value={managerId}
            onChange={(event) => setManagerId(event.currentTarget.value)}
          >
            <option value="all">All managers</option>
            {managers.map((manager) => (
              <option key={manager.id} value={manager.id}>
                {manager.name}
              </option>
            ))}
          </select>
        </label>
        <div className="draft-market-filter-count" aria-live="polite">
          {filteredReaches.length + filteredSteals.length} market calls shown
        </div>
      </div>

      <MarketTable
        title="Reaches"
        verdict="reach"
        entries={filteredReaches}
        total={reaches.length}
      />
      <MarketTable
        title="Steals"
        verdict="steal"
        entries={filteredSteals}
        total={steals.length}
      />

      {analysis.unmatched.length > 0 && (
        <details className="draft-market-unmatched">
          <summary>
            {analysis.unmatched.length} of {analysis.totalPicks} picks excluded—no
            composite match
          </summary>
          <ul>
            {analysis.unmatched.map((pick) => (
              <li key={`${pick.managerName}-${pick.pickNumber}`}>
                #{pick.pickNumber} {pick.playerName} · {pick.managerName}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

export default function DraftDayReachesAndSteals() {
  return (
    <DraftDayReachesAndStealsForSeason
      year={selectedYear}
      wrapped={selectedWrapped()}
      composite={getCompositeForYear(selectedYear)}
    />
  );
}
