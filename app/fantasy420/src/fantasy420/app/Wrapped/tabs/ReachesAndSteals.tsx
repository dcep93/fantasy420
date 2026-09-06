import { selectedWrapped, selectedYear } from "..";
import { getCompositeForYear } from "../../Draft";
import { WrappedType } from "../../FetchWrapped";
import { getDraftBoardColumns } from "./DraftBoard";
import {
  DraftBoardCardContent,
  DraftBoardEntry,
  DraftBoardGrid,
} from "./DraftBoardGrid";
import { getPerformance } from "./DraftValue";

export type ReachStealVerdict = "reach" | "steal" | "neutral";

export type ReachStealResult = {
  color: string;
  gap?: number;
  intensity: number;
  label: string;
  verdict: ReachStealVerdict;
};

export const REACH_STEAL_COLORS = {
  neutral: "#aab4c0",
  reach: "#ff7b45",
  steal: "#38c976",
} as const;

export const REACH_STEAL_MAX_GAP = 30;
export const REACH_STEAL_MIN_INTENSITY = 0.25;

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}

function hexToRgb(color: string): [number, number, number] {
  return [1, 3, 5].map((offset) =>
    Number.parseInt(color.slice(offset, offset + 2), 16)
  ) as [number, number, number];
}

function toHex(value: number): string {
  return Math.round(value).toString(16).padStart(2, "0");
}

function mixHexColors(from: string, to: string, amount: number): string {
  const start = hexToRgb(from);
  const end = hexToRgb(to);
  return `#${start
    .map((channel, index) =>
      toHex(channel + (end[index] - channel) * clamp(amount, 0, 1))
    )
    .join("")}`;
}

function formatGapMagnitude(magnitude: number): string {
  return Number.isInteger(magnitude)
    ? String(magnitude)
    : magnitude.toFixed(1);
}

export function getReachStealColor(
  verdict: ReachStealVerdict,
  magnitude: number
): { color: string; intensity: number } {
  if (verdict === "neutral" || magnitude <= 0) {
    return { color: REACH_STEAL_COLORS.neutral, intensity: 0 };
  }

  const intensity =
    REACH_STEAL_MIN_INTENSITY +
    (1 - REACH_STEAL_MIN_INTENSITY) *
      clamp(magnitude / REACH_STEAL_MAX_GAP, 0, 1);

  return {
    color: mixHexColors(
      REACH_STEAL_COLORS.neutral,
      REACH_STEAL_COLORS[verdict],
      intensity
    ),
    intensity,
  };
}

export function getReachStealResult(
  pickIndex: number,
  compositeRank: number | undefined
): ReachStealResult {
  if (compositeRank === undefined) {
    return {
      ...getReachStealColor("neutral", 0),
      label: "No ADP",
      verdict: "neutral",
    };
  }

  const gap = pickIndex + 1 - compositeRank;
  if (gap === 0) {
    return {
      ...getReachStealColor("neutral", 0),
      gap,
      label: "At ADP",
      verdict: "neutral",
    };
  }

  const verdict = gap < 0 ? "reach" : "steal";
  return {
    ...getReachStealColor(verdict, Math.abs(gap)),
    gap,
    label: `${verdict === "reach" ? "Reach" : "Steal"} ${formatGapMagnitude(
      Math.abs(gap)
    )}`,
    verdict,
  };
}

export function getReachStealVerdict(
  pickIndex: number,
  compositeRank: number | undefined
): ReachStealVerdict {
  return getReachStealResult(pickIndex, compositeRank).verdict;
}

function getEntryResult(entry: DraftBoardEntry): ReachStealResult {
  return getReachStealResult(entry.pick.pickIndex, entry.compositeRank);
}

function ReachesAndStealsLegend() {
  const lightReach = getReachStealColor("reach", 1).color;
  const strongReach = getReachStealColor("reach", REACH_STEAL_MAX_GAP).color;
  const lightSteal = getReachStealColor("steal", 1).color;
  const strongSteal = getReachStealColor("steal", REACH_STEAL_MAX_GAP).color;

  return (
    <div
      className="reach-steal-legend"
      aria-label="Reach and steal color legend"
    >
      <span className="reach-steal-legend__item">
        Reach
        <span
          className="reach-steal-legend__scale"
          style={{
            background: `linear-gradient(90deg, ${lightReach}, ${strongReach})`,
          }}
        />
      </span>
      <span className="reach-steal-legend__item">
        <span
          className="reach-steal-legend__neutral"
          style={{ backgroundColor: REACH_STEAL_COLORS.neutral }}
        />
        At/No ADP
      </span>
      <span className="reach-steal-legend__item">
        Steal
        <span
          className="reach-steal-legend__scale"
          style={{
            background: `linear-gradient(90deg, ${lightSteal}, ${strongSteal})`,
          }}
        />
      </span>
      <span className="reach-steal-legend__note">
        Stronger color = larger ADP gap
      </span>
    </div>
  );
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
      className="reaches-and-steals"
      data-testid="reaches-and-steals-board"
      style={{ display: "inline-block", minWidth: "100%" }}
    >
      <ReachesAndStealsLegend />
      <DraftBoardGrid
        columns={columns}
        pickTestIdPrefix="reach-steal-pick"
        getCardColor={(entry) => getEntryResult(entry).color}
        getCardLabel={(entry) =>
          `${entry.player.name}: ${getEntryResult(entry).label}`
        }
        renderCardContent={(entry) => (
          <>
            <DraftBoardCardContent entry={entry} />
            <div className="draft-board-grid__metadata">
              {getEntryResult(entry).label}
            </div>
          </>
        )}
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
