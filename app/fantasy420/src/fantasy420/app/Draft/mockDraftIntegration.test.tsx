import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";

import Draft from ".";
import {
  getPersonalScoresStorageKey,
  readPersonalScores,
} from "./personalScores";

const LEGACY_ACTIVE_MOCK_DRAFT_STORAGE_KEY =
  "fantasy420:draft:active-mock-draft";

function changeSetting(label: string, value: string): void {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

function startDraft(options?: {
  draftPosition?: number;
  teamCount?: number;
  craziness?: string;
  seed?: string;
  roster?: Record<string, number>;
}): void {
  changeSetting("draft position", String(options?.draftPosition ?? 1));
  changeSetting("number of teams", String(options?.teamCount ?? 2));
  if (options?.craziness !== undefined) {
    changeSetting("craziness", options.craziness);
  }
  if (options?.seed !== undefined) changeSetting("seed", options.seed);
  Object.entries(options?.roster ?? {}).forEach(([slot, value]) => {
    changeSetting(`${slot} slots`, String(value));
  });
  fireEvent.click(screen.getByRole("button", { name: "mock draft" }));
}

function boardPlayerNames(container: HTMLElement): string[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      '[data-team-column] .mock-draft-player-name'
    )
  ).map((element) => element.textContent ?? "");
}

afterEach(() => {
  window.history.replaceState(null, "", "/");
  window.localStorage.clear();
  window.chrome = undefined;
});

test("loads, saves, and clears personal scores without drafting the row", () => {
  window.localStorage.setItem(
    getPersonalScoresStorageKey("2026"),
    JSON.stringify({ "4429795": 7 })
  );
  const rendered = render(<Draft />);

  const scoreHeader = screen.getByRole("columnheader", { name: "My score" });
  expect(scoreHeader).toBeInTheDocument();
  expect(scoreHeader).toBe(
    rendered.container.querySelector("thead th:first-child")
  );
  expect(screen.getByLabelText("My score for Jahmyr Gibbs")).toHaveValue(7);

  const input = rendered.container.querySelector<HTMLInputElement>(
    'tbody input[aria-label^="My score for "]'
  )!;
  const row = input.closest("tr")!;
  expect(input.closest("td")).toBe(row.querySelector("td:first-child"));
  expect(row).toHaveAttribute("data-drafted", "false");

  fireEvent.click(input);
  fireEvent.change(input, { target: { value: "5" } });

  expect(row).toHaveAttribute("data-drafted", "false");
  const saved = JSON.parse(
    window.localStorage.getItem(getPersonalScoresStorageKey("2026"))!
  );
  expect(Object.values(saved)).toContain(5);
  const editedPlayerId = Object.entries(saved).find(([, score]) => score === 5)![0];

  fireEvent.change(input, { target: { value: "" } });
  expect(readPersonalScores("2026")[editedPlayerId]).toBeUndefined();
  rendered.unmount();
});

test("inspects personal scores by absolute magnitude until a source is selected", () => {
  const rendered = render(<Draft />);
  const inputs = Array.from(
    rendered.container.querySelectorAll<HTMLInputElement>(
      'tbody input[aria-label^="My score for "]'
    )
  );
  const positiveLabel = inputs[0].getAttribute("aria-label")!;
  const negativeLabel = inputs[1].getAttribute("aria-label")!;

  fireEvent.change(screen.getByLabelText(positiveLabel), {
    target: { value: "5" },
  });
  fireEvent.change(screen.getByLabelText(negativeLabel), {
    target: { value: "-10" },
  });

  const header = screen.getByRole("columnheader", { name: "My score" });
  fireEvent.doubleClick(header);

  expect(header).toHaveAttribute("aria-pressed", "true");
  expect(
    rendered.container
      .querySelector<HTMLInputElement>(
        'tbody tr:first-child input[aria-label^="My score for "]'
      )
      ?.getAttribute("aria-label")
  ).toBe(negativeLabel);

  const normalSource = Array.from(
    rendered.container.querySelectorAll<HTMLElement>(
      ".draft-rankings-controls li span"
    )
  ).find((item) => item.textContent && item.textContent !== "composite")!;
  fireEvent.click(normalSource);
  expect(header).toHaveAttribute("aria-pressed", "false");
  rendered.unmount();
});

test("strongly highlights the selected bye week and matching bye cells", () => {
  const rendered = render(<Draft />);
  const week = screen.getByRole("button", { name: "filter bye week 11" });

  expect(week).toHaveAttribute("aria-pressed", "false");
  fireEvent.click(week);

  expect(week).toHaveAttribute("aria-pressed", "true");
  expect(week.style.backgroundColor).toBe("var(--night-focus)");
  expect(week.style.borderColor).toBe("var(--night-focus)");
  expect(week.style.color).toBe("var(--night-position-text)");
  expect(week.style.fontWeight).toBe("700");
  const matches = Array.from(
    rendered.container.querySelectorAll<HTMLElement>(
      '[data-bye-week-match="true"]'
    )
  );
  expect(matches.length).toBeGreaterThan(0);
  matches.forEach((cell) => {
    expect(cell).toHaveTextContent(/\/11\//);
    expect(cell.style.backgroundColor).toBe("var(--night-focus)");
    expect(cell.style.color).toBe("var(--night-position-text)");
    expect(cell.style.fontWeight).toBe("700");
  });
  const draftedMatch = matches[0];
  fireEvent.click(draftedMatch);
  expect(draftedMatch.closest("tr")).toHaveClass("draft-player-drafted");
  expect(draftedMatch.style.backgroundColor).toBe("var(--night-focus)");
  expect(draftedMatch.style.color).toBe("var(--night-position-text)");
  const nonmatch = rendered.container.querySelector<HTMLElement>(
    '[data-bye-week-match="false"]'
  )!;
  expect(nonmatch.style.backgroundColor).toBe("");

  fireEvent.click(week);
  expect(week).toHaveAttribute("aria-pressed", "false");
  expect(
    rendered.container.querySelector('[data-bye-week-match="true"]')
  ).toBeNull();
});

test("reload starts fresh and removes obsolete active-draft storage", () => {
  const sendMessage = vi.fn();
  window.chrome = { runtime: { sendMessage, lastError: null } };
  window.history.replaceState(null, "", "/draft");
  window.localStorage.setItem(
    LEGACY_ACTIVE_MOCK_DRAFT_STORAGE_KEY,
    JSON.stringify({ stale: true })
  );

  const first = render(<Draft />);
  startDraft({ seed: "ephemeral" });

  expect(screen.getByTestId("mock-draft-panel")).toBeInTheDocument();
  expect(sendMessage).not.toHaveBeenCalled();
  expect(
    window.localStorage.getItem(LEGACY_ACTIVE_MOCK_DRAFT_STORAGE_KEY)
  ).toBeNull();
  expect(window.location.pathname).toBe("/draft");
  expect(window.location.hash).toBe("");
  first.unmount();

  render(<Draft />);
  expect(screen.queryByTestId("mock-draft-panel")).not.toBeInTheDocument();
  expect(screen.getByLabelText("number of teams")).toHaveValue(2);
  expect(screen.getByLabelText("seed")).toHaveValue("");
});

test("removes a legacy draft hash without importing its state", () => {
  window.history.replaceState(null, "", "/draft?year=2026#draft=legacy");

  render(<Draft />);

  expect(window.location.pathname).toBe("/draft");
  expect(window.location.search).toBe("?year=2026");
  expect(window.location.hash).toBe("");
  expect(screen.queryByTestId("mock-draft-panel")).not.toBeInTheDocument();
});

test("clicking a user rank rewinds the in-memory draft for rechoice", () => {
  window.history.replaceState(null, "", "/draft");
  const rendered = render(<Draft />);
  startDraft({ seed: "rank-rechoose" });
  fireEvent.click(
    rendered.container.querySelector('tbody tr[data-mock-available="true"]')!
  );
  fireEvent.click(screen.getAllByLabelText("rechoose pick 1.01")[0]);

  expect(boardPlayerNames(rendered.container)).toEqual([]);
  expect(window.location.hash).toBe("");
  expect(screen.getByText("your pick 1.01")).toBeInTheDocument();
});

test("keeps the reported rank-forty-one seed disciplined in round one", () => {
  window.history.replaceState(null, "", "/draft");
  const rendered = render(<Draft />);

  fireEvent.change(screen.getByLabelText("seed"), {
    target: { value: "1tq1jn01gkmamd" },
  });
  fireEvent.click(screen.getByRole("button", { name: "mock draft" }));

  const ranks = Array.from(
    rendered.container.querySelectorAll(".mock-draft-rank")
  ).map((element) => Number(element.textContent?.slice(1)));
  expect(ranks).toHaveLength(7);
  expect(Math.max(...ranks)).toBeLessThan(10);
  rendered.unmount();
});

test("keeps the reported Hurts-Lawrence seed disciplined in round one", () => {
  window.history.replaceState(null, "", "/draft");
  const rendered = render(<Draft />);

  fireEvent.change(screen.getByLabelText("seed"), {
    target: { value: "25azysawidzz" },
  });
  fireEvent.click(screen.getByRole("button", { name: "mock draft" }));

  const compositeRanks = Array.from(
    rendered.container.querySelectorAll(".mock-draft-composite-rank")
  ).map((element) => Number(element.textContent?.replace(" ADP", "")));
  expect(compositeRanks).toEqual([3, 1, 5, 4, 7, 2, 6]);

  fireEvent.click(
    rendered.container.querySelector('tbody tr[data-mock-available="true"]')!
  );
  const afterUserPick = boardPlayerNames(rendered.container);
  expect(afterUserPick).toHaveLength(12);
  expect(afterUserPick).not.toContain("Trevor Lawrence");
  expect(window.location.hash).toBe("");
  rendered.unmount();
});

test("keeps opponent picks on the raw composite when My score changes", () => {
  function runDraft(container: HTMLElement): string[] {
    startDraft({
      draftPosition: 2,
      craziness: "0.000001",
      seed: "raw-composite-opponents",
    });
    return boardPlayerNames(container);
  }

  window.history.replaceState(null, "", "/draft");
  const baseline = render(<Draft />);
  const baselinePicks = runDraft(baseline.container);
  expect(baselinePicks).toHaveLength(1);
  baseline.unmount();

  window.history.replaceState(null, "", "/draft");
  const adjusted = render(<Draft />);
  const originalFirstInput = adjusted.container.querySelector<HTMLInputElement>(
    'tbody tr:first-child input[aria-label^="My score for "]'
  )!;
  const originalFirstLabel = originalFirstInput.getAttribute("aria-label");
  fireEvent.change(originalFirstInput, { target: { value: "-100000" } });
  expect(
    adjusted.container
      .querySelector<HTMLInputElement>(
        'tbody tr:first-child input[aria-label^="My score for "]'
      )
      ?.getAttribute("aria-label")
  ).not.toBe(originalFirstLabel);

  expect(runDraft(adjusted.container)).toEqual(baselinePicks);
  adjusted.unmount();
});

test("hides kickers only while mock-draft mode is active", () => {
  window.history.replaceState(null, "", "/draft");
  const active = render(<Draft />);
  startDraft({ seed: "hide-kickers" });
  expect(
    active.container.querySelector('[data-position-filter="K"]')
  ).not.toBeInTheDocument();
  expect(
    Array.from(active.container.querySelectorAll("tbody tr")).some(
      (row) =>
        Array.from(row.children).some((cell) =>
          cell.textContent?.startsWith("K ")
        )
    )
  ).toBe(false);
  active.unmount();

  window.history.replaceState(null, "", "/draft");
  const normal = render(<Draft />);
  expect(
    normal.container.querySelector('[data-position-filter="K"]')
  ).toBeInTheDocument();
  expect(
    Array.from(normal.container.querySelectorAll("tbody tr")).some(
      (row) =>
        Array.from(row.children).some((cell) =>
          cell.textContent?.startsWith("K ")
        )
    )
  ).toBe(true);
  normal.unmount();
});

test("keeps pending setting edits out of the active draft until restart", () => {
  window.history.replaceState(null, "", "/draft");
  const rendered = render(<Draft />);
  startDraft({ seed: "active-seed" });

  changeSetting("craziness", "7");
  changeSetting("seed", "replacement-seed");

  expect(window.location.hash).toBe("");
  expect(boardPlayerNames(rendered.container)).toEqual([]);

  fireEvent.click(rendered.container.querySelector("tbody tr")!);
  expect(boardPlayerNames(rendered.container)).toHaveLength(3);
  expect(screen.getByLabelText("craziness")).toHaveValue(7);
  expect(screen.getByLabelText("seed")).toHaveValue("replacement-seed");

  fireEvent.click(screen.getByRole("button", { name: "mock draft" }));
  expect(boardPlayerNames(rendered.container)).toEqual([]);
  rendered.unmount();
});

test("drafts an existing table row into ephemeral state", () => {
  window.history.replaceState(null, "", "/draft");
  const rendered = render(<Draft />);
  startDraft({
    seed: "row-click",
    roster: {
      QB: 1,
      RB: 0,
      WR: 0,
      TE: 0,
      FLEX: 0,
      SUPERFLEX: 0,
      DST: 0,
      BENCH: 0,
    },
  });
  const firstRow = rendered.container.querySelector("tbody tr");
  expect(firstRow).not.toBeNull();
  fireEvent.click(firstRow!);

  expect(boardPlayerNames(rendered.container)).toHaveLength(2);
  expect(window.location.hash).toBe("");
  expect(
    window.localStorage.getItem(LEGACY_ACTIVE_MOCK_DRAFT_STORAGE_KEY)
  ).toBeNull();
  const draftedRow = rendered.container.querySelector<HTMLTableRowElement>(
    'tbody tr[data-drafted="true"]'
  );
  expect(draftedRow).not.toBeNull();
  const draftedCells = draftedRow!.querySelectorAll("td");
  expect(getComputedStyle(draftedCells[0]).opacity).toBe("0.5");
  expect(getComputedStyle(draftedCells[1]).opacity).toBe("1");
  expect(getComputedStyle(draftedCells[1]).backgroundColor).toBe(
    "rgb(33, 21, 14)"
  );
  expect(getComputedStyle(draftedCells[2]).opacity).toBe("0.5");
  rendered.unmount();
});

test("positions the newest round and best untaken row at every user turn", () => {
  const originalScrollIntoView = HTMLElement.prototype.scrollIntoView;
  const originalOffsetTop = Object.getOwnPropertyDescriptor(
    HTMLElement.prototype,
    "offsetTop"
  );
  const scrollIntoView = vi.fn();
  HTMLElement.prototype.scrollIntoView = scrollIntoView;
  Object.defineProperty(HTMLElement.prototype, "offsetTop", {
    configurable: true,
    get() {
      return this.getAttribute("data-mock-available") === "true" ? 123 : 0;
    },
  });
  window.history.replaceState(null, "", "/draft");
  const rendered = render(<Draft />);
  startDraft({
    seed: "scrolling",
    roster: {
      QB: 2,
      RB: 0,
      WR: 0,
      TE: 0,
      FLEX: 0,
      SUPERFLEX: 0,
      DST: 0,
      BENCH: 0,
    },
  });
  const playerScroller = screen.getByTestId("mock-draft-player-scroller");
  expect(scrollIntoView).toHaveBeenCalledWith({ block: "start" });
  expect(playerScroller.scrollTop).toBe(123);
  expect(screen.getByLabelText("draft position")).toBeEnabled();
  expect(screen.getByLabelText("seed")).not.toHaveAttribute("readonly");

  scrollIntoView.mockClear();
  playerScroller.scrollTop = 0;
  fireEvent.click(rendered.container.querySelector("tbody tr")!);

  expect(scrollIntoView).toHaveBeenCalledWith({ block: "start" });
  expect(playerScroller.scrollTop).toBe(123);

  rendered.unmount();
  if (originalScrollIntoView) {
    HTMLElement.prototype.scrollIntoView = originalScrollIntoView;
  } else {
    delete (HTMLElement.prototype as Partial<HTMLElement>).scrollIntoView;
  }
  if (originalOffsetTop) {
    Object.defineProperty(
      HTMLElement.prototype,
      "offsetTop",
      originalOffsetTop
    );
  }
});
