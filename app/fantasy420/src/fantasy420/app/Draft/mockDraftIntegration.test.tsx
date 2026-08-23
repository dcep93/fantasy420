import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";

import Draft from ".";
import { DEFAULT_MOCK_DRAFT_SETTINGS } from "./mockDraft";
import { decodeMockDraftHash, encodeMockDraftHash } from "./mockDraftHash";

afterEach(() => {
  window.history.replaceState(null, "", "/");
  window.chrome = undefined;
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
  expect(workspace.previousElementSibling).toHaveClass("draft-rankings-controls");
  expect(workspace.children[0]).toBe(roster);
  expect(workspace.children[1]).toBe(scroller);
  expect(sendMessage).not.toHaveBeenCalled();
  rendered.unmount();
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
  expect(getComputedStyle(draftedCells[0]).opacity).toBe("1");
  expect(getComputedStyle(draftedCells[0]).backgroundColor).toBe(
    "rgb(33, 21, 14)"
  );
  expect(getComputedStyle(draftedCells[1]).opacity).toBe("0.8");
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
