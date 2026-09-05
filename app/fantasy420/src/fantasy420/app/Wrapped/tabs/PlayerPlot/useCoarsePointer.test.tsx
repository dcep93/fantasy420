import { act, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";

import { COARSE_POINTER_QUERY, useCoarsePointer } from "./useCoarsePointer";

type MediaListener = (event: MediaQueryListEvent) => void;

function installMatchMedia(initialMatches: boolean, legacy = false) {
  let matches = initialMatches;
  const listeners = new Set<MediaListener>();
  const addListener = vi.fn((listener: MediaListener) => listeners.add(listener));
  const removeListener = vi.fn((listener: MediaListener) =>
    listeners.delete(listener)
  );
  const addEventListener = vi.fn(
    (_type: string, listener: MediaListener) => listeners.add(listener)
  );
  const removeEventListener = vi.fn(
    (_type: string, listener: MediaListener) => listeners.delete(listener)
  );
  const mediaQueryList = {
    get matches() {
      return matches;
    },
    media: COARSE_POINTER_QUERY,
    onchange: null,
    addEventListener: legacy ? undefined : addEventListener,
    removeEventListener: legacy ? undefined : removeEventListener,
    addListener,
    removeListener,
    dispatchEvent: () => true,
  } as unknown as MediaQueryList;

  vi.stubGlobal("matchMedia", vi.fn(() => mediaQueryList));

  return {
    addEventListener,
    addListener,
    removeEventListener,
    removeListener,
    setMatches(nextMatches: boolean) {
      matches = nextMatches;
      const event = { matches, media: COARSE_POINTER_QUERY } as MediaQueryListEvent;
      listeners.forEach((listener) => listener(event));
    },
  };
}

function PointerState() {
  const isCoarsePointer = useCoarsePointer();
  return <output>{isCoarsePointer ? "coarse" : "fine"}</output>;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

test("tracks pointer capability changes with modern media-query listeners", () => {
  const media = installMatchMedia(false);
  const rendered = render(<PointerState />);

  expect(screen.getByText("fine")).toBeVisible();
  expect(matchMedia).toHaveBeenCalledWith(COARSE_POINTER_QUERY);
  expect(media.addEventListener).toHaveBeenCalledWith(
    "change",
    expect.any(Function)
  );

  act(() => media.setMatches(true));
  expect(screen.getByText("coarse")).toBeVisible();

  rendered.unmount();
  expect(media.removeEventListener).toHaveBeenCalledWith(
    "change",
    expect.any(Function)
  );
});

test("supports legacy media-query listeners", () => {
  const media = installMatchMedia(true, true);
  const rendered = render(<PointerState />);

  expect(screen.getByText("coarse")).toBeVisible();
  expect(media.addListener).toHaveBeenCalledWith(expect.any(Function));

  rendered.unmount();
  expect(media.removeListener).toHaveBeenCalledWith(expect.any(Function));
});
