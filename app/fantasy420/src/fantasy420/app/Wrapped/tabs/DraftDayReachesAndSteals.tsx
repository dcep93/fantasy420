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
  adp: number;
  gap: number;
  verdict: DraftMarketVerdict;
  draftPositionRank?: number;
  finishPositionRank?: number;
  starts: number;
  bestWeek?: { week: string; points: number };
};

export type DraftMarketAnalysis = {
  entries: DraftMarketEntry[];
  unmatched: {
    playerName: string;
    managerName: string;
    pickNumber: number;
  }[];
  totalPicks: number;
};

const EXCLUDED_POSITIONS = new Set(["K", "DST", "D/ST"]);

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
  adpByPlayerId: Record<string, number>
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
  const unmatched: DraftMarketAnalysis["unmatched"] = [];

  const entries = managers.flatMap((manager) =>
    manager.draft.flatMap((pick) => {
      const playerId = String(pick.playerId);
      const player = wrapped.nflPlayers[playerId];
      const pickNumber = pick.pickIndex + 1;

      if (!player) {
        unmatched.push({
          playerName: `Player ${playerId}`,
          managerName: manager.name,
          pickNumber,
        });
        return [];
      }

      if (EXCLUDED_POSITIONS.has(player.position.toUpperCase())) return [];

      const adp = adpByPlayerId[playerId];
      if (adp === undefined) {
        unmatched.push({
          playerName: player.name,
          managerName: manager.name,
          pickNumber,
        });
        return [];
      }

      const gap = pickNumber - adp;
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
          adp,
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

function formatNumber(value: number): string {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

function formatAdp(value: number): string {
  return Number.isInteger(value) ? String(value) : formatNumber(value);
}

function formatGap(entry: Pick<DraftMarketEntry, "gap" | "verdict">) {
  const distance = formatAdp(Math.abs(entry.gap));
  return `${distance} ${entry.verdict === "reach" ? "early" : "late"}`;
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
}: {
  title: string;
  verdict: Exclude<DraftMarketVerdict, "at-cost">;
  entries: DraftMarketEntry[];
}) {
  return (
    <section className={`draft-market-section draft-market-section--${verdict}`}>
      <h2>
        {title} <span>{entries.length}</span>
      </h2>
      {entries.length === 0 ? (
        <p className="draft-market-empty">No {title.toLowerCase()}.</p>
      ) : (
        <div className="draft-market-table-shell">
          <table className="draft-market-table">
            <caption className="draft-market-visually-hidden">
              {title}, ordered by the difference between ADP and draft selection
            </caption>
            <thead>
              <tr>
                <th scope="col">#</th>
                <th scope="col">Player</th>
                <th scope="col">Drafted by</th>
                <th scope="col">Pick</th>
                <th scope="col">ADP</th>
                <th scope="col">Gap</th>
                <th scope="col">Pos outcome</th>
                <th scope="col">FPTS</th>
                <th scope="col">PPG</th>
                <th scope="col">Starts</th>
                <th scope="col">Best week</th>
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
                        <small>{entry.nflTeamName}</small>
                      </span>
                    </div>
                  </td>
                  <td>{entry.manager.name}</td>
                  <td>
                    <strong>{entry.pickNumber}</strong>
                    <small>
                      {entry.round}.{String(entry.roundPick).padStart(2, "0")}
                    </small>
                  </td>
                  <td>{formatAdp(entry.adp)}</td>
                  <td>
                    <span className={`draft-market-gap draft-market-gap--${verdict}`}>
                      {formatGap(entry)}
                    </span>
                  </td>
                  <td>
                    {entry.player.position}
                    {entry.draftPositionRank ?? "—"} → {entry.player.position}
                    {entry.finishPositionRank ?? "—"}
                  </td>
                  <td>{formatNumber(entry.player.total)}</td>
                  <td>{formatNumber(entry.player.average)}</td>
                  <td>{entry.starts}</td>
                  <td>
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
  if (!composite) {
    return <p className="draft-market-empty">ADP unavailable for {year}.</p>;
  }

  const analysis = getDraftMarketAnalysis(wrapped, composite);
  if (analysis.totalPicks === 0) {
    return <p className="draft-market-empty">No draft picks yet for {year}.</p>;
  }

  return (
    <div className="draft-market-page">
      <MarketTable
        title="Reaches"
        verdict="reach"
        entries={sortByMarketGap(analysis.entries, "reach")}
      />
      <MarketTable
        title="Steals"
        verdict="steal"
        entries={sortByMarketGap(analysis.entries, "steal")}
      />
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
