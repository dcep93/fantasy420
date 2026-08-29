import { fireEvent, render, screen, within } from "@testing-library/react";

import { getCompositeForYear } from "../../Draft/yearComposite";
import allWrapped from "../allWrapped";
import {
  DraftBoardForSeason,
  DraftBoardColumn,
  formatDraftBoardSummary,
  getDraftBoardColumns,
  sortDraftBoardColumns,
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

test("sorts picks by position without changing manager columns", () => {
  const columns = getDraftBoardColumns(
    allWrapped["2025"],
    getPerformance(allWrapped["2025"]),
    getCompositeForYear("2025")
  );
  const originalTeamIds = columns.map((column) => column[0].team.id);
  const sorted = sortDraftBoardColumns(columns, "position");

  expect(sorted.map((column) => column[0].team.id)).toEqual(originalTeamIds);
  expect(
    sorted.every((column) =>
      column.every((entry) => entry.team.id === column[0].team.id)
    )
  ).toBe(true);

  const positionOrder = ["QB", "RB", "WR", "TE", "K", "DST"];
  sorted.forEach((column) => {
    const indexes = column.map((entry) => {
      const index = positionOrder.indexOf(entry.player.position);
      return index === -1 ? positionOrder.length : index;
    });
    expect(indexes).toEqual([...indexes].sort((left, right) => left - right));
  });
});

test("keeps same-position and unknown-position picks in stable order", () => {
  const makeEntry = (
    position: string,
    pickIndex: number
  ): DraftBoardColumn[number] =>
    ({
      pick: { pickIndex, playerId: pickIndex },
      player: { id: String(pickIndex), name: String(pickIndex), position },
      team: { id: "team", name: "Manager" },
    } as DraftBoardColumn[number]);
  const sorted = sortDraftBoardColumns(
    [
      [
        makeEntry("P", 4),
        makeEntry("WR", 8),
        makeEntry("QB", 9),
        makeEntry("WR", 2),
        makeEntry("DL", 6),
      ],
    ],
    "position"
  )[0];

  expect(
    sorted.map((entry) => [entry.player.position, entry.pick.pickIndex])
  ).toEqual([
    ["QB", 9],
    ["WR", 2],
    ["WR", 8],
    ["DL", 6],
    ["P", 4],
  ]);
});

test("toggles the whole board between round and position order", () => {
  render(<DraftBoardForSeason year="2025" wrapped={allWrapped["2025"]} />);
  const board = screen.getByTestId("draft-board");
  const firstColumn = screen.getByTestId("draft-board-column-1");
  const pickIndexes = () =>
    within(firstColumn)
      .getAllByTestId(/^draft-pick-/)
      .map((element) =>
        Number(element.dataset.testid?.replace("draft-pick-", ""))
      );
  const roundOrder = pickIndexes();

  expect(board).toHaveAccessibleName(/sorted by rounds/i);
  expect(roundOrder).toEqual(
    [...roundOrder].sort((left, right) => left - right)
  );

  fireEvent.click(within(firstColumn).getAllByTestId(/^draft-pick-/)[0]);
  expect(board).toHaveAccessibleName(/sorted by position/i);
  expect(pickIndexes()).not.toEqual(roundOrder);

  board.focus();
  fireEvent.keyDown(board, { key: "Enter" });
  expect(board).toHaveAccessibleName(/sorted by rounds/i);

  fireEvent.keyDown(board, { key: " " });
  expect(board).toHaveAccessibleName(/sorted by position/i);
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
