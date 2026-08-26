import { render, screen } from "@testing-library/react";

import { getCompositeForYear } from "../../Draft/yearComposite";
import allWrapped from "../allWrapped";
import {
  DraftBoardForSeason,
  formatDraftBoardSummary,
  getDraftBoardColumns,
} from "./DraftBoard";
import { getPerformance } from "./DraftValue";

test("formats pick, composite ADP, and both positional ranks", () => {
  expect(
    formatDraftBoardSummary({
      pickIndex: 19,
      compositeRank: 14,
      position: "WR",
      draftRank: 7,
      performanceRank: 32,
    })
  ).toBe("20 / 14) WR8/WR33");

  expect(
    formatDraftBoardSummary({
      pickIndex: 19,
      position: "WR",
      draftRank: 7,
    })
  ).toBe("20 / —) WR8/WR—");
});

test("drops empty manager columns instead of reading a missing first pick", () => {
  expect(
    getDraftBoardColumns(allWrapped["2026"], {}, getCompositeForYear("2026"))
  ).toEqual([]);
});

test("switches seasons without substituting another year's composite", () => {
  const { rerender } = render(
    <DraftBoardForSeason year="2025" wrapped={allWrapped["2025"]} />
  );
  const first2025Entry = getDraftBoardColumns(
    allWrapped["2025"],
    getPerformance(allWrapped["2025"]),
    getCompositeForYear("2025")
  )
    .flat()
    .sort((left, right) => left.pick.pickIndex - right.pick.pickIndex)[0];
  const first2025Summary = formatDraftBoardSummary({
    pickIndex: first2025Entry.pick.pickIndex,
    compositeRank: first2025Entry.compositeRank,
    position: first2025Entry.player.position,
    draftRank: first2025Entry.performance?.draftRank,
    performanceRank: first2025Entry.performance?.totalRank,
  });
  expect(screen.getByText(first2025Summary)).toBeInTheDocument();

  rerender(<DraftBoardForSeason year="2021" wrapped={allWrapped["2021"]} />);
  expect(screen.getAllByText(/^\d+ \/ —\) /).length).toBeGreaterThan(0);

  rerender(<DraftBoardForSeason year="2026" wrapped={allWrapped["2026"]} />);
  expect(screen.getByText("No draft picks yet for 2026.")).toBeInTheDocument();
});
