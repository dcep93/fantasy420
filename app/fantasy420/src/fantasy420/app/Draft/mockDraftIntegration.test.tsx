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
  expect(sendMessage).not.toHaveBeenCalled();
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
  expect(screen.getByLabelText("draft position")).toBeDisabled();
  expect(screen.getByLabelText("seed")).toHaveAttribute("readonly");

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
