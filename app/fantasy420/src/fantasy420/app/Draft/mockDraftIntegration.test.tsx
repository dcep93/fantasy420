import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";

import Draft from ".";
import { DEFAULT_MOCK_DRAFT_SETTINGS } from "./mockDraft";
import { decodeMockDraftHash, encodeMockDraftHash } from "./mockDraftHash";
import {
  getPersonalScoresStorageKey,
  readPersonalScores,
} from "./personalScores";

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

test("restores hash state without connecting to the Chrome extension", () => {
  const sendMessage = vi.fn();
  window.chrome = { runtime: { sendMessage, lastError: null } };
  window.history.replaceState(
    null,
    "",
    `/draft${encodeMockDraftHash({
      settings: {
        ...DEFAULT_MOCK_DRAFT_SETTINGS,
        teamCount: 2,
        draftPosition: 1,
        seed: "restored",
      },
      picks: [],
    })}`
  );

  const rendered = render(<Draft />);

  expect(screen.getByTestId("mock-draft-panel")).toBeInTheDocument();
  const workspace = screen.getByTestId("draft-rankings-workspace");
  const roster = screen.getByTestId("mock-draft-my-players");
  const scroller = screen.getByTestId("mock-draft-player-scroller");
  expect(workspace.nextElementSibling).toHaveClass("draft-rankings-controls");
  expect(workspace.children[0]).toBe(roster);
  expect(workspace.children[1]).toBe(scroller);
  expect(sendMessage).not.toHaveBeenCalled();
  rendered.unmount();
});

test("clicking a user rank rewinds the draft and saved hash for rechoice", () => {
  window.history.replaceState(
    null,
    "",
    `/draft${encodeMockDraftHash({
      settings: {
        ...DEFAULT_MOCK_DRAFT_SETTINGS,
        teamCount: 2,
        draftPosition: 1,
        seed: "rank-rechoose",
      },
      picks: ["4429795"],
    })}`
  );

  render(<Draft />);
  fireEvent.click(screen.getAllByLabelText("rechoose pick 1.01")[0]);

  expect(decodeMockDraftHash(window.location.hash)?.picks).toEqual([]);
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
  ).map((element) => Number(element.textContent?.replace("composite #", "")));
  expect(compositeRanks).toEqual([4, 5, 2, 1, 7, 3, 6]);

  fireEvent.click(
    rendered.container.querySelector('tbody tr[data-mock-available="true"]')!
  );
  const afterUserPick = decodeMockDraftHash(window.location.hash)!;
  expect(afterUserPick.picks).toHaveLength(12);
  expect(afterUserPick.picks).not.toContain("4360310");
  rendered.unmount();
});

test("keeps opponent picks on the raw composite when My score changes", () => {
  function startDraft(): string[] {
    fireEvent.change(screen.getByLabelText("draft position"), {
      target: { value: "2" },
    });
    fireEvent.change(screen.getByLabelText("number of teams"), {
      target: { value: "2" },
    });
    fireEvent.change(screen.getByLabelText("craziness"), {
      target: { value: "0.000001" },
    });
    fireEvent.change(screen.getByLabelText("seed"), {
      target: { value: "raw-composite-opponents" },
    });
    fireEvent.click(screen.getByRole("button", { name: "mock draft" }));
    return decodeMockDraftHash(window.location.hash)!.picks;
  }

  window.history.replaceState(null, "", "/draft");
  const baseline = render(<Draft />);
  const baselinePicks = startDraft();
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

  expect(startDraft()).toEqual(baselinePicks);
  adjusted.unmount();
});

test("rejects restored mock drafts containing kicker picks", async () => {
  window.history.replaceState(
    null,
    "",
    `/draft${encodeMockDraftHash({
      settings: {
        ...DEFAULT_MOCK_DRAFT_SETTINGS,
        teamCount: 2,
        draftPosition: 1,
        seed: "restored-kicker",
      },
      picks: ["10621"],
    })}`
  );

  render(<Draft />);

  expect(
    await screen.findByText("Mock draft URL contains an ineligible kicker")
  ).toBeInTheDocument();
  expect(screen.queryByTestId("mock-draft-panel")).not.toBeInTheDocument();
});

test("hides kickers only while mock-draft mode is active", () => {
  window.history.replaceState(
    null,
    "",
    `/draft${encodeMockDraftHash({
      settings: {
        ...DEFAULT_MOCK_DRAFT_SETTINGS,
        teamCount: 2,
        draftPosition: 1,
        seed: "hide-kickers",
      },
      picks: [],
    })}`
  );

  const active = render(<Draft />);
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

test("keeps pending setting edits out of the active draft and hash until restart", () => {
  const initial = {
    ...DEFAULT_MOCK_DRAFT_SETTINGS,
    teamCount: 2,
    draftPosition: 1,
    seed: "active-seed",
  };
  window.history.replaceState(
    null,
    "",
    `/draft${encodeMockDraftHash({ settings: initial, picks: [] })}`
  );
  const rendered = render(<Draft />);
  const activeHash = window.location.hash;

  fireEvent.change(screen.getByLabelText("craziness"), {
    target: { value: "7" },
  });
  fireEvent.change(screen.getByLabelText("seed"), {
    target: { value: "replacement-seed" },
  });

  expect(window.location.hash).toBe(activeHash);
  expect(decodeMockDraftHash(window.location.hash)?.settings).toEqual(initial);

  fireEvent.click(rendered.container.querySelector("tbody tr")!);
  const progressed = decodeMockDraftHash(window.location.hash)!;
  expect(progressed.settings).toEqual(initial);
  expect(progressed.picks).toHaveLength(3);
  expect(screen.getByLabelText("craziness")).toHaveValue(7);
  expect(screen.getByLabelText("seed")).toHaveValue("replacement-seed");

  fireEvent.click(screen.getByRole("button", { name: "mock draft" }));
  const restarted = decodeMockDraftHash(window.location.hash)!;
  expect(restarted.settings).toMatchObject({
    craziness: 7,
    seed: "replacement-seed",
  });
  expect(restarted.picks).toHaveLength(0);
  rendered.unmount();
});

test("drafts an existing table row and synchronizes ordered ids to the hash", () => {
  window.history.replaceState(
    null,
    "",
    `/draft${encodeMockDraftHash({
      settings: {
        ...DEFAULT_MOCK_DRAFT_SETTINGS,
        teamCount: 2,
        draftPosition: 1,
        seed: "row-click",
        roster: {
          QB: 1,
          RB: 0,
          WR: 0,
          TE: 0,
          FLEX: 0,
          SUPERFLEX: 0,
          DST: 0,
          K: 0,
          BENCH: 0,
        },
      },
      picks: [],
    })}`
  );

  const rendered = render(<Draft />);
  const firstRow = rendered.container.querySelector("tbody tr");
  expect(firstRow).not.toBeNull();
  fireEvent.click(firstRow!);

  const saved = decodeMockDraftHash(window.location.hash)!;
  expect(saved.picks).toHaveLength(2);
  expect(saved.picks.every((id) => /^-?\d+$/.test(id))).toBe(true);
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
  window.history.replaceState(
    null,
    "",
    `/draft${encodeMockDraftHash({
      settings: {
        ...DEFAULT_MOCK_DRAFT_SETTINGS,
        teamCount: 2,
        draftPosition: 1,
        seed: "scrolling",
        roster: {
          QB: 2,
          RB: 0,
          WR: 0,
          TE: 0,
          FLEX: 0,
          SUPERFLEX: 0,
          DST: 0,
          K: 0,
          BENCH: 0,
        },
      },
      picks: [],
    })}`
  );

  const rendered = render(<Draft />);
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
