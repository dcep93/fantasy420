import { ReactNode } from "react";

import { bubbleStyle } from "..";
import { WrappedType } from "../../FetchWrapped";
import { PerformanceType } from "./DraftValue";
import "./DraftBoardGrid.css";

export type DraftBoardEntry = {
  compositeRank?: number;
  performance?: PerformanceType[string];
  pick: WrappedType["ffTeams"][string]["draft"][number];
  player: WrappedType["nflPlayers"][string];
  team: WrappedType["ffTeams"][string];
};

export type DraftBoardColumn = DraftBoardEntry[];

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

export function DraftBoardCardContent({ entry }: { entry: DraftBoardEntry }) {
  return (
    <>
      <div>
        {formatDraftBoardSummary({
          pickIndex: entry.pick.pickIndex,
          compositeRank: entry.compositeRank,
          position: entry.player.position,
          draftRank: entry.performance?.draftRank,
          performanceRank: entry.performance?.totalRank,
        })}
      </div>
      <div className="draft-board-grid__player-name">{entry.player.name}</div>
    </>
  );
}

export function DraftBoardGrid({
  columns,
  getCardColor,
  getCardLabel,
  pickTestIdPrefix = "draft-pick",
  renderCardContent,
}: {
  columns: DraftBoardColumn[];
  getCardColor: (entry: DraftBoardEntry) => string | undefined;
  getCardLabel?: (entry: DraftBoardEntry) => string | undefined;
  pickTestIdPrefix?: string;
  renderCardContent?: (entry: DraftBoardEntry) => ReactNode;
}) {
  return (
    <div className="draft-board-grid" data-testid="draft-board-grid">
      {columns.map((column) => (
        <div
          className="draft-board-grid__column"
          key={column[0].team.id}
          data-testid={`draft-board-column-${column[0].team.id}`}
        >
          <div
            className="draft-board-grid__header"
            style={bubbleStyle}
            title={column[0].team.name}
          >
            {column[0].team.name}
          </div>
          {column.map((entry) => (
            <div
              className="draft-board-grid__card"
              key={entry.pick.pickIndex}
              data-testid={`${pickTestIdPrefix}-${entry.pick.pickIndex}`}
              aria-label={getCardLabel?.(entry)}
              role={getCardLabel ? "group" : undefined}
              style={{
                ...bubbleStyle,
                backgroundColor: getCardColor(entry),
              }}
            >
              {renderCardContent ? (
                renderCardContent(entry)
              ) : (
                <DraftBoardCardContent entry={entry} />
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
