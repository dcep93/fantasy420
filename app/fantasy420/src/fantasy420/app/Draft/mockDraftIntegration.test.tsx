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

