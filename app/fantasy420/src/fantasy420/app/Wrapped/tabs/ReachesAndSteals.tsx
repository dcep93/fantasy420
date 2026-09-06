import { selectedWrapped, selectedYear } from "..";
import { getCompositeForYear } from "../../Draft";
import { WrappedType } from "../../FetchWrapped";
import { getDraftBoardColumns } from "./DraftBoard";
import { DraftBoardEntry, DraftBoardGrid } from "./DraftBoardGrid";
import { getPerformance } from "./DraftValue";

export type ReachStealVerdict = "reach" | "steal" | "neutral";

export const REACH_STEAL_COLORS: Record<ReachStealVerdict, string> = {
  reach: "#ff9f68",
  steal: "#69db9c",
  neutral: "#aab4c0",
};

export function getReachStealVerdict(
  pickIndex: number,
  compositeRank: number | undefined
): ReachStealVerdict {
  if (compositeRank === undefined || pickIndex + 1 === compositeRank) {
    return "neutral";
  }
  return pickIndex + 1 < compositeRank ? "reach" : "steal";
}

function getEntryVerdict(entry: DraftBoardEntry): ReachStealVerdict {
  return getReachStealVerdict(entry.pick.pickIndex, entry.compositeRank);
}

export function ReachesAndStealsForSeason({
  year,
  wrapped,
  composite,
}: {
  year: string;
  wrapped: WrappedType;
  composite: Record<string, number> | undefined;
}) {
  if (!composite) {
    return <p className="draft-board-empty">ADP unavailable for {year}.</p>;
  }

  const columns = getDraftBoardColumns(
    wrapped,
    getPerformance(wrapped),
    composite
  );

  if (columns.length === 0) {
    return <p className="draft-board-empty">No draft picks yet for {year}.</p>;
  }

  return (
    <div
      data-testid="reaches-and-steals-board"
      style={{ display: "inline-block", minWidth: "100%" }}
    >
      <DraftBoardGrid
        columns={columns}
        pickTestIdPrefix="reach-steal-pick"
        getCardColor={(entry) => REACH_STEAL_COLORS[getEntryVerdict(entry)]}
        getCardLabel={(entry) =>
          `${entry.player.name}: ${getEntryVerdict(entry)}`
        }
      />
    </div>
  );
}

export default function ReachesAndSteals() {
  return (
    <ReachesAndStealsForSeason
      year={selectedYear}
      wrapped={selectedWrapped()}
      composite={getCompositeForYear(selectedYear)}
    />
  );
}
