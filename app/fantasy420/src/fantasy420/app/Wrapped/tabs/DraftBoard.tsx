import { bubbleStyle, selectedWrapped, selectedYear } from "..";
import { getCompositeForYear, POSITION_COLORS } from "../../Draft";
import { WrappedType } from "../../FetchWrapped";
import { getPerformance, PerformanceType } from "./DraftValue";

type DraftBoardColumn = {
  compositeRank?: number;
  performance?: PerformanceType[string];
  pick: WrappedType["ffTeams"][string]["draft"][number];
  player: WrappedType["nflPlayers"][string];
  team: WrappedType["ffTeams"][string];
}[];

function formatRank(rank: number | undefined, zeroBased = false): string {
  if (rank === undefined) return "—";
  return String(zeroBased ? rank + 1 : rank);
}

export function formatDraftBoardSummary({
  pickIndex,
  compositeRank,
  position,
  draftRank,
  performanceRank,
}: {
  pickIndex: number;
  compositeRank?: number;
  position: string;
  draftRank?: number;
  performanceRank?: number;
}): string {
  return `${pickIndex + 1} / ${formatRank(
    compositeRank
  )}) ${position}${formatRank(draftRank, true)}/${position}${formatRank(
    performanceRank,
    true
  )}`;
}

export function getDraftBoardColumns(
  wrapped: WrappedType,
  performance: PerformanceType,
  composite: Record<string, number> | undefined
): DraftBoardColumn[] {
  return Object.values(wrapped.ffTeams)
    .map((team) =>
      team.draft
        .flatMap((pick) => {
          const player = wrapped.nflPlayers[pick.playerId];
          if (!player) return [];
          return [
            {
              compositeRank: composite?.[pick.playerId],
              performance: performance[pick.playerId],
              pick,
              player,
              team,
            },
          ];
        })
        .sort((left, right) => left.pick.pickIndex - right.pick.pickIndex)
    )
    .filter((column) => column.length > 0)
    .sort(
      (left, right) => left[0].pick.pickIndex - right[0].pick.pickIndex
    );
}

export default function DraftBoard() {
  return <DraftBoardForSeason year={selectedYear} wrapped={selectedWrapped()} />;
}

export function DraftBoardForSeason({
  year,
  wrapped,
}: {
  year: string;
  wrapped: WrappedType;
}) {
  const performance = getPerformance(wrapped);
  const columns = getDraftBoardColumns(
    wrapped,
    performance,
    getCompositeForYear(year)
  );

  if (columns.length === 0) {
    return <div>No draft picks yet for {year}.</div>;
  }

  return (
    <div>
      <div style={{ display: "flex" }}>
        {columns.map((column, i) => (
            <div
              key={i}
              style={{
                display: "inline-flex",
                flexDirection: "column",
              }}
            >
              {column.map((entry) => (
                <div
                  key={entry.pick.pickIndex}
                  style={{
                    ...bubbleStyle,
                    fontSize: "0.7em",
                    width: "15em",
                    height: "6em",
                    color: "var(--night-position-text)",
                    backgroundColor: POSITION_COLORS[entry.player.position],
                  }}
                >
                  <div>
                    {formatDraftBoardSummary({
                      pickIndex: entry.pick.pickIndex,
                      compositeRank: entry.compositeRank,
                      position: entry.player.position,
                      draftRank: entry.performance?.draftRank,
                      performanceRank: entry.performance?.totalRank,
                    })}
                  </div>
                  <div style={{ fontWeight: "bold" }}>{entry.player.name}</div>
                  <div>{entry.team.name}</div>
                </div>
              ))}
            </div>
          ))}
      </div>
    </div>
  );
}
