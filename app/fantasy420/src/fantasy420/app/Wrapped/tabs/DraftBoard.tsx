import { KeyboardEvent, useState } from "react";
import { selectedWrapped, selectedYear } from "..";
import { getCompositeForYear, POSITION_COLORS } from "../../Draft";
import { WrappedType } from "../../FetchWrapped";
import {
  DraftBoardColumn,
  DraftBoardGrid,
} from "./DraftBoardGrid";
import { getPerformance, PerformanceType } from "./DraftValue";

export type { DraftBoardColumn, DraftBoardEntry } from "./DraftBoardGrid";
export { formatDraftBoardSummary } from "./DraftBoardGrid";
export type DraftBoardOrder = "round" | "position";

const POSITION_ORDER = ["QB", "RB", "WR", "TE", "K", "DST"];

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

function positionIndex(position: string): number {
  const index = POSITION_ORDER.indexOf(position.toUpperCase());
  return index === -1 ? POSITION_ORDER.length : index;
}

export function sortDraftBoardColumns(
  columns: DraftBoardColumn[],
  order: DraftBoardOrder
): DraftBoardColumn[] {
  return columns.map((column) =>
    [...column].sort((left, right) => {
      if (order === "round") {
        return left.pick.pickIndex - right.pick.pickIndex;
      }

      const leftPosition = left.player.position.toUpperCase();
      const rightPosition = right.player.position.toUpperCase();
      return (
        positionIndex(leftPosition) - positionIndex(rightPosition) ||
        leftPosition.localeCompare(rightPosition) ||
        left.pick.pickIndex - right.pick.pickIndex
      );
    })
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
  const [order, setOrder] = useState<DraftBoardOrder>("round");
  const performance = getPerformance(wrapped);
  const columns = sortDraftBoardColumns(
    getDraftBoardColumns(wrapped, performance, getCompositeForYear(year)),
    order
  );

  const toggleOrder = () =>
    setOrder((current) => (current === "round" ? "position" : "round"));

  const toggleOrderFromKeyboard = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    toggleOrder();
  };

  if (columns.length === 0) {
    return <div>No draft picks yet for {year}.</div>;
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Draft board sorted by ${
        order === "round" ? "rounds" : "position"
      }. Click to sort by ${order === "round" ? "position" : "rounds"}.`}
      data-testid="draft-board"
      onClick={toggleOrder}
      onKeyDown={toggleOrderFromKeyboard}
      style={{
        cursor: "pointer",
        display: "inline-block",
        minWidth: "100%",
      }}
    >
      <div
        aria-live="polite"
        style={{
          color: "var(--night-text-muted)",
          fontSize: "0.8em",
          margin: "0 0.75em 0.35em",
        }}
      >
        Sorted by {order === "round" ? "rounds" : "position"} · click board
        to switch
      </div>
      <DraftBoardGrid
        columns={columns}
        getCardColor={(entry) => POSITION_COLORS[entry.player.position]}
      />
    </div>
  );
}
