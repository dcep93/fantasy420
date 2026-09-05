import { render } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

const { scatterSpy, tooltipSpy } = vi.hoisted(() => ({
  scatterSpy: vi.fn(),
  tooltipSpy: vi.fn(),
}));

vi.mock("recharts", () => ({
  CartesianGrid: () => null,
  Scatter: (props: unknown) => {
    scatterSpy(props);
    return null;
  },
  ScatterChart: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  Tooltip: (props: unknown) => {
    tooltipSpy(props);
    return null;
  },
  XAxis: () => null,
  YAxis: () => null,
}));

import Chart from "./Chart";

function setCoarsePointer(matches: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() =>
      ({
        matches,
        media: "(hover: none), (pointer: coarse)",
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      } as unknown as MediaQueryList)
    )
  );
}

beforeEach(() => {
  scatterSpy.mockClear();
  tooltipSpy.mockClear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

test("uses exact dot hover targeting for a fine pointer", () => {
  setCoarsePointer(false);

  render(<Chart data={[{ x: 1, y: 2, label: "Player" }]} />);

  expect(tooltipSpy).toHaveBeenCalledWith(
    expect.objectContaining({ trigger: "hover" })
  );
  expect(scatterSpy).toHaveBeenCalledWith(
    expect.objectContaining({
      shape: expect.objectContaining({
        props: expect.objectContaining({ expandedHitTarget: false }),
      }),
    })
  );
});

test("uses an expanded tap target and click tooltip for a coarse pointer", () => {
  setCoarsePointer(true);

  render(<Chart data={[{ x: 1, y: 2, label: "Player" }]} />);

  expect(tooltipSpy).toHaveBeenCalledWith(
    expect.objectContaining({ trigger: "click" })
  );
  expect(scatterSpy).toHaveBeenCalledWith(
    expect.objectContaining({
      shape: expect.objectContaining({
        props: expect.objectContaining({ expandedHitTarget: true }),
      }),
    })
  );
});
